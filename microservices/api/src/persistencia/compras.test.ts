import { describe, expect, it } from "vitest";
import * as datos from "./compras.js";
import { base } from "./conexion.js";
import { stockDe } from "./deposito.js";
import { pedido, precio, producto, proveedor, usuario } from "./pruebas/datos.js";

// El ingreso de mercadería (RF-50).
describe("las compras", () => {
  it("la foto del comprobante se guarda suelta y la toma una compra", async () => {
    const ana = await usuario();
    const archivo = await datos.guardarFoto(base, Buffer.from("factura"), ".jpg", ana);
    expect(String(await datos.leerFoto(archivo))).toBe("factura");
    expect(await datos.leerFoto("no-esta.jpg")).toBeNull();
    const prov = await proveedor({ nombre: "Comodo" });
    const id = crypto.randomUUID();
    await datos.insertarCompra(base, { id, proveedor_id: prov, fecha: "2026-10-20", comprobante_tipo: "factura", comprobante_numero: "A-1", total: "1500", nota: null, pedido_id: null });
    await datos.tomarFoto(base, id, archivo);
    expect(await datos.compraPorId(base, id)).toEqual({ id, total: "1500.00" });
    expect(await datos.compraPorId(base, crypto.randomUUID())).toBeNull();
    expect((await datos.recientes(base)).find((c) => c.id === id)).toMatchObject({ proveedor: "Comodo", foto: `/compras/fotos/${archivo}`, items: [] });
  });

  it("el proveedor activo y el pedido trabado", async () => {
    const activo = await proveedor({ nombre: "Activo" });
    const inactivo = await proveedor({ activo: false });
    expect(await datos.nombreDelProveedorActivo(base, activo)).toBe("Activo");
    expect(await datos.nombreDelProveedorActivo(base, inactivo)).toBeNull();
    const pe = await pedido(activo);
    expect(await datos.pedidoTrabado(base, pe)).toEqual({ estado: "borrador", proveedor_id: activo });
    expect(await datos.pedidoTrabado(base, crypto.randomUUID())).toBeNull();
  });

  it("cada renglón suma stock; el costo vigente es el último; un producto nuevo nace del proveedor", async () => {
    const prov = await proveedor();
    const nuevo = await datos.productoNuevo(base, "Tornillo", "Fischer", prov);
    const id = crypto.randomUUID();
    await datos.insertarCompra(base, { id, proveedor_id: prov, fecha: "2026-10-20", comprobante_tipo: "remito", comprobante_numero: null, total: "300", nota: "ok", pedido_id: null });
    await datos.renglonYStock(base, id, 1, nuevo, 3, "100", "2026-10-20");
    expect(await stockDe(base, nuevo)).toBe(3);
    expect(await datos.renglonesDe(base, id)).toEqual([{ orden: 1, cantidad: "3.000", costo_unitario: "100.0000", descripcion: "Tornillo", marca: "Fischer", unidad: "unidad" }]);
    expect(await datos.costoVigente(base, nuevo, prov)).toBeNull();
    await precio(nuevo, prov, { codigo_proveedor: "T1", costo_neto: 90, fecha_lista: "2026-09-01" });
    await datos.nuevoCosto(base, { productoId: nuevo, proveedorId: prov, codigo: "T1", descripcion: "Tornillo", costo: "100", descuentos: "{}", iva: "0.21", fecha: "2026-10-20" });
    expect(await datos.costoVigente(base, nuevo, prov)).toMatchObject({ costo_neto: "100.0000", codigo_proveedor: "T1" });
  });

  it("lo recibido de un pedido, lo que falta y su estado", async () => {
    const prov = await proveedor();
    const p = await producto();
    const pe = await pedido(prov);
    await base.insertInto("item_pedido").values({ id: crypto.randomUUID(), pedido_id: pe, orden: 1, producto_id: p, cantidad: 5 }).execute();
    expect(await datos.renglonesQueFaltan(base, pe)).toBe(1);
    await datos.recibidoEnPedido(base, pe, p, 5);
    expect(await datos.renglonesQueFaltan(base, pe)).toBe(0);
    await datos.estadoDelPedido(base, pe, "recibido");
    expect(await datos.pedidoTrabado(base, pe)).toMatchObject({ estado: "recibido" });
  });

  it("anular una vez devuelve el stock; los gastos de la semana suman lo confirmado", async () => {
    const prov = await proveedor({ nombre: "ZZ Gastos" });
    const p = await producto();
    const id = crypto.randomUUID();
    const hoy = new Date().toISOString().slice(0, 10);
    await datos.insertarCompra(base, { id, proveedor_id: prov, fecha: hoy, comprobante_tipo: "sin_comprobante", comprobante_numero: null, total: "200", nota: null, pedido_id: null });
    await datos.renglonYStock(base, id, 1, p, 2, "100", hoy);
    expect((await datos.gastosDeLaSemana(base)).find((g) => g.proveedor === "ZZ Gastos")).toMatchObject({ total: "200.00", compras: "1" });
    expect(await datos.marcarAnulada(base, id)).toBe(true);
    expect(await datos.marcarAnulada(base, id)).toBe(false);
    await datos.devolverStock(base, id);
    expect(await stockDe(base, p)).toBe(0);
    expect((await datos.gastosDeLaSemana(base)).find((g) => g.proveedor === "ZZ Gastos")).toBeUndefined();
  });
});
