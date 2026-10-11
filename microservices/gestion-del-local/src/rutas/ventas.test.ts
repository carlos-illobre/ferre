import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

const venta = { id: "11111111-1111-4111-8111-111111111111", medio_pago: "efectivo", items: [{ producto_id: "p1", descripcion: "MECHA", cantidad: 3, precio_unitario: 3000, margen_aplicado: 100, costo_neto: 1000, explicacion: { pasos: ["+ 100 % de margen"] } }] };

describe("POST /ventas", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("valida medio de pago, cliente de cuenta corriente, ítems, cantidades y precios", async () => {
    const casos: [unknown, string][] = [
      [{ ...venta, medio_pago: "cheque" }, "medio de pago"],
      [{ ...venta, medio_pago: "cuenta_corriente" }, "necesita el cliente"],
      [{ ...venta, items: [] }, "no tiene productos"],
      [{ ...venta, items: [{ ...venta.items[0], cantidad: 0 }] }, "cantidad inválida"],
      [{ ...venta, items: [{ ...venta.items[0], precio_unitario: -1 }] }, "precio inválido"],
      [{ ...venta, items: [{ ...venta.items[0], descripcion: " " }] }, "no tiene descripción"],
      [{ ...venta, id: "no-es-uuid" }, "UUID"],
    ];
    for (const [cuerpo, mensaje] of casos) {
      const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo });
      expect(r.status, mensaje).toBe(400);
      expect(((await r.json()) as { error: string }).error).toContain(mensaje);
    }
  });

  it("registra la venta con su total, guarda cada ítem con precio, margen y explicación, y descuenta stock", async () => {
    base.actual.programar(/SUM\(cantidad\), 0\) AS stock FROM movimiento_stock/, { rows: [{ stock: "10" }] });
    const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(r.status).toBe(201);
    const ventaSql = base.actual.sqlDe(/INSERT INTO venta \(/)[0]!;
    expect(ventaSql.params[0]).toBe(venta.id);
    expect(ventaSql.params[4]).toBe("9000.00");
    const item = base.actual.sqlDe(/INSERT INTO item_venta/)[0]!;
    expect(item.params).toEqual(expect.arrayContaining(["MECHA", 3, 100, "3000.00", JSON.stringify({ pasos: ["+ 100 % de margen"] })]));
    const movimiento = base.actual.sqlDe(/INSERT INTO movimiento_stock/)[0]!;
    expect(movimiento.params).toContain(-3);
    expect(base.actual.sqlDe(/INSERT INTO anomalia/)).toHaveLength(0);
    expect(base.actual.sqlDe(/^COMMIT/)).toHaveLength(1);
  });

  // RF-59: una venta nunca deja el stock por debajo de cero; lo que faltaba es una anomalía.
  it("con stock en cero la venta se registra igual, el stock no baja y queda anotada la anomalía", async () => {
    base.actual.programar(/SUM\(cantidad\), 0\) AS stock FROM movimiento_stock/, { rows: [{ stock: "0" }] });
    const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(r.status).toBe(201);
    expect(base.actual.sqlDe(/INSERT INTO movimiento_stock/)).toHaveLength(0);
    const anomalia = base.actual.sqlDe(/INSERT INTO anomalia/)[0]!;
    expect(anomalia.params.slice(1, 5)).toEqual(["p1", "u-mostrador", venta.id, 3]);
    expect(String(anomalia.params[5])).toContain("faltaban 3");
    expect(JSON.stringify(base.actual.sqlDe(/INSERT INTO evento/)[0]?.params ?? "")).toContain("anomalias");
  });

  it("si alcanza solo en parte, descuenta lo que hay y anota lo que faltó; un stock ya negativo no baja más", async () => {
    base.actual.programar(/SUM\(cantidad\), 0\) AS stock FROM movimiento_stock/, { rows: [{ stock: "2" }] });
    await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(base.actual.sqlDe(/INSERT INTO movimiento_stock/)[0]!.params).toContain(-2);
    expect(base.actual.sqlDe(/INSERT INTO anomalia/)[0]!.params[4]).toBe(1);
    base.actual = baseFalsa();
    base.actual.programar(/SUM\(cantidad\), 0\) AS stock FROM movimiento_stock/, { rows: [{ stock: "-4" }] });
    await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(base.actual.sqlDe(/INSERT INTO movimiento_stock/)).toHaveLength(0);
    expect(base.actual.sqlDe(/INSERT INTO anomalia/)[0]!.params[4]).toBe(3);
  });

  it("anular devuelve al stock lo que la venta descontó, no lo que se vendió", async () => {
    base.actual.programar(/UPDATE venta SET estado = 'anulada'/, { rowCount: 1 });
    const r = await pedir(app, "POST", `/ventas/${venta.id}/anular`, { rol: "admin", cuerpo: {} });
    expect(r.status).toBeLessThan(300);
    expect(base.actual.sqlDe(/INSERT INTO movimiento_stock/)[0]!.sql).toMatch(/-cantidad[\s\S]*FROM movimiento_stock WHERE referencia_tipo = 'venta'/);
  });

  it("cada renglón se redondea para arriba a $1.000: toda venta es múltiplo de $1.000 (RF-19)", async () => {
    const items = [
      { ...venta.items[0], cantidad: 0.5, precio_unitario: 3000 }, // $1.500 → $2.000
      { ...venta.items[0], producto_id: null, descripcion: "A MANO", cantidad: 1, precio_unitario: 1500 }, // $1.500 → $2.000
      { ...venta.items[0], producto_id: null, descripcion: "JUSTO", cantidad: 0.3, precio_unitario: 10000 }, // $3.000 justo: no sube
    ];
    const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: { ...venta, items } });
    expect(await r.json()).toMatchObject({ total: 7000 });
    expect(base.actual.sqlDe(/INSERT INTO venta \(/)[0]!.params[4]).toBe("7000.00");
    // El precio por unidad y la cantidad se guardan tal cual: el redondeo es del renglón.
    expect(base.actual.sqlDe(/INSERT INTO item_venta/)[0]!.params).toEqual(expect.arrayContaining([0.5, "3000.00"]));
  });

  it("una venta reenviada (sin conexión, reintento) no se duplica", async () => {
    base.actual.programar(/SELECT id, total, estado FROM venta WHERE id = \$1/, { rows: [{ id: venta.id, total: "9000.00", estado: "confirmada" }] });
    const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id: venta.id, total: 9000, repetida: true });
    expect(base.actual.sqlDe(/INSERT INTO venta/)).toHaveLength(0);
  });
});
