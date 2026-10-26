import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa } from "./pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("./pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("./persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("./app.js");

// La salud del servidor (022-E05): el compose la pregunta cada 10 segundos.
describe("GET /health", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("022-E05: dice que anda, que la base responde y su versión", async () => {
    const r = await app.request("/health");
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, db: "ok", version: expect.any(String) });
    expect(base.actual.sqlDe(/SELECT 1/)).toHaveLength(1);
  });

  it("022-E05: con la base caída dice que la base no responde, y el servidor no figura sano", async () => {
    base.actual.pool.connect = vi.fn(async () => { throw new Error("la base no responde"); }) as never;
    const r = await app.request("/health");
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ ok: false, db: "sin-respuesta" });
  });
});

// Cada respuesta lleva a cuestas la versión, y el navegador la deja leer (025-E09, decisión 157).
describe("lo que va a cuestas en cada respuesta", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  // Que el navegador la pueda leer (Access-Control-Expose-Headers) lo dice la puerta desde 026:
  // lo comprueba tests/integration/puerta.sh.
  it("025-E09: cualquier respuesta, también un error, lleva X-Avisos con la versión", async () => {
    const { config } = await import("./config.js");
    for (const ruta of ["/health", "/no-existe", "/sesiones/actual"]) {
      const r = await app.request(ruta, { headers: { "X-Token-Servicio": config.tokenServicio } });
      expect(JSON.parse(r.headers.get("X-Avisos")!)).toEqual({ version: config.version });
    }
  });
});

// Solo la puerta llega a Comercial (026, ADR-031).
describe("el token entre servicios", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("026-E07: sin el token entre servicios, rechaza el pedido; la salud, que usa el control del contenedor, no lo pide", async () => {
    const sin = await app.request("/sesiones/actual", { headers: { Authorization: "Bearer token-dueño" } });
    expect(sin.status).toBe(401);
    expect(await sin.json()).toEqual({ error: "Este servicio solo atiende pedidos que pasan por la puerta" });
    expect((await app.request("/sesiones/actual", { headers: { Authorization: "Bearer token-dueño", "X-Token-Servicio": "otro" } })).status).toBe(401);
    expect((await app.request("/sesiones/actual", { headers: { Authorization: "Bearer token-dueño", "X-Token-Servicio": "ñ".repeat(process.env.TOKEN_SERVICIO!.length) } })).status).toBe(401);
    expect((await app.request("/health")).status).toBe(200);
  });
});
