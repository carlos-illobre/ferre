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
    const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(r.status).toBe(201);
    const ventaSql = base.actual.sqlDe(/INSERT INTO venta \(/)[0]!;
    expect(ventaSql.params[0]).toBe(venta.id);
    expect(ventaSql.params[4]).toBe("9000.00");
    const item = base.actual.sqlDe(/INSERT INTO item_venta/)[0]!;
    expect(item.params).toEqual(expect.arrayContaining(["MECHA", 3, 100, "3000.00", JSON.stringify({ pasos: ["+ 100 % de margen"] })]));
    const movimiento = base.actual.sqlDe(/INSERT INTO movimiento_stock/)[0]!;
    expect(movimiento.params).toContain(-3);
    expect(base.actual.sqlDe(/^COMMIT/)).toHaveLength(1);
  });

  it("una venta reenviada (sin conexión, reintento) no se duplica", async () => {
    base.actual.programar(/SELECT id, total, estado FROM venta WHERE id = \$1/, { rows: [{ id: venta.id, total: "9000.00", estado: "confirmada" }] });
    const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id: venta.id, total: 9000, repetida: true });
    expect(base.actual.sqlDe(/INSERT INTO venta/)).toHaveLength(0);
  });
});
