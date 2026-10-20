import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

const error = async (r: Response) => ((await r.json()) as { error: string }).error;

// Duplicados: lo que llega se valida antes de tocar la base.
describe("/equivalencias", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("unir a mano pide dos productos distintos", async () => {
    for (const cuerpo of [{}, { conservar_id: "p1" }, { conservar_id: "p1", absorber_id: "p1" }, { conservar_id: 1, absorber_id: 2 }]) {
      const r = await pedir(app, "POST", "/equivalencias/unir", { cuerpo });
      expect(r.status).toBe(400);
      expect(await error(r)).toBe("Elegí dos productos distintos");
    }
    expect(base.actual.consultas.filter((q) => /FROM producto WHERE id IN/.test(q.sql))).toHaveLength(0);
  });

  it("separar pide cuál, y al resolver una sugerencia se conserva el lado a o el b", async () => {
    const r = await pedir(app, "POST", "/equivalencias/separar", { cuerpo: {} });
    expect(r.status).toBe(400);
    expect(await error(r)).toBe("Falta absorbido_id");
    const lado = await pedir(app, "POST", "/equivalencias/s1/unir", { cuerpo: { conservar: "c" } });
    expect(lado.status).toBe(400);
    expect(await error(lado)).toBe("Elegí qué producto se conserva: a o b");
  });
});
