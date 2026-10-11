import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

// Anomalías (RF-59): el registro de las diferencias entre el sistema y la realidad.
describe("GET /anomalias", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("sin sesión, 401", async () => {
    expect((await pedir(app, "GET", "/anomalias", { rol: null })).status).toBe(401);
  });

  it("las lista de la más nueva a la más vieja, con producto y usuario, de a 50, y dice si hay más", async () => {
    const filas = Array.from({ length: 51 }, (_, i) => ({ id: `a${i}`, tipo: "venta_sin_stock", cantidad: "1", detalle: "faltaba 1", creado_en: "2026-10-11T12:00:00Z", producto: "MECHA", usuario: "Marta" }));
    base.actual.programar(/FROM anomalia a JOIN producto p/, { rows: filas });
    const r = await pedir(app, "GET", "/anomalias?pagina=2", { rol: "mostrador" });
    const cuerpo = (await r.json()) as { pagina: number; hay_mas: boolean; anomalias: unknown[] };
    expect(cuerpo).toMatchObject({ pagina: 2, hay_mas: true });
    expect(cuerpo.anomalias).toHaveLength(50);
    const consulta = base.actual.sqlDe(/FROM anomalia a JOIN producto p/)[0]!;
    expect(consulta.sql).toMatch(/ORDER BY a\.creado_en DESC/);
    expect(consulta.params).toEqual([51, 50]);
  });
});
