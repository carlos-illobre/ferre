import { describe, expect, it } from "vitest";
import { base } from "./conexion.js";
import { anotarAjuste, movimientosDe, movimientosPorProducto, productosConStock, stockDe, stockDeProductos, stockQueCambio } from "./deposito.js";
import { movimiento, producto } from "./pruebas/datos.js";

// El stock es la suma de los movimientos (RNF-30).
describe("el stock", () => {
  it("es la suma de los movimientos; sin movimientos, cero", async () => {
    const p = await producto();
    expect(await stockDe(base, p)).toBe(0);
    await movimiento(p, 10);
    await movimiento(p, -3, { tipo: "venta" });
    expect(await stockDe(base, p)).toBe(7);
  });

  it("el de unos productos puntuales, y quiénes tienen stock", async () => {
    const [a, b, c] = [await producto(), await producto(), await producto()];
    await movimiento(a, 2);
    await movimiento(b, 1);
    await movimiento(b, -1, { tipo: "venta" });
    expect(await stockDeProductos(base, [])).toEqual({});
    expect(await stockDeProductos(base, [a, b, c])).toEqual({ [a]: "2.000", [b]: "0.000" });
    const conStock = await productosConStock(base);
    expect([conStock.has(a), conStock.has(b), conStock.has(c)]).toEqual([true, false, false]);
  });

  it("lo que cambió desde una marca, para bajar a mano", async () => {
    const p = await producto();
    await movimiento(p, 5);
    const todo = await stockQueCambio(null);
    expect(todo.stock[p]).toBe("5.000");
    const otro = await producto();
    await movimiento(otro, 1);
    // Desde la marca vuelve lo que cambió después (y, por las dudas, lo que pudo no verse antes).
    expect((await stockQueCambio(todo.marca)).stock).toMatchObject({ [otro]: "1.000" });
    expect((await stockQueCambio(String(BigInt(todo.marca) + 1_000_000n))).stock).toEqual({});
  });

  it("por producto, con su último movimiento; y la explicación, del más nuevo al más viejo", async () => {
    const p = await producto();
    await movimiento(p, 4, { fecha: new Date("2026-10-01T10:00:00Z") });
    await anotarAjuste(base, { producto_id: p, cantidad: -1, nota: "se rompió" });
    expect((await movimientosPorProducto(base)).find((f) => f.id === p)).toMatchObject({ stock: "3.000" });
    expect((await movimientosDe(base, p)).map((m) => [m.tipo, m.cantidad, m.nota])).toEqual([["ajuste", "-1.000", "se rompió"], ["compra", "4.000", null]]);
  });
});
