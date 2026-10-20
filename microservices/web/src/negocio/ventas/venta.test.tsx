/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown; traerPorCodigo: (c: string) => Promise<unknown> } }));
vi.mock("../../catalogo", async () => (await import("../../pruebas/catalogo-falso")).moduloDeCatalogo(() => catalogo.actual));
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a), enviarPendientes: async () => 0 }));

import { useVenta, type OpcionesDeVenta } from "./venta";

// La regla de la venta, probada una sola vez y sin pantalla (RNF-60): la usan igual el celular
// y la computadora.
const mecha = producto({ id: "mecha", descripcion: "MECHA 8 MM", costo_neto: "1000", margen_elegido: 100, codigo_barras: "7790001112223" });
const tornillo = producto({ id: "tornillo", descripcion: "TORNILLO", costo_neto: "10", margen_elegido: null });

function armar(extra: Partial<OpcionesDeVenta> = {}) {
  const falso = catalogoFalso([mecha, tornillo]);
  catalogo.actual = falso;
  const cambios: string[] = [];
  const hook = renderHook(() => useVenta({
    lado: "computadora", dispositivo: () => "prueba", fijaMargen: true,
    textoDe: (m) => `falta: ${m}`, textoDeRechazo: (m) => `rechazada: ${m}`,
    alCambiar: (motivo) => { cambios.push(motivo); }, ...extra,
  }));
  return { ...hook, falso, cambios };
}

describe("la venta", () => {
  beforeEach(() => { enviarOEncolar.mockClear(); enviarOEncolar.mockResolvedValue({ encolado: false }); });

  it("agregar dos veces el mismo producto suma la cantidad; el total se redondea para arriba a $1.000 por renglón", () => {
    const { result, cambios } = armar();
    act(() => { result.current.agregar(mecha); result.current.agregar(mecha); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.cantidad).toBe(2);
    // $1.000 de costo + 100 % + IVA 21 % = $2.420, que se cobra $3.000; por dos, $6.000.
    expect(result.current.total).toBe(6000);
    expect(cambios).toEqual(["agregar", "agregar"]);
  });

  it("no se cobra sin precio, sin medio de pago, ni a cuenta corriente sin cliente: dice cuál falta", async () => {
    const faltaCliente = vi.fn();
    const { result } = armar({ alFaltarCliente: faltaCliente });
    act(() => { result.current.agregar(tornillo); });
    expect(result.current.sinPrecio).toBe(true);
    await act(async () => { await result.current.cobrar(); });
    expect(result.current.error).toBe("falta: sin-precio");
    act(() => { result.current.cambiarItem(result.current.items[0]!.clave, { precioManual: 500 }); result.current.elegirMedio("cuenta_corriente"); });
    expect(faltaCliente).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.cobrar(); });
    expect(result.current.error).toBe("falta: sin-cliente");
    expect(enviarOEncolar).not.toHaveBeenCalled();
  });

  it("cobrar manda la venta con el precio, el costo y el margen de cada renglón, descuenta el stock y deja la venta vacía", async () => {
    const cobrado = vi.fn();
    const { result, falso } = armar({ alCobrar: cobrado });
    act(() => { result.current.agregar(mecha); });
    await act(async () => { await result.current.cobrar(); });
    const [tipo, metodo, ruta, cuerpo] = enviarOEncolar.mock.calls[0]!;
    expect([tipo, metodo, ruta]).toEqual(["venta", "POST", "/ventas"]);
    expect(cuerpo).toMatchObject({ medio_pago: "efectivo", cliente_id: null, dispositivo_id: "prueba", items: [{ producto_id: "mecha", cantidad: 1, precio_unitario: 3000, costo_neto: 1000, margen_aplicado: 100 }] });
    expect(falso.ajustarStockLocal).toHaveBeenCalledWith("mecha", -1);
    expect(result.current.items).toEqual([]);
    expect(result.current.cobro).toMatchObject({ total: 3000, encolado: false, medio: "efectivo", productos: 1 });
    expect(cobrado).toHaveBeenCalledTimes(1);
  });

  it("si el servidor rechaza la venta, sigue armada y lo dice con las palabras de la interfaz", async () => {
    const { ErrorApi } = await import("../../api");
    enviarOEncolar.mockRejectedValue(new ErrorApi(409, "Ya estaba registrada"));
    const { result } = armar();
    act(() => { result.current.agregar(mecha); });
    await act(async () => { await result.current.cobrar(); });
    expect(result.current.error).toBe("rechazada: Ya estaba registrada");
    expect(result.current.items).toHaveLength(1);
    expect(result.current.ocupado).toBe(false);
  });

  it("un código de barras conocido agrega el producto; uno desconocido se puede asociar al producto que se elija", async () => {
    const { result, falso } = armar();
    act(() => { result.current.agregarPorCodigo("7790001112223"); });
    expect(result.current.items[0]!.producto?.id).toBe("mecha");
    // Uno que este dispositivo no conoce se le pregunta al servidor (specs/018): no es de nadie.
    await act(async () => { result.current.agregarPorCodigo("7799999999999"); });
    expect(result.current.codigoDesconocido).toBe("7799999999999");
    act(() => { result.current.elegirSugerencia(tornillo); });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { codigo_barras: "7799999999999" });
    expect(result.current.codigoDesconocido).toBeNull();
  });

  it("elegir un margen lo guarda en el producto solo si la persona puede fijar márgenes", () => {
    const con = armar({ fijaMargen: true });
    act(() => { con.result.current.agregar(tornillo); });
    act(() => { con.result.current.elegirMargen(con.result.current.items[0]!, 200); });
    expect(con.falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 200 });
    const sin = armar({ fijaMargen: false });
    act(() => { sin.result.current.agregar(tornillo); });
    act(() => { sin.result.current.elegirMargen(sin.result.current.items[0]!, 200); });
    expect(sin.falso.actualizarProducto).not.toHaveBeenCalled();
    expect(sin.result.current.items[0]!.producto?.margen_elegido).toBe(200);
  });

  it("«no llevó» anota qué preguntó, vacía la venta y deja el aviso", () => {
    const { result } = armar();
    act(() => { result.current.agregar(mecha); });
    act(() => { result.current.noLlevo("anotado"); });
    expect(enviarOEncolar.mock.calls[0]!.slice(0, 3)).toEqual(["consulta", "POST", "/consultas"]);
    expect(result.current.items).toEqual([]);
    expect(result.current.mensaje).toBe("anotado");
  });
});
