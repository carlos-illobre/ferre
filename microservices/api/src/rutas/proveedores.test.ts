import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

const error = async (r: Response) => ((await r.json()) as { error: string }).error;

// Proveedores (issue #11): el alta pide el nombre; los descuentos van entre 0 y 1.
describe("/proveedores", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("el alta sin nombre, 400, y no llega a la base", async () => {
    for (const cuerpo of [{}, { nombre: "   " }, { nombre: 5 }]) {
      const r = await pedir(app, "POST", "/proveedores", { cuerpo });
      expect(r.status).toBe(400);
      expect(await error(r)).toBe("Hace falta el nombre");
    }
    expect(base.actual.sqlDe(/insert into "proveedor"/i)).toHaveLength(0);
  });

  it("los descuentos van entre 0 y 1, en el alta y al cambiar", async () => {
    for (const d of [-0.1, 1.5, "0.1"]) {
      const r = await pedir(app, "POST", "/proveedores", { cuerpo: { nombre: "Tresge", descuento_general: d } });
      expect(r.status).toBe(400);
      expect(await error(r)).toBe("descuento_general va entre 0 y 1 (0.25 = 25 %)");
    }
    const r = await pedir(app, "PATCH", "/proveedores/pv1", { cuerpo: { descuento_contado: 2 } });
    expect(r.status).toBe(400);
    expect(await error(r)).toBe("descuento_contado va entre 0 y 1 (0.25 = 25 %)");
  });

  it("el alta guarda el nombre sin espacios, con los descuentos y sin IVA si no se dice", async () => {
    const r = await pedir(app, "POST", "/proveedores", { cuerpo: { nombre: "  Tresge  ", descuento_general: 0.25 } });
    expect(r.status).toBe(201);
    const alta = base.actual.sqlDe(/insert into "proveedor"/i)[0]!;
    expect(alta.params).toEqual(expect.arrayContaining(["Tresge", false, 0.25, 0]));
  });
});
