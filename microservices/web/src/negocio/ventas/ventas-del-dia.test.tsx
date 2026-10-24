import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ErrorApi } from "../../datos/conexion";
import { fueSinConexion, hoyLocal, useAnularVenta, useVentasDelDia, ventasCambiaron, type VentaDelDia } from "./ventas-del-dia";

const apiFalsa = vi.fn();
vi.mock("../../datos/conexion", async (original) => ({ ...(await original<typeof import("../../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));

const venta = (id: string, estado: VentaDelDia["estado"] = "confirmada"): VentaDelDia =>
  ({ id, fecha: "2026-10-13T12:00:00Z", medio_pago: "efectivo", total: "1500.00", estado, pagada_en: null, cliente: null, items: [{ descripcion: "Martillo", cantidad: "1.000", precio_unitario: "1500.00", margen_aplicado: null, explicacion: null, foto_url: null, subtotal: 2000 }] });
const dia = (ventas: VentaDelDia[]) => ({ dia: "2026-10-13", ventas, totales: { efectivo: 1500 }, total: 1500 });

// Reordenamiento (010-E05): las ventas del día se piden y se anulan de una sola manera, sin pantalla.
describe("las ventas del día (010-E05)", () => {
  it("hoy se pide sin día, y otro día con su fecha", async () => {
    apiFalsa.mockReset().mockResolvedValue(dia([venta("v1")]));
    const hoy = renderHook(() => useVentasDelDia(hoyLocal()));
    await waitFor(() => expect(hoy.result.current.datos?.ventas).toHaveLength(1));
    expect(apiFalsa).toHaveBeenLastCalledWith("/ventas");
    const otro = renderHook(() => useVentasDelDia("2026-10-01"));
    await waitFor(() => expect(otro.result.current.datos).not.toBeNull());
    expect(apiFalsa).toHaveBeenLastCalledWith("/ventas?dia=2026-10-01");
  });

  it("dos pantallas que piden el mismo día comparten un solo pedido", async () => {
    apiFalsa.mockReset().mockResolvedValue(dia([venta("v1")]));
    const una = renderHook(() => useVentasDelDia());
    const otra = renderHook(() => useVentasDelDia());
    await waitFor(() => expect(otra.result.current.datos).not.toBeNull());
    expect(una.result.current.datos).toBe(otra.result.current.datos);
    expect(apiFalsa).toHaveBeenCalledTimes(1);
  });

  it("anular avisa al servidor con el motivo y vuelve a pedir el día", async () => {
    apiFalsa.mockReset().mockResolvedValueOnce(dia([venta("v1")])).mockResolvedValueOnce({ ok: true }).mockResolvedValue(dia([venta("v1", "anulada")]));
    const lista = renderHook(() => useVentasDelDia());
    await waitFor(() => expect(lista.result.current.datos).not.toBeNull());
    const { result } = renderHook(() => useAnularVenta());
    await act(async () => { await result.current.anular(venta("v1"), "se cobró dos veces"); });
    expect(apiFalsa).toHaveBeenCalledWith("/ventas/v1/anular", { method: "POST", body: JSON.stringify({ motivo: "se cobró dos veces" }) });
    await waitFor(() => expect(lista.result.current.datos?.ventas[0]?.estado).toBe("anulada"));
  });

  it("una venta cobrada en otra pantalla refresca la lista", async () => {
    apiFalsa.mockReset().mockResolvedValueOnce(dia([])).mockResolvedValue(dia([venta("v2")]));
    const lista = renderHook(() => useVentasDelDia());
    await waitFor(() => expect(lista.result.current.datos?.ventas).toHaveLength(0));
    await act(async () => { await ventasCambiaron(); });
    await waitFor(() => expect(lista.result.current.datos?.ventas).toHaveLength(1));
  });

  it("distingue el rechazo del servidor de la falta de conexión, sin reintentar", async () => {
    apiFalsa.mockReset().mockRejectedValue(new TypeError("Failed to fetch"));
    const lista = renderHook(() => useVentasDelDia());
    await waitFor(() => expect(lista.result.current.error).not.toBeNull());
    expect(fueSinConexion(lista.result.current.error)).toBe(true);
    expect(apiFalsa).toHaveBeenCalledTimes(1);
    apiFalsa.mockReset().mockRejectedValue(new ErrorApi(403, "Esa venta no es de hoy"));
    const { result } = renderHook(() => useAnularVenta());
    const fallo = await result.current.anular(venta("v1"), "").catch((e: unknown) => e);
    expect(fueSinConexion(fallo)).toBe(false);
    expect((fallo as Error).message).toBe("Esa venta no es de hoy");
  });
});

// 003-T005: el motivo de una anulación (decisión 110).
describe("el motivo de una anulación", () => {
  it("junta el motivo elegido y el comentario; «Sin motivo» no se guarda", async () => {
    const { motivoDeAnulacion } = await import("./ventas-del-dia");
    expect(motivoDeAnulacion("Devolución", " la mecha vino fallada ")).toBe("Devolución: la mecha vino fallada");
    expect(motivoDeAnulacion("Devolución", "")).toBe("Devolución");
    expect(motivoDeAnulacion("Sin motivo", "se cobró mal")).toBe("se cobró mal");
    expect(motivoDeAnulacion("Sin motivo", "")).toBe("");
  });
});
