/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { producto } from "../../pruebas/catalogo-falso";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a) }));
vi.mock("../../catalogo", () => ({ traerPorIds: async () => undefined }));
const bajado = vi.hoisted(() => ({ actual: null as any }));
vi.mock("../../descarga", () => ({ loBajado: async () => bajado.actual }));

import { ErrorApi } from "../../api";
import { consultas } from "../../consultas";
import { cantidadContada, nombreDeMovimiento, productosConStock, useCorregirStock, useMovimientos, useStock } from "./inventario";

// El inventario, probado una sola vez y sin pantalla (010-E05).
const cinta = producto({ id: "cinta", descripcion: "CINTA AISLADORA" });
const cable = producto({ id: "cable", descripcion: "CABLE", unidad: "m" });
const fila = (id: string, stock: string) => ({ id, stock, costo_neto: "1000", proveedor: "Tresge", valor: String(Number(stock) * 1000), ultimo_movimiento: null });
const STOCK = { productos: [fila("cinta", "17")], valor_total: 17000, por_proveedor: {} };

beforeEach(() => { bajado.actual = null; consultas.clear(); apiFalsa.mockReset().mockResolvedValue(STOCK); enviarOEncolar.mockClear(); });

describe("el inventario (010-E05)", () => {
  it("trae el stock del servidor y lo deja a mano por producto", async () => {
    const { result } = renderHook(() => useStock());
    await waitFor(() => expect(result.current.datos).not.toBeNull());
    expect(result.current.porId.get("cinta")?.stock).toBe("17");
    expect(result.current.delDispositivo).toBe(false);
    expect(productosConStock([cable, cinta], result.current.porId).map((p) => p.id)).toEqual(["cinta"]);
  });

  it("sin conexión es un error de conexión (el stock no se guarda en el dispositivo, specs/018); si el servidor dice que no, es su mensaje", async () => {
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    const sin = renderHook(() => useStock());
    await waitFor(() => expect(sin.result.current.error).not.toBeNull());
    expect(sin.result.current.error).not.toBeInstanceOf(ErrorApi);
    sin.unmount();
    apiFalsa.mockRejectedValue(new ErrorApi(403, "Hace falta: Contar y corregir stock"));
    const { result } = renderHook(() => useStock());
    act(() => result.current.recargar());
    await waitFor(() => expect(result.current.error).toBeInstanceOf(ErrorApi));
  });

  it("018-E26: sin conexión y sin haberlo visto en la sesión, sale de lo bajado a mano, sin su valor", async () => {
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    bajado.actual = { productos: [{ ...cinta, proveedor: "Tresge" }], stock: new Map([["cinta", 5], ["borrado", 2]]), clientes: [] };
    const { result } = renderHook(() => useStock());
    await waitFor(() => expect(result.current.datos).not.toBeNull());
    expect(result.current.delDispositivo).toBe(true);
    expect(result.current.datos?.productos).toEqual([{ id: "cinta", stock: "5", proveedor: "Tresge", costo_neto: null, valor: "0", ultimo_movimiento: null }]);
  });

  it("los movimientos se piden recién al abrir el producto", async () => {
    apiFalsa.mockResolvedValue([{ id: "m1", tipo: "ajuste", cantidad: "2", referencia_tipo: "conteo", fecha: "2026-10-01", nota: null }]);
    const { result, rerender } = renderHook(({ abierto }) => useMovimientos("cinta", abierto), { initialProps: { abierto: false } });
    expect(apiFalsa).not.toHaveBeenCalled();
    rerender({ abierto: true });
    await waitFor(() => expect(result.current.movimientos).toHaveLength(1));
    expect(apiFalsa).toHaveBeenCalledWith("/stock/cinta/movimientos");
    expect(nombreDeMovimiento(result.current.movimientos![0]!)).toBe("Conteo");
    expect(nombreDeMovimiento({ id: "m", tipo: "venta", cantidad: "-1", referencia_tipo: null, referencia_id: null, fecha: "", nota: null })).toBe("Venta");
  });

  it("«¿cuántas hay?» acepta cero o más, con coma, y los decimales que admite la unidad", () => {
    expect(cantidadContada("15", cinta)).toBe(15);
    expect(cantidadContada("0", cinta)).toBe(0);
    expect(cantidadContada("2,7", cinta)).toBe(2);
    expect(cantidadContada("2,75", cable)).toBe(2.8);
    for (const mal of ["", "  ", "-1", "abc"]) expect(cantidadContada(mal, cinta)).toBeNaN();
  });

  it("corregir pide cuántas hay y el motivo (RF-53), manda el ajuste y vuelve a pedir el stock", async () => {
    const lista = renderHook(() => useStock());
    await waitFor(() => expect(lista.result.current.datos).not.toBeNull());
    const { result } = renderHook(() => useCorregirStock(cinta));
    expect(result.current.faltaEn("", "")).toEqual({ real: true, motivo: true });
    expect(result.current.faltaEn("15", "  ")).toEqual({ real: false, motivo: true });
    expect(result.current.faltaEn("15", "Rotura")).toBeNull();
    apiFalsa.mockClear();
    let hecho: unknown;
    await act(async () => { hecho = await result.current.corregir("15", " Rotura "); });
    expect(enviarOEncolar).toHaveBeenCalledWith("stock.ajuste", "POST", "/stock/cinta/ajustes", { cantidad_real: 15, motivo: "Rotura" });
    expect(hecho).toEqual({ hay: 15, encolado: false });
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/stock"));
  });

  it("una corrección guardada sin conexión no vuelve a pedir el stock", async () => {
    enviarOEncolar.mockResolvedValueOnce({ encolado: true });
    const { result } = renderHook(() => useCorregirStock(cinta));
    let hecho: unknown;
    await act(async () => { hecho = await result.current.corregir("4", "Conteo"); });
    expect(hecho).toEqual({ hay: 4, encolado: true });
    expect(apiFalsa).not.toHaveBeenCalled();
  });
});
