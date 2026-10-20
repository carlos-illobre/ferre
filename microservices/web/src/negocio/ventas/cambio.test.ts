import { describe, expect, it } from "vitest";
import type { VentaDelDia } from "./ventas-del-dia";
import { aEntradaDeCambio, diferenciaDelCambio, paraVolver, resolucionDelCambio, sePuedeCambiar, valorQueVuelve, type SeLleva } from "./cambio";

// La cuenta de un cambio (019-T009/T010), la misma que rehace el servidor (RF-129, RF-130).
const venta = (extra: Partial<VentaDelDia> = {}): VentaDelDia => ({
  id: "v1", fecha: "2026-10-19T12:00:00Z", medio_pago: "efectivo", total: "26000", estado: "confirmada", pagada_en: null, cliente: null,
  items: [
    { id: "pinza", producto_id: "p-pinza", devuelto: "0", descripcion: "PINZA", cantidad: "1", precio_unitario: "14000", margen_aplicado: "100", explicacion: null, foto_url: null, subtotal: 14000 },
    { id: "clavo", producto_id: "p-clavo", devuelto: "0.5", descripcion: "CLAVO", cantidad: "0.7", precio_unitario: "3890", margen_aplicado: "100", explicacion: null, foto_url: null, subtotal: 3000 },
  ], ...extra,
});
const lleva = (precio: number, margen: number | null = 100): SeLleva => ({ producto_id: "p-punta", descripcion: "PINZA DE PUNTA", foto_url: null, cantidad: 1, precio_unitario: precio, margen_aplicado: margen, costo_neto: 9000 });

describe("un cambio: la cuenta (019)", () => {
  it("019-E12: lo que vuelve se toma al precio que se pagó (el renglón como se cobró) y no más de lo que queda", () => {
    const [pinza, clavo] = paraVolver(venta());
    expect(pinza).toMatchObject({ pagado: 14000, porDevolver: 1 });
    expect(clavo!.pagado).toBeCloseTo(4285.71, 2);
    expect(clavo!.porDevolver).toBe(0.2);
    expect(valorQueVuelve([{ renglon: pinza!, cantidad: 1, fallado: false }])).toBe(14000);
  });

  it("019-E14 019-E15: si lo nuevo vale más se cobra con el medio elegido; si vale menos se devuelve", () => {
    const [pinza] = paraVolver(venta());
    const vuelve = [{ renglon: pinza!, cantidad: 1, fallado: false }];
    expect(diferenciaDelCambio(vuelve, [lleva(18000)])).toBe(4000);
    expect(resolucionDelCambio("efectivo", 4000)).toBe("cobrado");
    expect(aEntradaDeCambio(vuelve, [lleva(18000)], "tarjeta", "efectivo")).toMatchObject({ medio_diferencia: "tarjeta", vuelve: [{ item_id: "pinza", cantidad: 1, fallado: false }] });
    expect(diferenciaDelCambio(vuelve, [lleva(12500, null)])).toBe(-1500);
    expect(resolucionDelCambio("efectivo", -1500)).toBe("devuelto");
  });

  it("019-E16 019-E18: sin nada que se lleve es una devolución; en cuenta corriente cambia la deuda", () => {
    const [pinza] = paraVolver(venta({ medio_pago: "cuenta_corriente" }));
    const vuelve = [{ renglon: pinza!, cantidad: 1, fallado: true }];
    expect(diferenciaDelCambio(vuelve, [])).toBe(-14000);
    expect(resolucionDelCambio("cuenta_corriente", -14000)).toBe("cuenta_corriente");
    expect(aEntradaDeCambio(vuelve, [], "efectivo", "cuenta_corriente")).toEqual({ vuelve: [{ item_id: "pinza", cantidad: 1, fallado: true }], se_lleva: [] });
  });

  it("019-E23: se cambia hasta 15 días después de la venta", () => {
    const ahora = new Date("2026-10-20T12:00:00Z").getTime();
    expect(sePuedeCambiar("2026-10-06T12:00:00Z", ahora)).toBe(true);
    expect(sePuedeCambiar("2026-10-04T12:00:00Z", ahora)).toBe(false);
  });
});
