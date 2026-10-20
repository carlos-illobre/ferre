import { describe, expect, it } from "vitest";
import type { VentaDelDia } from "./ventas-del-dia";
import { aEntrada, conCantidad, conPrecio, diferenciaDe, empezarCorreccion, hayCambios, porQueNoSeGuarda, quitar, resolucionDe, totalCorregido } from "./correccion";

// La cuenta de una corrección (019-T004), la misma que rehace el servidor (RF-127, E02, E31).
const renglon = (id: string, cantidad: string, precio: string, margen: string | null, devuelto = "0") =>
  ({ id, producto_id: `p-${id}`, devuelto, descripcion: `Producto ${id}`, cantidad, precio_unitario: precio, margen_aplicado: margen, explicacion: null, foto_url: null, subtotal: Number(cantidad) * Number(precio) });
const venta = (extra: Partial<VentaDelDia> = {}): VentaDelDia => ({
  id: "v1", fecha: "2026-10-20T12:00:00Z", medio_pago: "efectivo", total: "38000", estado: "confirmada", pagada_en: null, cliente: null, cliente_id: null, version: "2026-10-20T12:00:00.000Z",
  items: [renglon("a", "1", "22000", "40"), renglon("b", "2", "8000", null)], ...extra,
});

describe("corregir una venta: la cuenta (019-T004)", () => {
  it("019-E02: sin cambios, el total es el de la venta y no hay diferencia", () => {
    const v = venta();
    const c = empezarCorreccion(v);
    expect(totalCorregido(c)).toBe(38000);
    expect(diferenciaDe(v, c)).toBe(0);
    expect(hayCambios(v, c)).toBe(false);
    expect(porQueNoSeGuarda(v, c)).toBe("Todavía no cambiaste nada.");
  });

  it("019-E02 019-E03: una unidad más sube el total y la diferencia se cobra", () => {
    const v = venta();
    const c = empezarCorreccion(v);
    c.renglones[1] = conCantidad(c.renglones[1]!, 3);
    expect(totalCorregido(c)).toBe(46000);
    expect(diferenciaDe(v, c)).toBe(8000);
    expect(resolucionDe(c.medio, 8000)).toBe("cobrada");
    expect(aEntrada(v, c, "mercado_pago")).toMatchObject({ medio_diferencia: "mercado_pago", items: [{ id: "a", cantidad: 1 }, { id: "b", cantidad: 3 }] });
  });

  it("019-E04 019-E05: si baja se devuelve en efectivo; en cuenta corriente cambia la deuda", () => {
    expect(resolucionDe("efectivo", -4000)).toBe("devuelta");
    expect(resolucionDe("cuenta_corriente", -4000)).toBe("cuenta_corriente");
    expect(resolucionDe("cuenta_corriente", 4000)).toBe("cuenta_corriente");
    expect(resolucionDe("tarjeta", 0)).toBe("sin_diferencia");
  });

  it("019-E29 019-E31: el precio cambiado queda a mano y se cobra tal cual; el de margen se redondea como al vender", () => {
    const v = venta();
    const c = empezarCorreccion(v);
    c.renglones[0] = conPrecio(c.renglones[0]!, 21333);
    expect(c.renglones[0]!.margen_aplicado).toBeNull();
    expect(totalCorregido(c)).toBe(21333 + 16000);
    const d = empezarCorreccion(v);
    d.renglones[0] = conCantidad(d.renglones[0]!, 1.5);
    expect(totalCorregido(d)).toBe(33000 + 16000);
  });

  it("019-E01 019-E25: quitar un renglón y agregar uno; sin renglones no se guarda", () => {
    const v = venta();
    let c = quitar(empezarCorreccion(v), 0);
    expect(c.quitados.map((r) => r.id)).toEqual(["a"]);
    c = { ...c, renglones: [...c.renglones, { producto_id: "p-n", descripcion: "Nuevo", foto_url: null, cantidad: 1, precio_unitario: 5000, margen_aplicado: null, costo_neto: 3000, devuelto: 0, antes: null }] };
    expect(diferenciaDe(v, c)).toBe(16000 + 5000 - 38000);
    expect(aEntrada(v, c, "efectivo").items).toEqual([
      { id: "b", producto_id: "p-b", descripcion: "Producto b", cantidad: 2, precio_unitario: 8000, margen_aplicado: null },
      { producto_id: "p-n", descripcion: "Nuevo", cantidad: 1, precio_unitario: 5000, margen_aplicado: null, costo_neto: 3000 },
    ]);
    expect(aEntrada(v, c, "efectivo")).not.toHaveProperty("medio_diferencia");
    expect(porQueNoSeGuarda(v, quitar(c, 0) && { ...c, renglones: [] })).toBe("Para dejar la venta sin productos, se anula.");
  });

  it("019-E10: a cuenta corriente sin cliente no se guarda", () => {
    const v = venta();
    const c = { ...empezarCorreccion(v), medio: "cuenta_corriente" as const };
    expect(porQueNoSeGuarda(v, c)).toBe("Elegí el cliente de la cuenta corriente.");
    expect(porQueNoSeGuarda(v, { ...c, clienteId: "c1" })).toBeNull();
  });

  it("019-E26: lo que ya volvió por un cambio no se quita ni baja de lo devuelto", () => {
    const v = venta({ items: [renglon("a", "3", "1000", null, "2")] });
    const c = empezarCorreccion(v);
    expect(conCantidad(c.renglones[0]!, 1).cantidad).toBe(2);
    expect(quitar(c, 0)).toBe(c);
  });
});
