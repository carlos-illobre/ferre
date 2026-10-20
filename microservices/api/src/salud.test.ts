import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa } from "./pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("./pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("./db.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("./app.js");

// La salud del servidor (specs/018, RF-125): el compose la pregunta cada 10 segundos.
describe("GET /health", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("018-E20 018-E21: dice que anda y su versión sin consultar la base", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await app.request("/health");
      expect(r.status).toBe(200);
      expect(await r.json()).toMatchObject({ ok: true, version: expect.any(String), calculoDePrecios: expect.any(String) });
    }
    expect(base.actual.consultas).toHaveLength(0);
  });

  it("018-E22: con la base caída sigue diciendo que el proceso anda", async () => {
    base.actual.pool.query = vi.fn(async () => { throw new Error("la base no responde"); }) as never;
    expect((await app.request("/health")).status).toBe(200);
  });
});
