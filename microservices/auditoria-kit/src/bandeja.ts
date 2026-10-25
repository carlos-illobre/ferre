import { randomUUID } from "node:crypto";
import { sql, type Kysely } from "kysely";
import pg from "pg";
import { MAXIMO_POR_LOTE, problemaDelEvento, type EventoDeAuditoria, type EventoMandado } from "./contrato.js";

// La bandeja de auditoría de un servicio (specs/027, decisión 166). El servicio anota cada evento
// en su propia base, en la transacción de la acción: si la acción se deshace, el evento no queda.
// Un mandador los entrega a Auditoría después, sin perder ninguno: si Auditoría no responde,
// esperan y se reintentan. Sin la dirección de Auditoría, el kit está apagado: no anota ni manda.

export type ResultadoDeEntrega = "entregado" | "rechazado" | "fallo";

export type Opciones = {
  /** La base del servicio, donde vive su bandeja. */
  base: Kysely<any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- cualquier servicio
  /** Su cadena de conexión, para escuchar el aviso de que hay algo por mandar. */
  conexion: string;
  /** Quién manda: va en cada evento. */
  servicio: string;
  /** La dirección de Auditoría (AUDITORIA_URL). Vacía o sin definir: apagado. */
  auditoria: string | undefined;
  /** El token entre servicios. */
  token: string;
  /** Cómo se entrega un lote; por omisión, el POST /v1/eventos del contrato. */
  entregar?: (eventos: EventoMandado[]) => Promise<ResultadoDeEntrega>;
  /** La espera más larga entre reintentos. */
  esperaMaximaMs?: number;
};

const CANAL = "auditoria_bandeja";
const ESPERA_INICIAL_MS = 1000;

/** El POST /v1/eventos del contrato: 200 entregado, 400 rechazado; lo demás, falló y se reintenta. */
export function entregaPorHttp(url: string, token: string) {
  return async (eventos: EventoMandado[]): Promise<ResultadoDeEntrega> => {
    try {
      const r = await fetch(`${url}/v1/eventos`, { method: "POST", headers: { "Content-Type": "application/json", "X-Token-Servicio": token }, body: JSON.stringify({ eventos }) });
      return r.ok ? "entregado" : r.status === 400 ? "rechazado" : "fallo";
    } catch {
      return "fallo";
    }
  };
}

export function bandejaDeAuditoria(o: Opciones) {
  const encendida = Boolean(o.auditoria);
  // Apagada no entrega nada: la dirección solo se usa encendida.
  const entregar = o.entregar ?? entregaPorHttp(`${o.auditoria}`, o.token);
  const esperaMaxima = o.esperaMaximaMs ?? 60_000;
  let oyente: pg.Client | null = null;
  let parada = false;
  let ocupado = false;
  let otraVez = false;
  const esperaInicial = Math.min(ESPERA_INICIAL_MS, esperaMaxima);
  let espera = esperaInicial;
  // Lo que queda programado (un reintento, volver a escuchar). Parado, no se programa nada más.
  const esperas = new Set<ReturnType<typeof setTimeout>>();
  const despues = (ms: number, hacer: () => Promise<void>) => {
    if (parada) return;
    const t = setTimeout(() => { esperas.delete(t); void hacer(); }, ms);
    esperas.add(t);
  };

  /** Anota el evento en la transacción de la acción. Apagado, no hace nada. */
  async function anotar(e: Kysely<any>, evento: EventoDeAuditoria): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!encendida) return;
    const completo = { ...evento, id: randomUUID(), servicio: o.servicio };
    // La fecha la pone la base al guardar; acá se valida con una cualquiera.
    const problema = problemaDelEvento({ ...completo, fecha: new Date().toISOString() });
    if (problema) throw new Error(`Evento de auditoría ${evento.tipo}: ${problema}`);
    await sql`INSERT INTO auditoria_bandeja (id, evento) VALUES (${completo.id}, ${JSON.stringify(completo)})`.execute(e);
    await sql`SELECT pg_notify(${CANAL}, '')`.execute(e);
  }

  // Un lote: lo bloquea (otra copia del servicio saltea lo que este manda), lo entrega y lo marca.
  // Devuelve si había algo; si la entrega falló, deshace y lanza para reintentar más tarde.
  const unLote = () => o.base.transaction().execute(async (trx) => {
    const { rows } = await sql<{ id: string; evento: EventoMandado; anotado_en: Date }>`
      SELECT id, evento, anotado_en FROM auditoria_bandeja WHERE entregado_en IS NULL AND rechazo IS NULL
       ORDER BY anotado_en, id LIMIT ${MAXIMO_POR_LOTE} FOR UPDATE SKIP LOCKED`.execute(trx);
    if (rows.length === 0) return false;
    const resultado = await entregar(rows.map((r) => ({ ...r.evento, fecha: r.anotado_en.toISOString() })));
    if (resultado === "fallo") throw new Error("Auditoría no respondió");
    const ids = rows.map((r) => r.id);
    if (resultado === "entregado") await sql`UPDATE auditoria_bandeja SET entregado_en = now() WHERE id = ANY(${ids}::uuid[])`.execute(trx);
    // Auditoría dijo que no cumplen el contrato: se apartan con el motivo y no traban a los demás.
    else {
      await sql`UPDATE auditoria_bandeja SET rechazo = 'Auditoría los rechazó: no cumplen el contrato' WHERE id = ANY(${ids}::uuid[])`.execute(trx);
      console.error(`auditoría: rechazó ${ids.length} evento(s) de ${o.servicio}; quedan en su bandeja con el motivo`);
    }
    return true;
  });

  /** Manda todo lo pendiente y borra lo entregado hace más de una semana. */
  async function mandar(): Promise<void> {
    if (ocupado) { otraVez = true; return; }
    ocupado = true;
    try {
      do { otraVez = false; while (await unLote()); } while (otraVez);
      espera = esperaInicial;
      await sql`DELETE FROM auditoria_bandeja WHERE entregado_en < now() - interval '7 days'`.execute(o.base);
    } catch {
      despues(espera, mandar);
      espera = Math.min(espera * 2, esperaMaxima);
    } finally {
      ocupado = false;
    }
  }

  // Escucha el aviso de la base; si se corta la conexión, vuelve a escuchar y manda lo pendiente.
  async function escuchar(): Promise<void> {
    const cliente = new pg.Client({ connectionString: o.conexion });
    cliente.on("error", () => undefined); // lo que importa es que se cortó: lo atiende "end"
    cliente.on("notification", () => void mandar());
    cliente.on("end", () => despues(ESPERA_INICIAL_MS, escucharYMandar));
    await cliente.connect();
    await cliente.query(`LISTEN ${CANAL}`);
    oyente = cliente;
  }
  const escucharYMandar = (): Promise<void> => escuchar().then(mandar, () => despues(ESPERA_INICIAL_MS, escucharYMandar));

  return {
    encendida,
    anotar,
    /** Crea la bandeja si hace falta, escucha y manda lo que quedó pendiente. Apagado, nada. */
    async iniciar(): Promise<void> {
      if (!encendida) return;
      await sql`CREATE TABLE IF NOT EXISTS auditoria_bandeja (
        id uuid PRIMARY KEY, evento jsonb NOT NULL, anotado_en timestamptz NOT NULL DEFAULT now(),
        entregado_en timestamptz, rechazo text)`.execute(o.base);
      await sql`CREATE INDEX IF NOT EXISTS auditoria_bandeja_pendiente ON auditoria_bandeja (anotado_en) WHERE entregado_en IS NULL AND rechazo IS NULL`.execute(o.base);
      await escucharYMandar();
    },
    mandar,
    async parar(): Promise<void> {
      parada = true;
      for (const t of esperas) clearTimeout(t);
      esperas.clear();
      await oyente?.end();
    },
  };
}

export type BandejaDeAuditoria = ReturnType<typeof bandejaDeAuditoria>;
