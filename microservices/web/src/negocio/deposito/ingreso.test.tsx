/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown; traerPorCodigo: (c: string) => Promise<unknown> } }));
vi.mock("../catalogo", async (original) => ({ ...(await original<typeof import("../catalogo")>()), ...((await import("../../pruebas/catalogo-falso")).moduloDeCatalogo(() => catalogo.actual)) }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../datos/conexion", async (original) => ({ ...(await original<typeof import("../../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));

import { ErrorApi } from "../../datos/conexion";
import { detalleDelRegistro, renglonesDelPedido, useIngreso, type OpcionesDeIngreso, type PedidoAIngresar } from "./ingreso";

// El ingreso de mercadería, probado una sola vez y sin pantalla (010-E05): lo usan igual el
// celular y la computadora.
const cinta = producto({ id: "cinta", descripcion: "CINTA AISLADORA", proveedor: "Tresge", costo_neto: "1000.5", codigo_barras: "7790001112223" });
const pincel = producto({ id: "pincel", descripcion: "PINCEL CINTA", proveedor: "Comodo", costo_neto: null });
const PROVEEDORES = [{ id: "pv-tresge", nombre: "Tresge", activo: true }, { id: "pv-viejo", nombre: "Viejo", activo: false }];
const conComa = (c: number) => String(c).replace(".", ",");

function armar(extra: Partial<OpcionesDeIngreso> = {}) {
  catalogo.actual = catalogoFalso([pincel, cinta]);
  return renderHook(() => useIngreso({ lado: "computadora", costoATexto: conComa, textoSinConexion: "sin conexión", pedido: null, ...extra }));
}
const compras = () => apiFalsa.mock.calls.filter((c) => c[0] === "/compras");

beforeEach(() => {
  apiFalsa.mockReset().mockImplementation(async (ruta: string) => (ruta === "/proveedores" ? PROVEEDORES : { total: 2001, productos_nuevos: 1, costos_actualizados: 1 }));
});

describe("el ingreso de mercadería (010-E05)", () => {
  it("un producto entra con el costo de su lista, y repetido suma a su renglón", () => {
    const { result } = armar();
    act(() => { result.current.agregar(cinta); });
    let segundo = { clave: "", cantidad: 0 };
    act(() => { segundo = result.current.agregar(cinta); });
    expect(result.current.renglones).toHaveLength(1);
    expect(result.current.renglones[0]).toMatchObject({ cantidad: 2, costo: 1000.5, costoLista: 1000.5, costoTexto: "1000,5" });
    expect(segundo.cantidad).toBe(2);
    expect(result.current.total).toBe(2001);
  });

  it("el costo se toma como se tipea, con coma o con punto, y sin costo el renglón queda incompleto", () => {
    const { result } = armar();
    act(() => { result.current.agregar(null, "PRODUCTO NUEVO"); });
    const clave = result.current.renglones[0]!.clave;
    expect(result.current.incompletos).toBe(1);
    act(() => result.current.cambiarCosto(clave, "$ 12,5x"));
    expect(result.current.renglones[0]).toMatchObject({ costoTexto: "12,5", costo: 12.5 });
    expect(result.current.incompletos).toBe(0);
    act(() => result.current.cambiarCosto(clave, ""));
    expect(result.current.renglones[0]!.costo).toBeNull();
  });

  it("dice qué falta, en orden: el proveedor, los productos, los renglones incompletos; y sin eso no registra", async () => {
    const { result } = armar();
    expect(result.current.falta).toBe("proveedor");
    act(() => result.current.setProveedorId("pv-tresge"));
    expect(result.current.falta).toBe("productos");
    act(() => { result.current.agregar(pincel); });
    expect(result.current.falta).toBe("renglones");
    await act(async () => { expect(await result.current.registrar()).toBeNull(); });
    expect(compras()).toHaveLength(0);
  });

  it("busca primero entre los productos del proveedor elegido, que son solo los activos", async () => {
    const { result } = armar();
    await waitFor(() => expect(result.current.proveedores).toEqual([PROVEEDORES[0]]));
    act(() => { result.current.setProveedorId("pv-tresge"); result.current.setConsulta("cinta"); });
    expect(result.current.resultados.map((p) => p.id)).toEqual(["cinta", "pincel"]);
  });

  it("registrar manda la compra, vacía lo cargado y cuenta qué pasó", async () => {
    const { result } = armar();
    act(() => { result.current.setProveedorId("pv-tresge"); result.current.agregar(cinta); result.current.agregar(null, "  PINCEL NUEVO  "); });
    act(() => result.current.cambiarCosto(result.current.renglones[1]!.clave, "800"));
    await waitFor(() => expect(result.current.proveedor?.nombre).toBe("Tresge"));
    let registro: Awaited<ReturnType<typeof result.current.registrar>> = null;
    await act(async () => { registro = await result.current.registrar(); });
    const cuerpo = JSON.parse(compras()[0]![1].body);
    expect(cuerpo).toMatchObject({ proveedor_id: "pv-tresge", comprobante_tipo: "factura", pedido_id: null });
    expect(cuerpo.items).toEqual([{ producto_id: "cinta", descripcion: "CINTA AISLADORA", cantidad: 1, costo_unitario: 1000.5 }, { producto_id: null, descripcion: "PINCEL NUEVO", cantidad: 1, costo_unitario: 800 }]);
    expect(registro).toMatchObject({ total: 2001, proveedor: "Tresge", renglones: 2, costosActualizados: 1, productosNuevos: 1, dePedido: false });
    expect(detalleDelRegistro(registro!)).toBe("2 renglones sumados al stock · 1 costo actualizado según el comprobante · 1 producto nuevo.");
    expect(result.current.renglones).toHaveLength(0);
  });

  it("si la compra ya estaba registrada (un reintento), cuenta que no cambió costos ni productos", async () => {
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/proveedores" ? PROVEEDORES : { id: "c1", total: 1000.5, repetida: true }));
    const { result } = armar();
    act(() => { result.current.setProveedorId("pv-tresge"); result.current.agregar(cinta); });
    await waitFor(() => expect(result.current.proveedor?.nombre).toBe("Tresge"));
    let registro: Awaited<ReturnType<typeof result.current.registrar>> = null;
    await act(async () => { registro = await result.current.registrar(); });
    expect(registro).toMatchObject({ total: 1000.5, costosActualizados: 0, productosNuevos: 0 });
  });

  it("si el servidor no lo acepta o no hay conexión, lo cargado sigue y el motivo se dice", async () => {
    const { result } = armar();
    act(() => { result.current.setProveedorId("pv-tresge"); result.current.agregar(cinta); });
    apiFalsa.mockImplementation(async (ruta: string) => { if (ruta === "/compras") throw new ErrorApi(409, "Esa compra ya está registrada"); return PROVEEDORES; });
    await act(async () => { await result.current.registrar(); });
    expect(result.current.error).toBe("Esa compra ya está registrada");
    apiFalsa.mockImplementation(async (ruta: string) => { if (ruta === "/compras") throw new TypeError("Failed to fetch"); return PROVEEDORES; });
    await act(async () => { await result.current.registrar(); });
    expect(result.current.error).toBe("sin conexión");
    expect(result.current.renglones).toHaveLength(1);
    act(() => result.current.cambiar(result.current.renglones[0]!.clave, { cantidad: 3 }));
    expect(result.current.error).toBeNull();
  });

  it("lo leído con la cámara se agrega si está en el catálogo, y si no avisa que no está", async () => {
    const { result } = armar();
    let agregado: unknown;
    await act(async () => { agregado = await result.current.agregarPorCodigo("7790001112223"); });
    expect(agregado).toMatchObject({ cantidad: 1, producto: { id: "cinta" } });
    await act(async () => { agregado = await result.current.agregarPorCodigo("0000"); });
    expect(agregado).toBeNull();
    expect(result.current.renglones).toHaveLength(1);
  });

  it("con borrador, lo cargado sobrevive a una recarga; descartar lo borra y se puede reponer", () => {
    const primero = armar({ borrador: "prueba.ingreso" });
    act(() => { primero.result.current.setProveedorId("pv-tresge"); primero.result.current.agregar(cinta); });
    primero.unmount();
    const { result } = armar({ borrador: "prueba.ingreso" });
    expect(result.current.proveedorId).toBe("pv-tresge");
    expect(result.current.renglones).toHaveLength(1);
    let habia: ReturnType<typeof result.current.descartar> = [];
    act(() => { habia = result.current.descartar(); });
    expect(localStorage.getItem("prueba.ingreso")).toBeNull();
    act(() => result.current.reponer(habia));
    expect(result.current.renglones).toHaveLength(1);
    // Sin clave de borrador (el celular), nada queda guardado.
    const sin = armar();
    act(() => { sin.result.current.agregar(cinta); });
    expect(Object.keys(localStorage).filter((k) => k !== "prueba.ingreso")).toEqual([]);
  });

  it("el ingreso desde un pedido arranca con su proveedor y solo con lo que falta llegar, al costo de la lista", async () => {
    const pedido: PedidoAIngresar = { id: "p1", proveedor_id: "pv-tresge", items: [
      { producto_id: "cinta", descripcion: "CINTA AISLADORA", cantidad: "10", recibido: "4", costo_estimado: "2480.5" },
      { producto_id: "pincel", descripcion: "PINCEL", cantidad: "2", recibido: "2", costo_estimado: null },
    ] };
    expect(renglonesDelPedido(pedido, [cinta], conComa)[0]).toMatchObject({ descripcion: "CINTA AISLADORA", cantidad: 6, costo: 2480.5, costoLista: 2480.5, costoTexto: "2480,5" });
    const { result } = armar({ pedido });
    // Los productos del pedido se piden al servidor antes de armar los renglones (specs/018).
    await waitFor(() => expect(result.current.proveedorId).toBe("pv-tresge"));
    expect(result.current.renglones).toHaveLength(1);
    act(() => result.current.cambiarCosto(result.current.renglones[0]!.clave, "2500"));
    await act(async () => { expect((await result.current.registrar())?.dePedido).toBe(true); });
    expect(JSON.parse(compras()[0]![1].body).pedido_id).toBe("p1");
  });
});
