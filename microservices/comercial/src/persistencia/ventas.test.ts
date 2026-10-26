import { describe, expect, it } from "vitest";
import { base } from "./conexion.js";
import { cliente, movimiento, producto, usuario } from "./pruebas/datos.js";
import { enTransaccion } from "./transaccion.js";
import * as datos from "./ventas.js";

const ahora = () => new Date().toISOString();

async function ventaCon(productoId: string | null, cambios: Partial<datos.VentaNueva> = {}) {
  const id = crypto.randomUUID();
  await datos.insertarVenta(base, { id, fecha: ahora(), cliente_id: null, medio_pago: "efectivo", total: "2000.00", dispositivo_id: "celular", ...cambios });
  await datos.insertarRenglon(base, { venta_id: id, orden: 1, producto_id: productoId, descripcion: "Pinza Bahco", cantidad: 2, costo_neto: 500, precio_proveedor_id: null, margen_aplicado: 100, precio_unitario: "1000.00", explicacion: "{}" });
  return id;
}

// Ventas (003) y corregir y cambiar (019).
describe("las ventas", () => {
  it("una venta con sus renglones, en las del día; la de otro día, en ese día", async () => {
    const p = await producto({ unidad: "unidad" });
    const id = await ventaCon(p);
    const vieja = await ventaCon(null, { fecha: "2026-01-15T15:00:00Z" });
    expect(await datos.ventaPorId(base, id)).toEqual({ id, total: "2000.00", estado: "confirmada" });
    expect(await datos.ventaPorId(base, crypto.randomUUID())).toBeUndefined();
    const hoy = await datos.ventasDelDia(base, null);
    expect(hoy.find((v) => v.id === id)).toMatchObject({ correcciones: 0, items: [{ descripcion: "Pinza Bahco", producto_id: p, unidad: "unidad" }] });
    expect(hoy.find((v) => v.id === vieja)).toBeUndefined();
    expect((await datos.ventasDelDia(base, "2026-01-15")).map((v) => v.id)).toEqual([vieja]);
    expect(await datos.esDeHoy(base, id)).toBe(true);
    expect(await datos.esDeHoy(base, vieja)).toBe(false);
    expect(await datos.esDeHoy(base, crypto.randomUUID())).toBeNull();
  });

  it("descuenta stock, anota lo que faltó y lo último vendido sin repetir", async () => {
    const p = await producto();
    await movimiento(p, 1);
    const id = await ventaCon(p);
    await datos.descontarStock(base, { producto_id: p, cantidad: 2, venta_id: id, fecha: ahora() });
    expect(await datos.stockDe(base, p)).toBe(-1);
    const ana = await usuario();
    await datos.anotarFaltante(base, { producto_id: p, usuario_id: ana, usuario_nombre: "Ana", venta_id: id, cantidad: 1, detalle: "faltó 1" });
    expect((await base.selectFrom("anomalia").select("tipo").where("venta_id", "=", id).executeTakeFirstOrThrow()).tipo).toBe("venta_sin_stock");
    await ventaCon(p);
    expect((await datos.ultimosProductosVendidos(base, 10)).filter((x) => x === p)).toHaveLength(1);
  });

  it("anular una vez devuelve lo descontado, salvo lo que volvió fallado en un cambio", async () => {
    const [p, fallado] = [await producto(), await producto()];
    const id = await ventaCon(p);
    await datos.descontarStock(base, { producto_id: p, cantidad: 2, venta_id: id, fecha: ahora() });
    const ana = await usuario();
    const cambio = crypto.randomUUID();
    await datos.insertarCambio(base, { id: cambio, venta_id: id, usuario_id: ana, dispositivo_id: null, diferencia: 0, resuelto: "sin_diferencia" });
    await datos.insertarRenglonDeCambio(base, { cambio_id: cambio, lado: "se_lleva", item_venta_id: null, producto_id: fallado, descripcion: "Otra", cantidad: 1, precio_unitario: 1000, margen_aplicado: null, fallado: false });
    const [item] = await datos.renglonesVigentes(base, id);
    await datos.insertarRenglonDeCambio(base, { cambio_id: cambio, lado: "vuelve", item_venta_id: item!.id, producto_id: fallado, descripcion: "Pinza", cantidad: 1, precio_unitario: 1000, margen_aplicado: 100, fallado: true });
    await datos.moverStock(base, { producto_id: fallado, cantidad: 1, tipo: "cambio", venta_id: id, nota: "vuelve" });
    expect(await datos.marcarAnulada(base, id)).toBe(true);
    expect(await datos.marcarAnulada(base, id)).toBe(false);
    await datos.devolverStock(base, id);
    await datos.dejarAfueraLoFallado(base, id);
    expect(await datos.stockDe(base, p)).toBe(0);
    expect(await datos.stockDe(base, fallado)).toBe(-1);
  });

  it("cuenta corriente: se marca pagada una sola vez; el cliente con cuenta, activo", async () => {
    const ana = await cliente({ cuenta_corriente: true });
    const sinCuenta = await cliente({ cuenta_corriente: false });
    const id = await ventaCon(null, { medio_pago: "cuenta_corriente", cliente_id: ana });
    expect(await datos.marcarPagada(base, id)).toBe(true);
    expect(await datos.marcarPagada(base, id)).toBe(false);
    expect(await datos.clienteConCuentaCorriente(base, ana)).toBe(true);
    expect(await datos.clienteConCuentaCorriente(base, sinCuenta)).toBe(false);
  });

  it("lo que preguntaron y no se llevaron", async () => {
    await datos.anotarConsulta(base, { producto_id: null, descripcion: "Taladro zz", precio_ofrecido: 50000, motivo: "caro", dispositivo_id: null });
    expect((await datos.ultimasConsultas(base))[0]).toMatchObject({ descripcion: "Taladro zz", motivo: "caro" });
  });

  it("corregir: la venta trabada, sus renglones vigentes, el último orden, y lo que cambia queda con su foto", async () => {
    const p = await producto({ unidad: "kg" });
    const id = await ventaCon(p);
    const ana = await usuario();
    await enTransaccion(async (trx) => {
      expect(await datos.ventaParaCorregir(trx, id)).toMatchObject({ id, de_hoy: true, estado: "confirmada" });
      const [item] = await datos.renglonesVigentes(trx, id);
      expect(await datos.ultimoOrden(trx, id)).toBe(1);
      const correccion = crypto.randomUUID();
      await datos.insertarCorreccion(trx, { id: correccion, venta_id: id, usuario_id: ana, dispositivo_id: null, antes: { a: 1 }, despues: { a: 2 }, diferencia: -1000, resuelta: "devuelta" });
      await datos.actualizarRenglon(trx, item!.id, { cantidad: 1, precio_unitario: 1000, margen_aplicado: null });
      await datos.insertarRenglon(trx, { venta_id: id, orden: 2, producto_id: null, descripcion: "Libre", cantidad: 1, costo_neto: null, precio_proveedor_id: null, margen_aplicado: null, precio_unitario: "300.00", explicacion: "{}" });
      await datos.quitarRenglon(trx, item!.id, correccion);
      await datos.actualizarVenta(trx, id, { total: 300, medio_pago: "tarjeta", cliente_id: null });
      await datos.insertarMovimientoDeDinero(trx, { tipo: "devolucion", medio_pago: "tarjeta", cliente_id: null, importe: 1000, venta_id: id, correccion_id: correccion, usuario_id: ana });
    });
    expect((await datos.renglonesVigentes(base, id)).map((r) => r.descripcion)).toEqual(["Libre"]);
    expect(await datos.ultimoOrden(base, crypto.randomUUID())).toBe(0);
    expect((await datos.ventasDelDia(base, null)).find((v) => v.id === id)).toMatchObject({ total: "300.00", medio_pago: "tarjeta", correcciones: 1 });
    expect((await datos.movimientosDelDia(base, null)).find((m) => m.venta_id === id)).toMatchObject({ tipo: "devolucion", importe: "1000.00", suma: false });
    expect(await datos.unidadDe(base, p)).toBe("kg");
    expect(await datos.unidadDe(base, crypto.randomUUID())).toBe("unidad");
  });

  it("cambiar: se busca la venta por el producto, sin tildes; lo devuelto suma; la plata va aparte", async () => {
    const p = await producto();
    const id = await ventaCon(p);
    await base.updateTable("item_venta").set({ descripcion: "Pinza de presión ZZ" }).where("venta_id", "=", id).execute();
    const encontradas = await datos.ventasParaCambio(base, "presion zz", 15);
    expect(encontradas.map((v) => v.id)).toEqual([id]);
    expect(await datos.ventasParaCambio(base, "presion zz", 0)).toEqual([]);
    const [item] = await datos.renglonesVigentes(base, id);
    await datos.sumarDevuelto(base, item!.id, 1);
    expect((await datos.renglonesVigentes(base, id))[0]!.devuelto).toBe("1.000");
    const ana = await usuario();
    const cambio = crypto.randomUUID();
    await datos.insertarCambio(base, { id: cambio, venta_id: id, usuario_id: ana, dispositivo_id: null, diferencia: 500, resuelto: "cobrado" });
    await datos.insertarMovimientoDeDinero(base, { tipo: "cobro_diferencia", medio_pago: "efectivo", cliente_id: null, importe: 500, venta_id: id, cambio_id: cambio, usuario_id: ana });
    expect((await datos.movimientosDelDia(base, null)).find((m) => m.cambio_id === cambio)).toMatchObject({ suma: true, correccion_id: null });
    await datos.anotarDevueltoFallado(base, { producto_id: p, usuario_id: ana, usuario_nombre: "Ana", venta_id: id, cantidad: 1, detalle: "fallado" });
    expect((await base.selectFrom("anomalia").select("tipo").where("detalle", "=", "fallado").executeTakeFirstOrThrow()).tipo).toBe("devuelto_fallado");
  });
});
