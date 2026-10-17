/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// «Hoy» renovada (specs/017): lo que se calcula de las ventas de un día.
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { comparar, diaAnterior, nombreDelDia, porHora, resumenDelDia, totalHasta, useResumenDelDia } from "./resumen-del-dia";
import { consultas } from "../../consultas";
import { hoyLocal } from "../../formato";

const a = (h: number, m = 0, dia = "2026-10-17") => new Date(`${dia}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`).toISOString();
const venta = (id: string, fecha: string, medio: string, total: number, renglones = 1, estado = "confirmada") =>
  ({ id, fecha, medio_pago: medio, total: String(total), estado, pagada_en: null, cliente: null, items: Array.from({ length: renglones }, (_, i) => ({ descripcion: `P${i}`, cantidad: "1", precio_unitario: "1" })) }) as any;
const HOY = [
  venta("v1", a(9, 12), "efectivo", 12000, 2), venta("v2", a(10, 40), "mercado_pago", 223000, 1),
  venta("v3", a(11, 5), "cuenta_corriente", 58000, 3), venta("v4", a(11, 48), "tarjeta", 6000, 1, "anulada"),
];

describe("el resumen del día", () => {
  it("017-E01 017-E14: el total sin las anuladas", () => {
    expect(resumenDelDia(HOY).total).toBe(293000);
  });
  it("017-E05: cada medio con su importe y cuántas ventas, también los que no tuvieron", () => {
    expect(resumenDelDia(HOY).medios).toEqual({ efectivo: { total: 12000, cuantas: 1 }, mercado_pago: { total: 223000, cuantas: 1 }, tarjeta: { total: 0, cuantas: 0 }, cuenta_corriente: { total: 58000, cuantas: 1 } });
  });
  it("017-E07 017-E08 017-E09: ventas, productos (renglones) y ticket promedio, sin las anuladas", () => {
    const r = resumenDelDia(HOY);
    expect(r.ventas).toBe(3);
    expect(r.productos).toBe(6);
    expect(r.ticket).toBe(97667);
  });
  it("017-E10: sin ventas, ceros y sin ticket promedio", () => {
    expect(resumenDelDia([])).toMatchObject({ total: 0, ventas: 0, productos: 0, ticket: null });
  });
});

describe("lo vendido por hora", () => {
  it("017-E04: una barra por hora, de la primera a la actual; las horas sin ventas en cero", () => {
    expect(porHora(HOY, 12)).toEqual([{ hora: 9, total: 12000 }, { hora: 10, total: 223000 }, { hora: 11, total: 58000 }, { hora: 12, total: 0 }]);
  });
  it("017-E04: otro día, de la primera hora con ventas a la última", () => {
    expect(porHora([venta("x", a(8), "efectivo", 1000), venta("y", a(10), "efectivo", 2000)])).toEqual([{ hora: 8, total: 1000 }, { hora: 9, total: 0 }, { hora: 10, total: 2000 }]);
  });
});

describe("la comparación (decisión 109)", () => {
  const AYER = [venta("y1", a(9, 0, "2026-10-16"), "efectivo", 50000), venta("y2", a(11, 20, "2026-10-16"), "efectivo", 200000), venta("y3", a(17, 0, "2026-10-16"), "efectivo", 400000)];
  it("017-E02: hoy contra ayer hasta la misma hora", () => {
    expect(totalHasta(AYER, 11 * 60 + 30)).toBe(250000);
    expect(comparar(293000, 250000)).toEqual({ sinVentas: false, porcentaje: 17, anterior: 250000 });
    expect(comparar(200000, 250000)).toMatchObject({ porcentaje: -20 });
  });
  it("017-E03: ayer a esta hora sin ventas, sin porcentaje", () => {
    expect(comparar(293000, totalHasta(AYER, 8 * 60))).toEqual({ sinVentas: true });
  });
  it("017-E17: otro día, entero contra el suyo entero", () => {
    expect(totalHasta(AYER, null)).toBe(650000);
  });
  it("017-E16: el día anterior y el nombre del día", () => {
    expect(diaAnterior("2026-10-01")).toBe("2026-09-30");
    expect(nombreDelDia("2026-10-15")).toBe("jueves 15/10");
  });
});

describe("el resumen de un día, desde el servidor", () => {
  beforeEach(() => { apiFalsa.mockReset(); consultas.clear(); });
  it("017-E15 017-E02: pide el día y el anterior; la lista, de la más reciente a la más vieja", async () => {
    const hoy = hoyLocal();
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/ventas" ? { dia: hoy, ventas: HOY.map((v) => ({ ...v, fecha: v.fecha.replace("2026-10-17", hoy) })), totales: {}, total: 293000 } : { dia: "x", ventas: [], totales: {}, total: 0 }));
    const { result } = renderHook(() => useResumenDelDia(null));
    await waitFor(() => expect(result.current.comparacion).not.toBeNull());
    expect(apiFalsa).toHaveBeenCalledWith(`/ventas?dia=${diaAnterior(hoy)}`);
    expect(result.current.ventas!.map((v) => v.id)).toEqual(["v4", "v3", "v2", "v1"]);
    expect(result.current.comparacion).toEqual({ sinVentas: true });
  });
  it("017-E16: otro día pide ese y el anterior", async () => {
    apiFalsa.mockResolvedValue({ dia: "x", ventas: [], totales: {}, total: 0 });
    const { result } = renderHook(() => useResumenDelDia("2026-10-15"));
    await waitFor(() => expect(result.current.resumen).not.toBeNull());
    expect(result.current.esHoy).toBe(false);
    expect(apiFalsa).toHaveBeenCalledWith("/ventas?dia=2026-10-15");
    expect(apiFalsa).toHaveBeenCalledWith("/ventas?dia=2026-10-14");
  });
});
