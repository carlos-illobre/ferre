/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

// Lo que la ficha del producto (specs/016) toma del negocio: la cuenta del precio, la última
// lectura del código, el archivo de origen y la hora de la lectura que viaja con el código.
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enviar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>(async () => ({ encolado: false })));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", async (original) => ({ ...(await original<typeof import("../../cola")>()), enviarOEncolar: (...a: unknown[]) => enviar(...a) }));
vi.unmock("../../catalogo");
import { cuentaDelPrecio, olvidarOrigenes, ultimaLectura, useOrigenDeLista } from "./ficha";
import { ErrorApi } from "../../api";
import { copiarTexto } from "../../plataforma/portapapeles/copiar";

describe("«Así se calcula» (RF-114)", () => {
  it("016-E18: costo + margen + IVA = precio con IVA, y se cobra redondeado para arriba a $1.000", () => {
    const c = cuentaDelPrecio({ costo_neto: "420", iva: "0.21", margen_elegido: 200 });
    expect(c).toMatchObject({ falta: null, costo: 420, margen: 200, margenPesos: 840, iva: 0.21, cobra: 2000 });
    if (c.falta === null) { expect(c.ivaPesos).toBeCloseTo(264.6, 6); expect(c.conIva).toBeCloseTo(1524.6, 6); }
  });
  it("016-E19: con otro margen, otra cuenta (la misma regla que el precio)", () => {
    expect(cuentaDelPrecio({ costo_neto: "420", iva: "0.21", margen_elegido: 100 })).toMatchObject({ margenPesos: 420, cobra: 2000 });
    expect(cuentaDelPrecio({ costo_neto: "1500", iva: "0.21", margen_elegido: 100 })).toMatchObject({ cobra: 4000 }); // 3.630 → 4.000
  });
  it("016-E20: sin costo o sin margen, dice qué falta en lugar de una cuenta", () => {
    expect(cuentaDelPrecio({ costo_neto: null, iva: "0.21", margen_elegido: 100 })).toEqual({ falta: "costo" });
    expect(cuentaDelPrecio({ costo_neto: "420", iva: "0.21", margen_elegido: null })).toEqual({ falta: "margen" });
  });
});

describe("la última lectura del código (RF-112)", () => {
  it("016-E10: con fecha y hora, como las lee el empleado", () => {
    const d = new Date(2026, 9, 13, 10, 24); // hora del dispositivo
    expect(ultimaLectura(d.toISOString())).toBe("13/10/2026 · 10:24");
  });
  it("016-E11: sin dato, no inventa una fecha", () => {
    expect(ultimaLectura(null)).toBeNull();
    expect(ultimaLectura(undefined)).toBeNull();
    expect(ultimaLectura("no es una fecha")).toBeNull();
  });
  it("016-E09: cargar el código manda la hora de la lectura; borrarlo, no", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-13T13:24:00.000Z"), toFake: ["Date"] });
    try {
      const { useCatalogo } = await import("../../catalogo");
      const { result } = renderHook(() => useCatalogo());
      await result.current.actualizarProducto("p-1", { codigo_barras: "7791234000004" });
      expect(enviar).toHaveBeenLastCalledWith("producto.cambio", "PATCH", "/productos/p-1", { codigo_barras: "7791234000004", codigo_leido_en: "2026-10-13T13:24:00.000Z" });
      await result.current.actualizarProducto("p-1", { codigo_barras: null });
      expect(enviar).toHaveBeenLastCalledWith("producto.cambio", "PATCH", "/productos/p-1", { codigo_barras: null });
      await result.current.actualizarProducto("p-1", { margen_elegido: 100 });
      expect(enviar).toHaveBeenLastCalledWith("producto.cambio", "PATCH", "/productos/p-1", { margen_elegido: 100 });
    } finally { vi.useRealTimers(); }
  });
});

describe("un código que el servidor rechaza (E12)", () => {
  it("016-E12: no queda cargado: vuelven el código y la última lectura de antes", async () => {
    const VIEJA = "2026-10-01T10:00:00.000Z";
    const P = { id: "p-9", descripcion: "MECHA 6 MM", marca: null, codigo_barras: "7790000000001", codigo_leido_en: VIEJA, unidad: "unidad", margen_elegido: 100, proveedor: "Uno", codigo_proveedor: "C9", costo_neto: "100", iva: "0.21", fecha_lista: "2026-08-01", explicacion_costo: [] };
    apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string) => (String(ruta).startsWith("/productos/pagina") ? { productos: [P], stock: {}, hay_mas: false, total: 1 } : []));
    vi.resetModules();
    const { traerPorIds, useCatalogo } = await import("../../catalogo");
    const { result } = renderHook(() => useCatalogo());
    await act(async () => { await traerPorIds(["p-9"]); });
    expect(result.current.catalogo.find((p) => p.id === "p-9")).toBeTruthy();
    enviar.mockRejectedValueOnce(new ErrorApi(400, "El código de barras tiene que tener entre 4 y 32 letras o números"));
    await result.current.actualizarProducto("p-9", { codigo_barras: "7799999999999" }).catch(() => undefined);
    await waitFor(() => expect(result.current.catalogo?.find((p) => p.id === "p-9")).toMatchObject({ codigo_barras: "7790000000001", codigo_leido_en: VIEJA }));
  });
});

describe("el archivo de origen (RF-115)", () => {
  const ORIGEN = { id: "l-0", archivo_nombre: "lista_comodo_05-09-2026.xlsx", proveedor: "Comodo", fecha_lista: "2026-09-05", productos: 7096 };
  beforeEach(() => { apiFalsa.mockReset(); olvidarOrigenes(); });

  it("016-E22: lo pide al servidor y lo recuerda: otra ficha de la misma lista no vuelve a pedirlo", async () => {
    apiFalsa.mockResolvedValue(ORIGEN);
    const uno = renderHook(() => useOrigenDeLista("l-0", true));
    await waitFor(() => expect(uno.result.current).toEqual({ estado: "listo", origen: ORIGEN }));
    expect(apiFalsa).toHaveBeenCalledWith("/listas/l-0/origen");
    const dos = renderHook(() => useOrigenDeLista("l-0", true));
    expect(dos.result.current).toEqual({ estado: "listo", origen: ORIGEN });
    expect(apiFalsa.mock.calls.filter(([ruta]) => String(ruta).endsWith("/origen"))).toHaveLength(1);
  });
  it("016-E21 016-E24: sin permiso de ver costos o sin lista, no pide nada", () => {
    expect(renderHook(() => useOrigenDeLista("l-0", false)).result.current).toBeNull();
    expect(renderHook(() => useOrigenDeLista(null, true)).result.current).toBeNull();
    expect(apiFalsa.mock.calls.filter(([ruta]) => String(ruta).endsWith("/origen"))).toHaveLength(0);
  });
  it("016-E22: sin conexión lo dice; una lista que ya no está, también", async () => {
    apiFalsa.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const sin = renderHook(() => useOrigenDeLista("l-1", true));
    await waitFor(() => expect(sin.result.current).toEqual({ estado: "sin-conexion" }));
    apiFalsa.mockRejectedValueOnce(new ErrorApi(404, "No existe esa lista"));
    const no = renderHook(() => useOrigenDeLista("l-2", true));
    await waitFor(() => expect(no.result.current).toEqual({ estado: "no-esta" }));
  });
});

describe("copiar el código (RF-112)", () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it("016-E07: copia el texto; si el navegador no deja, dice que no", async () => {
    const escribir = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText: escribir } });
    expect(await copiarTexto("7791234000004")).toBe(true);
    expect(escribir).toHaveBeenCalledWith("7791234000004");
    vi.stubGlobal("navigator", { clipboard: { writeText: async () => { throw new Error("NotAllowedError"); } } });
    expect(await copiarTexto("7791234000004")).toBe(false);
    vi.stubGlobal("navigator", {});
    expect(await copiarTexto("7791234000004")).toBe(false);
  });
});
