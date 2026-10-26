import { randomUUID } from "node:crypto";
import { sql, type Kysely } from "kysely";
import pg from "pg";
import { MAXIMO_POR_LOTE, problemaDelEvento, type EventoDeAuditoria, type EventoMandado } from "./contrato.js";

// La bandeja de auditoría de un servicio (specs/027, decisión 167). El servicio anota cada evento
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

/** El POST /v1/eventos del contrato: 200 entregado, 400 o 413 rechazado; lo demás (o sin
 * respuesta en 10 s), falló y se reintenta. */
export function entregaPorHttp(url: string, token: string, esperaMs = 10_000) {
  return async (eventos: EventoMandado[]): Promise<ResultadoDeEntrega> => {
    try {
      const r = await fetch(`${url}/v1/eventos`, { method: "POST", headers: { "Content-Type": "application/json", "X-Token-Servicio": token }, body: JSON.stringify({ eventos }), signal: AbortSignal.timeout(esperaMs) });
      return r.ok ? "entregado" : r.status === 400 || r.status === 413 ? "rechazado" : "fallo";
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
  let reintento = false;
  const esperaInicial = Math.min(ESPERA_INICIAL_MS, esperaMaxima);
  let espera = esperaInicial;
  // Lo que queda programado (un reintento, volver a escuchar). Parado, no se programa nada más.
  const esperas = new Set<ReturnType<typeof setTimeout>>();
  const despues = (ms: number, hacer: () => Promise<void>) => {
    if (parada) return;
    const t = setTimeout(() => { esperas.delete(t); void hacer(); }, ms);
    esperas.add(t);
  };

  /** Anota el evento en la transacción de la acción. Apagado, no hace nada. Un evento que no
   * cumple el contrato no deshace la acción: queda en la bandeja, aparte, con el motivo. */
  async function anotar(e: Kysely<any>, evento: EventoDeAuditoria): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!encendida) return;
    const completo = { ...evento, id: randomUUID(), servicio: o.servicio };
    // La fecha la pone la base al guardar; acá se valida con una cualquiera.
    const problema = problemaDelEvento({ ...completo, fecha: new Date().toISOString() });
    if (problema) console.error(`auditoría: el evento ${evento.tipo} de ${o.servicio} no cumple el contrato (${problema}); queda en su bandeja con el motivo`);
    await sql`INSERT INTO auditoria_bandeja (id, evento, rechazo) VALUES (${completo.id}, ${JSON.stringify(completo)}, ${problema && `No cumple el contrato: ${problema}`})`.execute(e);
    if (!problema) await sql`SELECT pg_notify(${CANAL}, '')`.execute(e);
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
    const marcar = async (ids: string[], r: ResultadoDeEntrega) => {
      if (r === "entregado") await sql`UPDATE auditoria_bandeja SET entregado_en = now() WHERE id = ANY(${ids}::uuid[])`.execute(trx);
      // Auditoría dijo que no cumple el contrato: se aparta con el motivo y no traba a los demás.
      else {
        await sql`UPDATE auditoria_bandeja SET rechazo = 'Auditoría lo rechazó: no cumple el contrato' WHERE id = ANY(${ids}::uuid[])`.execute(trx);
        console.error(`auditoría: rechazó el evento ${ids[0]} de ${o.servicio}; queda en su bandeja con el motivo`);
      }
    };
    if (resultado === "entregado" || rows.length === 1) await marcar(rows.map((r) => r.id), resultado);
    // Un lote rechazado entero puede tener uno solo malo: se manda de a uno, para apartar solo ese.
    else for (const r of rows) {
      const uno = await entregar([{ ...r.evento, fecha: r.anotado_en.toISOString() }]);
      if (uno === "fallo") throw new Error("Auditoría no respondió");
      await marcar([r.id], uno);
    }
    return true;
  });

  /** Manda todo lo pendiente y borra lo entregado hace más de una semana. */
  async function mandar(): Promise<void> {
    // Con un reintento ya programado, un aviso nuevo no suma otro: lo manda ese reintento.
    if (reintento) return;
    if (ocupado) { otraVez = true; return; }
    ocupado = true;
    try {
      do { otraVez = false; while (await unLote()); } while (otraVez);
      espera = esperaInicial;
      await sql`DELETE FROM auditoria_bandeja WHERE entregado_en < now() - interval '7 days'`.execute(o.base);
    } catch {
      reintento = true;
      despues(espera, () => { reintento = false; return mandar(); });
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
