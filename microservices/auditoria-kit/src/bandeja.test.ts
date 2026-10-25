import { createServer } from "node:http";
import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import { afterAll, afterEach, beforeEach, describe, expect, inject, it, vi } from "vitest";
import { bandejaDeAuditoria, entregaPorHttp, type BandejaDeAuditoria, type Opciones, type ResultadoDeEntrega } from "./index.js";
import type { EventoDeAuditoria, EventoMandado } from "./index.js";

// La bandeja contra un PostgreSQL de verdad (specs/027): anotar en la transacción de la acción,
// entregar sin perder ni duplicar, y apagada sin hacer nada.
const conexion = inject("conexion");
const base = new Kysely<any>({ dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: conexion }) }) }); // eslint-disable-line @typescript-eslint/no-explicit-any
afterAll(() => base.destroy());

const evento = (detalle = "$12.000"): EventoDeAuditoria => ({ tipo: "venta.registrada", titulo: "Venta cobrada", grupo: "Ventas", importancia: "normal", quien: { id: "u1", nombre: "Ana" }, detalle });

// Una Auditoría de mentira: guarda lo que le llega y responde lo que se le pida.
function auditoriaDeMentira() {
  const recibidos: EventoMandado[] = [];
  let respuesta: ResultadoDeEntrega = "entregado";
  return {
    recibidos,
    responder: (r: ResultadoDeEntrega) => { respuesta = r; },
    entregar: vi.fn(async (eventos: EventoMandado[]) => { if (respuesta !== "rechazado") recibidos.push(...eventos); return respuesta; }),
  };
}

const abiertas: BandejaDeAuditoria[] = [];
function nueva(entregar: Opciones["entregar"], extra: Partial<Opciones> = {}) {
  const b = bandejaDeAuditoria({ base, conexion, servicio: "comercial", auditoria: "http://auditoria", token: "t", entregar, esperaMaximaMs: 40, ...extra });
  abiertas.push(b);
  return b;
}
const filas = () => sql<{ id: string; entregado_en: Date | null; rechazo: string | null }>`SELECT id, entregado_en, rechazo FROM auditoria_bandeja ORDER BY anotado_en, id`.execute(base).then((r) => r.rows);

beforeEach(() => sql`DROP TABLE IF EXISTS auditoria_bandeja`.execute(base));
afterEach(async () => { for (const b of abiertas.splice(0)) await b.parar(); vi.restoreAllMocks(); });

describe("la bandeja de auditoría", () => {
  it("027-E09: sin la dirección de Auditoría está apagada: no crea la bandeja, no anota ni manda", async () => {
    const aud = auditoriaDeMentira();
    for (const auditoria of [undefined, ""]) {
      const b = nueva(aud.entregar, { auditoria });
      expect(b.encendida).toBe(false);
      await b.iniciar();
      await b.anotar(base, evento());
    }
    expect((await sql<{ hay: string | null }>`SELECT to_regclass('auditoria_bandeja') AS hay`.execute(base)).rows[0]!.hay).toBeNull();
    expect(aud.entregar).not.toHaveBeenCalled();
  });

  it("027-E05: el evento queda con la transacción de la acción, y se entrega al confirmarse, con su id, su servicio y su fecha", async () => {
    const aud = auditoriaDeMentira();
    const b = nueva(aud.entregar);
    await b.iniciar();
    await base.transaction().execute(async (trx) => { await b.anotar(trx, evento("$1")); }).catch(() => undefined);
    await base.transaction().execute(async (trx) => { await b.anotar(trx, evento("$2")); throw new Error("la venta falló"); }).catch(() => undefined);
    await vi.waitFor(() => expect(aud.recibidos).toHaveLength(1));
    const [mandado] = aud.recibidos;
    expect(mandado).toMatchObject({ ...evento("$1"), servicio: "comercial", id: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(Date.parse(mandado!.fecha)).toBeGreaterThan(Date.now() - 60_000);
    await vi.waitFor(async () => expect((await filas())[0]!.entregado_en).not.toBeNull());
  });

  it("un evento que no cumple el contrato no se anota: es un error del servicio", async () => {
    const b = nueva(auditoriaDeMentira().entregar);
    await b.iniciar();
    await expect(b.anotar(base, { ...evento(), titulo: "" })).rejects.toThrow("Evento de auditoría venta.registrada: el campo «titulo» no cumple el contrato");
    expect(await filas()).toEqual([]);
  });

  it("027-E06 027-E07: si Auditoría no responde, el evento espera y se reintenta con el mismo id hasta que llega", async () => {
    const aud = auditoriaDeMentira();
    aud.responder("fallo");
    const b = nueva(aud.entregar);
    await b.iniciar();
    await b.anotar(base, evento());
    await vi.waitFor(() => expect(aud.entregar.mock.calls.length).toBeGreaterThanOrEqual(3));
    expect((await filas())[0]!.entregado_en).toBeNull();
    aud.responder("entregado");
    await vi.waitFor(async () => expect((await filas())[0]!.entregado_en).not.toBeNull());
    expect(new Set(aud.recibidos.map((e) => e.id)).size).toBe(1);
  });

  it("027-E08: al arrancar, entrega lo que quedó pendiente", async () => {
    const aud = auditoriaDeMentira();
    const antes = nueva(aud.entregar);
    await antes.iniciar();
    await antes.parar();
    await antes.anotar(base, evento("$1"));
    await antes.anotar(base, evento("$2"));
    expect(aud.recibidos).toEqual([]);
    await nueva(aud.entregar).iniciar();
    await vi.waitFor(() => expect(aud.recibidos.map((e) => e.detalle)).toEqual(["$1", "$2"]));
  });

  it("027-E10 027-E11: lo entregado hace más de una semana se borra; lo de menos, queda", async () => {
    const aud = auditoriaDeMentira();
    const b = nueva(aud.entregar);
    await b.iniciar();
    await sql`INSERT INTO auditoria_bandeja (id, evento, entregado_en) VALUES
      (gen_random_uuid(), '{}', now() - interval '8 days'), (gen_random_uuid(), '{}', now() - interval '6 days')`.execute(base);
    await b.mandar();
    const quedan = await filas();
    expect(quedan).toHaveLength(1);
    expect(Date.now() - quedan[0]!.entregado_en!.getTime()).toBeLessThan(7 * 86_400_000);
  });

  it("lo que Auditoría rechaza queda aparte con el motivo y no traba lo que sigue", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const aud = auditoriaDeMentira();
    aud.responder("rechazado");
    const b = nueva(aud.entregar);
    await b.iniciar();
    await b.anotar(base, evento("$1"));
    await vi.waitFor(async () => expect((await filas())[0]!.rechazo).toBe("Auditoría los rechazó: no cumplen el contrato"));
    expect(error).toHaveBeenCalledWith("auditoría: rechazó 1 evento(s) de comercial; quedan en su bandeja con el motivo");
    aud.responder("entregado");
    await b.anotar(base, evento("$2"));
    await vi.waitFor(() => expect(aud.recibidos.map((e) => e.detalle)).toEqual(["$2"]));
  });

  it("de a lotes de 100, y dos copias del servicio a la vez no mandan el mismo evento", async () => {
    const aud = auditoriaDeMentira();
    const una = nueva(aud.entregar);
    const otra = nueva(aud.entregar);
    await una.iniciar();
    await una.parar();
    for (let i = 0; i < 150; i++) await una.anotar(base, evento(`$${i}`));
    await Promise.all([otra.mandar(), nueva(aud.entregar).mandar(), otra.mandar()]);
    expect(aud.recibidos).toHaveLength(150);
    expect(new Set(aud.recibidos.map((e) => e.id)).size).toBe(150);
    expect(Math.max(...aud.entregar.mock.calls.map(([lote]) => lote.length))).toBe(100);
  });

  it("si se corta la conexión que escucha, vuelve a escuchar", async () => {
    const aud = auditoriaDeMentira();
    const b = nueva(aud.entregar);
    await b.iniciar();
    await sql`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query = 'LISTEN auditoria_bandeja'`.execute(base);
    await vi.waitFor(async () => expect((await sql<{ n: string }>`SELECT count(*) AS n FROM pg_stat_activity WHERE query = 'LISTEN auditoria_bandeja'`.execute(base)).rows[0]!.n).toBe("1"), { timeout: 5000 });
    await b.anotar(base, evento());
    await vi.waitFor(() => expect(aud.recibidos).toHaveLength(1));
  });

  it("si no puede escuchar, reintenta; parada, no programa nada más", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const intentos = vi.spyOn(pg.Client.prototype, "connect");
    try {
      const b = nueva(auditoriaDeMentira().entregar, { conexion: "postgres://nadie:nada@127.0.0.1:1/ninguna" });
      await b.iniciar();
      expect(intentos).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.waitFor(() => expect(intentos).toHaveBeenCalledTimes(2));
      await b.parar();
      await vi.advanceTimersByTimeAsync(5000);
      expect(intentos).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("si para mientras una entrega falla, no reintenta", async () => {
    let b: BandejaDeAuditoria;
    const entregar = vi.fn(async (): Promise<ResultadoDeEntrega> => { await b.parar(); return "fallo"; });
    b = nueva(entregar);
    await b.iniciar();
    await b.anotar(base, evento());
    await vi.waitFor(() => expect(entregar).toHaveBeenCalledTimes(1));
    await new Promise((listo) => setTimeout(listo, 100));
    expect(entregar).toHaveBeenCalledTimes(1);
  });
});

// La entrega por HTTP (contrato v1): 200 entregado, 400 rechazado, lo demás falló.
describe("la entrega por HTTP", () => {
  it("manda el lote con el token y traduce la respuesta", async () => {
    const pedidos: { token: string | undefined; cuerpo: unknown }[] = [];
    let estado = 200;
    const servidor = createServer((req, res) => {
      let cuerpo = "";
      req.on("data", (d) => { cuerpo += d; });
      req.on("end", () => { pedidos.push({ token: req.headers["x-token-servicio"] as string | undefined, cuerpo: JSON.parse(cuerpo) }); res.writeHead(estado).end("{}"); });
    });
    await new Promise<void>((listo) => servidor.listen(0, "127.0.0.1", listo));
    const { port } = servidor.address() as { port: number };
    const entregar = entregaPorHttp(`http://127.0.0.1:${port}`, "secreto");
    const lote = [{ ...evento(), id: "i", servicio: "s", fecha: "f" }];
    expect(await entregar(lote)).toBe("entregado");
    estado = 400;
    expect(await entregar(lote)).toBe("rechazado");
    estado = 503;
    expect(await entregar(lote)).toBe("fallo");
    expect(pedidos[0]).toEqual({ token: "secreto", cuerpo: { eventos: lote } });
    await new Promise((listo) => servidor.close(listo));
    expect(await entregar(lote)).toBe("fallo");
  });

  it("encendida, por omisión entrega por HTTP a la dirección de Auditoría", async () => {
    const llamado = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const b = bandejaDeAuditoria({ base, conexion, servicio: "comercial", auditoria: "http://auditoria:8095", token: "t" });
    abiertas.push(b);
    await b.iniciar();
    await b.anotar(base, evento());
    await vi.waitFor(() => expect(llamado).toHaveBeenCalledWith("http://auditoria:8095/v1/eventos", expect.objectContaining({ method: "POST" })));
  });
});
