import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

// Corregir un stock a mano (RF-53): cuántas hay y por qué. El motivo es obligatorio para
// cualquier interfaz, por eso lo exige el servidor.
describe("POST /stock/:producto/ajustes", () => {
  beforeEach(() => { base.actual = baseFalsa(); base.actual.programar(/SUM\(cantidad\), 0\) AS stock/, { rows: [{ stock: "17" }] }); });

  it("sin motivo no se guarda", async () => {
    for (const motivo of [undefined, "", "   "]) {
      const r = await pedir(app, "POST", "/stock/p1/ajustes", { rol: "mostrador", cuerpo: { cantidad_real: 15, motivo } });
      expect(r.status).toBe(400);
      expect(((await r.json()) as { error: string }).error).toContain("Falta el motivo");
    }
    expect(base.actual.sqlDe(/INSERT INTO movimiento_stock/)).toHaveLength(0);
  });

  it("con motivo registra la diferencia y deja la explicación", async () => {
    const r = await pedir(app, "POST", "/stock/p1/ajustes", { rol: "mostrador", cuerpo: { cantidad_real: 15, motivo: "Rotura" } });
    expect(r.status).toBeLessThan(300);
    const movimiento = base.actual.sqlDe(/INSERT INTO movimiento_stock/)[0]!;
    expect(movimiento.params).toContain(-2);
    expect(movimiento.params).toContain("había 17, hay 15: Rotura");
  });

  it("una cantidad que no es un número mayor o igual a cero se rechaza", async () => {
    expect((await pedir(app, "POST", "/stock/p1/ajustes", { cuerpo: { cantidad_real: -1, motivo: "x" } })).status).toBe(400);
  });
});
