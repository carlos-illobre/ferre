/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { precioDeVenta } from "../precios/vista-previa";
import { producto } from "../../pruebas/catalogo-falso";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));

import { ErrorApi } from "../../api";
import { aplicarLista, cargarLista, fraccionAplicada, pendientes, retomar, ultimaAplicada, useFilasDeLista, useListas, variacion, type Cargada, type ListaFila } from "./listas";
import { altaDeProveedor, faltaEnProveedor, useProveedoresActivos } from "../proveedores";
import { margenAMano, otroMargen, precioDelProducto } from "./precio";

// Las listas de precios, los proveedores y el precio de un producto, probados una sola vez y sin pantalla (010-E05).
const resumen = { leidas: 3, salteadas: 0, nuevos: 1, modificados: 1, sin_cambio: 1, dados_de_baja: 0, variacion_promedio: 5 };
const lista = (id: string, proveedor_id: string, estado: string): ListaFila => ({ id, archivo_nombre: `${id}.xlsx`, fecha_lista: "2026-10-01", estado, resumen, avisos: [], importada_en: null, creado_en: "2026-10-01", proveedor_id, proveedor: proveedor_id });
const PROVEEDORES = [{ id: "tresge", nombre: "Tresge", activo: true }, { id: "viejo", nombre: "Viejo", activo: false }];
const cargada: Cargada = { id: "l1", proveedor: "Tresge", fecha_lista: "2026-10-01", resumen, avisos: [], salteadas: [] };
const fila = (n: number) => ({ codigo_proveedor: `C${n}`, descripcion: `P${n}`, marca: null, costo_neto: "110", costo_anterior: "100", explicacion: [] });

beforeEach(() => { apiFalsa.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

describe("las listas de precios (010-E05)", () => {
  it("trae proveedores e historial; separa las pendientes y la última aplicada de cada proveedor", async () => {
    const historial = [lista("nueva", "tresge", "pendiente"), lista("vigente", "tresge", "aplicada"), lista("vieja", "tresge", "aplicada")];
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/proveedores" ? PROVEEDORES : historial));
    const { result } = renderHook(() => useListas());
    await waitFor(() => expect(result.current.historial).toHaveLength(3));
    await waitFor(() => expect(result.current.proveedores).toHaveLength(2));
    expect(pendientes(historial).map((l) => l.id)).toEqual(["nueva"]);
    expect(ultimaAplicada(historial).get("tresge")?.id).toBe("vigente");
    expect(retomar(historial[0]!)).toMatchObject({ id: "nueva", salteadas: [] });
    const activos = renderHook(() => useProveedoresActivos());
    await waitFor(() => expect(activos.result.current?.map((p) => p.id)).toEqual(["tresge"]));
  });

  it("si al cargar falta saber el proveedor o la fecha, lo dice para preguntarlo; otro rechazo, rechaza", async () => {
    const archivo = new File(["x"], "lista.xlsx");
    apiFalsa.mockRejectedValueOnce(new ErrorApi(422, "No sé de qué proveedor es esta lista"));
    expect(await cargarLista(archivo)).toEqual({ falta: "proveedor" });
    apiFalsa.mockRejectedValueOnce(new ErrorApi(422, "Falta la fecha de la lista"));
    expect(await cargarLista(archivo, { proveedor_id: "tresge" })).toEqual({ falta: "fecha" });
    expect((apiFalsa.mock.calls[1]![1].body as FormData).get("proveedor_id")).toBe("tresge");
    apiFalsa.mockResolvedValueOnce(cargada);
    expect(await cargarLista(archivo)).toEqual({ cargada });
    apiFalsa.mockRejectedValueOnce(new ErrorApi(400, "La planilla está vacía"));
    await expect(cargarLista(archivo)).rejects.toThrow("La planilla está vacía");
  });

  it("la vista previa llega por tandas hasta completar el total", async () => {
    apiFalsa.mockImplementation(async (ruta: string) => (ruta.includes("desde=2") ? { total: 3, filas: [fila(3)] } : { total: 3, filas: [fila(1), fila(2)] }));
    const { result } = renderHook(() => useFilasDeLista("l1"));
    await waitFor(() => expect(result.current.filas).toHaveLength(2));
    expect(result.current.total).toBe(3);
    act(() => result.current.traerMas());
    await waitFor(() => expect(result.current.filas).toHaveLength(3));
    expect(apiFalsa).toHaveBeenLastCalledWith("/listas/l1/filas?desde=2");
    expect(variacion(fila(1))).toBeCloseTo(10);
    expect(variacion({ ...fila(1), costo_anterior: null })).toBeNull();
  });

  it("aplicar sigue el avance del servidor hasta que termina, o avisa si se interrumpió", async () => {
    vi.useFakeTimers();
    const avances: unknown[] = [];
    apiFalsa.mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ estado: "aplicando", resumen: { ...resumen, progreso: { procesadas: 2, total: null } } })
      .mockResolvedValueOnce({ estado: "aplicada", resumen });
    const fin = aplicarLista(cargada, (a) => avances.push(a));
    await vi.runAllTimersAsync();
    expect(await fin).toEqual({ aplicada: resumen });
    expect(avances).toEqual([{ procesadas: 0, total: 3 }, { procesadas: 2, total: 3, etapa: undefined }]);
    apiFalsa.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ estado: "pendiente", resumen: { ...resumen, error: "Se cortó" } });
    const corte = aplicarLista(cargada, () => undefined);
    await vi.runAllTimersAsync();
    expect(await corte).toEqual({ interrumpida: "Se cortó" });
    expect(fraccionAplicada({ procesadas: 3, total: 3 }, 3)).toBeCloseTo(0.9);
    expect(fraccionAplicada({ procesadas: 0, total: null, etapa: "duplicados" }, 3)).toBe(0.95);
    expect(fraccionAplicada(null, 3)).toBe(0);
  });

  it("un proveedor nuevo necesita nombre y descuentos de 0 a 100 %, con coma o con punto", async () => {
    const base = { nombre: " Tresge ", lector: null, preciosIncluyenIva: true, descuentoGeneral: "10,5", descuentoContado: "" };
    expect(faltaEnProveedor({ ...base, nombre: "  " })?.campo).toBe("nombre");
    expect(faltaEnProveedor({ ...base, descuentoGeneral: "150" })?.campo).toBe("general");
    expect(faltaEnProveedor({ ...base, descuentoContado: "-1" })?.campo).toBe("contado");
    expect(faltaEnProveedor(base)).toBeNull();
    apiFalsa.mockResolvedValue({});
    await altaDeProveedor(base);
    expect(JSON.parse(apiFalsa.mock.calls[0]![1].body)).toEqual({ nombre: "Tresge", lector: null, precios_incluyen_iva: true, descuento_general: 0.105, descuento_contado: 0 });
  });
});

describe("el precio de un producto (010-E05)", () => {
  // El cálculo (con su redondeo) es el de la librería de precios; acá se prueba qué se le pasa.
  it("costo × margen × IVA; sin costo o sin margen no hay precio", () => {
    expect(precioDelProducto(producto({ id: "a", descripcion: "A", costo_neto: "1000", margen_elegido: 100, iva: "0.21" })).valor).toBe(precioDeVenta({ costoNeto: 1000, margen: 100, iva: 0.21 }).valor);
    expect(precioDelProducto(producto({ id: "b", descripcion: "B", costo_neto: "1000", margen_elegido: null })).valor).toBeNull();
    expect(precioDelProducto(producto({ id: "c", descripcion: "C", costo_neto: null, margen_elegido: 100 })).valor).toBeNull();
    expect(precioDelProducto(producto({ id: "d", descripcion: "D", costo_neto: "1000", margen_elegido: 100, iva: null })).iva).toBe(0.21);
  });

  it("usa el precio que calculó el servidor, y la vista previa solo si cambió el margen acá (010-E06)", () => {
    const delServidor = producto({ id: "a", descripcion: "A", costo_neto: "1000", margen_elegido: 100, precio: 9999, explicacion_precio: ["del servidor"], margen_del_precio: 100 });
    expect(precioDelProducto(delServidor)).toMatchObject({ valor: 9999, delServidor: true, calculo: { pasos: ["del servidor"] } });
    const recienCambiado = { ...delServidor, margen_elegido: 50 };
    expect(precioDelProducto(recienCambiado)).toMatchObject({ valor: precioDeVenta({ costoNeto: 1000, margen: 50, iva: 0.21 }).valor, delServidor: false });
  });

  it("el margen a mano es el que no está en los cinco botones, y se tipea entero y mayor que cero", () => {
    expect(margenAMano(producto({ id: "a", descripcion: "A", margen_elegido: 100 }))).toBeNull();
    expect(margenAMano(producto({ id: "a", descripcion: "A", margen_elegido: 120 }))).toBe(120);
    expect(otroMargen("120")).toBe(120);
    expect(otroMargen(" 33.6 ")).toBe(34);
    for (const mal of ["", "0", "-5", "abc"]) expect(otroMargen(mal)).toBeNull();
  });
});
