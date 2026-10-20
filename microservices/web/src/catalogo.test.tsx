/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";

// El catálogo vive en el servidor (specs/018, RF-122, RF-123): el dispositivo pide solo lo que
// muestra, de a 50, y lo que llega queda en memoria mientras la aplicación está abierta.
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enCola = vi.hoisted(() => ({ cambios: new Map<string, Record<string, unknown>>() }));
const enviar = vi.hoisted(() => vi.fn(async () => ({ encolado: false })));
vi.mock("./api", async (original) => ({ ...(await original<typeof import("./api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
const loBajado = vi.hoisted(() => ({ actual: null as null | { productos: any[]; stock: Map<string, number>; clientes: any[] } }));
vi.mock("./descarga", () => ({ loBajado: async () => loBajado.actual }));
vi.mock("./cola", () => ({ cambiosDeProductosPendientes: async () => enCola.cambios, enviarOEncolar: (...a: unknown[]) => (enviar as any)(...a) }));
import { ErrorApi } from "./api";
import { olvidarTodo, pedirClientes, SIN_CONEXION_PARA_BUSCAR, traerPorCodigo, traerPorIds, useCatalogo, useListaDeProductos } from "./catalogo";

const prod = (id: string, descripcion: string, extra: any = {}) => ({ id, descripcion, marca: "MARCA", codigo_barras: null, unidad: "unidad", margen_elegido: null, proveedor: "P", codigo_proveedor: null, costo_neto: "100", iva: "0.21", fecha_lista: "2026-08-11", lista_importada_id: "l", explicacion_costo: [], ...extra });
const pagina = (productos: any[], extra: any = {}) => ({ productos, stock: {}, hay_mas: false, total: productos.length, ...extra });
const pedidos = () => apiFalsa.mock.calls.map((c) => String(c[0]));
const parametros = (ruta: string) => Object.fromEntries(new URL(ruta, "http://x").searchParams);
const sinRed = () => new TypeError("Failed to fetch");

beforeEach(() => { olvidarTodo(); apiFalsa.mockReset(); enviar.mockClear(); enCola.cambios = new Map(); loBajado.actual = null; });
afterEach(() => { vi.useRealTimers(); });

describe("buscar le pregunta al servidor", () => {
  it("018-E01 018-E03: una consulta cuando se deja de escribir; trae de a 50, en el orden del servidor, con su stock", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    apiFalsa.mockResolvedValue(pagina([prod("m2", "MECHA 8 MM"), prod("m1", "MECHA 10 MM")], { stock: { m2: "4" } }));
    const { result } = renderHook(() => useCatalogo());
    result.current.buscarProductos("mec");
    result.current.buscarProductos("mecha");
    expect(apiFalsa).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(pedidos()).toEqual(["/productos/pagina?buscar=mecha&limite=50"]);
    expect(result.current.buscarProductos("mecha").map((p) => p.id)).toEqual(["m2", "m1"]);
    expect(result.current.stock.get("m2")).toBe(4);
    expect(result.current.stock.get("m1")).toBe(0); // sin movimientos: sin stock
    expect(pedidos()).toHaveLength(1); // la misma búsqueda, recién hecha, no se vuelve a pedir
  });

  it("un cambio guardado (un ajuste de stock, una venta) hace que la próxima búsqueda vuelva a preguntar", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    apiFalsa.mockResolvedValueOnce(pagina([prod("c", "CANDADO")], { stock: { c: "17" } })).mockResolvedValueOnce(pagina([prod("c", "CANDADO")], { stock: { c: "15" } }));
    const { result } = renderHook(() => useCatalogo());
    result.current.buscarProductos("candado");
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(result.current.stock.get("c")).toBe(17);
    window.dispatchEvent(new CustomEvent("ferre:cambio-guardado", { detail: "/stock/c/ajustes" }));
    result.current.buscarProductos("candado");
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(pedidos()).toHaveLength(2);
    expect(result.current.stock.get("c")).toBe(15);
  });

  it("018-E03: en Pedidos e Ingreso el servidor pone primero los del proveedor elegido; se recuerda aparte", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    apiFalsa.mockImplementation(async (ruta: string) => pagina(parametros(ruta).primero ? [prod("b", "MECHA LARGA"), prod("a", "MECHA")] : [prod("a", "MECHA"), prod("b", "MECHA LARGA")]));
    const { result } = renderHook(() => useCatalogo());
    result.current.buscarProductos("mecha", 50, "prov-1");
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(parametros(pedidos()[0]!)).toEqual({ buscar: "mecha", primero: "prov-1", limite: "50" });
    expect(result.current.buscarProductos("mecha", 50, "prov-1").map((p) => p.id)).toEqual(["b", "a"]);
    result.current.buscarProductos("mecha");
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(result.current.buscarProductos("mecha").map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("018-E10: sin conexión, buscar dice que hace falta internet", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    apiFalsa.mockRejectedValue(sinRed());
    const { result } = renderHook(() => useCatalogo());
    result.current.buscarProductos("tornillo");
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(result.current.error).toBe(SIN_CONEXION_PARA_BUSCAR);
    expect(SIN_CONEXION_PARA_BUSCAR).toBe("Sin conexión: para buscar productos hace falta internet.");
  });

  it("018-E04: un código exacto trae solo ese producto, o ninguno; sin conexión lo dice", async () => {
    apiFalsa.mockResolvedValueOnce(pagina([prod("t", "TALADRO", { codigo_barras: "779" })])).mockResolvedValueOnce(pagina([]));
    expect((await traerPorCodigo("779"))?.id).toBe("t");
    expect(parametros(pedidos()[0]!)).toEqual({ codigo: "779", limite: "1" });
    expect(await traerPorCodigo("000")).toBeNull();
    apiFalsa.mockRejectedValueOnce(sinRed());
    await expect(traerPorCodigo("111")).rejects.toThrow(SIN_CONEXION_PARA_BUSCAR);
    apiFalsa.mockRejectedValueOnce(new ErrorApi(401, "Tu sesión venció"));
    await expect(traerPorCodigo("111")).rejects.toThrow("Tu sesión venció");
  });

  it("018-E06: productos puntuales por identificador, solo los que faltan, de a 200", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `p${i}`);
    apiFalsa.mockImplementation(async (ruta: string) => pagina(parametros(ruta).ids!.split(",").map((id) => prod(id, id))));
    await traerPorIds(ids);
    expect(pedidos().map((r) => parametros(r).ids!.split(",").length)).toEqual([200, 50]);
    apiFalsa.mockClear();
    await traerPorIds(["p1", "p2", "nuevo"]);
    expect(pedidos().map((r) => parametros(r).ids)).toEqual(["nuevo"]);
  });

  it("018-E08 018-E12: lo que falta mandar va encima de lo que llega del servidor", async () => {
    enCola.cambios = new Map([["a", { margen_elegido: 50 }]]);
    apiFalsa.mockResolvedValue(pagina([prod("a", "ARANDELA", { margen_elegido: 100 })]));
    await traerPorIds(["a"]);
    const { result } = renderHook(() => useCatalogo());
    expect(result.current.catalogo.find((p) => p.id === "a")?.margen_elegido).toBe(50);
  });

  it("018-E08: un margen cambiado acá se ve enseguida y sale por la cola", async () => {
    apiFalsa.mockResolvedValue(pagina([prod("a", "ARANDELA")]));
    await traerPorIds(["a"]);
    const { result } = renderHook(() => useCatalogo());
    await act(async () => { await result.current.actualizarProducto("a", { margen_elegido: 200 }); });
    expect(result.current.catalogo.find((p) => p.id === "a")?.margen_elegido).toBe(200);
    expect(enviar).toHaveBeenCalledWith("producto.cambio", "PATCH", "/productos/a", { margen_elegido: 200 });
  });
});

describe("la lista de Catálogo y Productos, de a páginas", () => {
  const cincuenta = (desde: number) => Array.from({ length: 50 }, (_, i) => prod(`p${desde + i}`, `PRODUCTO ${desde + i}`));

  it("018-E01 018-E02: los primeros 50 y los siguientes al pedir más; al final, ninguno más", async () => {
    apiFalsa.mockImplementation(async (ruta: string) => (parametros(ruta).desde === "50" ? pagina(cincuenta(50).slice(0, 10), { total: 60 }) : pagina(cincuenta(0), { hay_mas: true, total: 60 })));
    const { result } = renderHook(() => useListaDeProductos({ buscar: "", marca: null, disponibilidad: "todos" }));
    await waitFor(() => expect(result.current.productos).toHaveLength(50));
    expect(result.current).toMatchObject({ hayMas: true, total: 60 });
    act(() => result.current.cargarMas());
    await waitFor(() => expect(result.current.productos).toHaveLength(60));
    expect(result.current.hayMas).toBe(false);
    expect(pedidos().map(parametros)).toEqual([{ desde: "0", limite: "50" }, { desde: "50", limite: "50" }]);
  });

  it("018-E05: la búsqueda, la marca y el stock van al servidor; una consulta nueva empieza de cero", async () => {
    apiFalsa.mockResolvedValue(pagina([prod("b", "BULÓN")]));
    const { result, rerender } = renderHook((c: any) => useListaDeProductos(c), { initialProps: { buscar: "bulon", marca: "Bosch", disponibilidad: "con-stock" } as any });
    await waitFor(() => expect(result.current.productos).toHaveLength(1));
    expect(parametros(pedidos()[0]!)).toEqual({ buscar: "bulon", marca: "Bosch", disponibilidad: "con-stock", desde: "0", limite: "50" });
    apiFalsa.mockResolvedValue(pagina([]));
    rerender({ buscar: "clavo", marca: null, disponibilidad: "todos" });
    await waitFor(() => expect(result.current.productos).toHaveLength(0));
    expect(parametros(pedidos()[1]!)).toEqual({ buscar: "clavo", desde: "0", limite: "50" });
  });

  it("una respuesta que llega tarde, de una consulta vieja, se descarta", async () => {
    let soltarVieja: (v: unknown) => void = () => undefined;
    apiFalsa.mockImplementationOnce(() => new Promise((r) => { soltarVieja = r; })).mockResolvedValueOnce(pagina([prod("n", "NUEVA")]));
    const { result, rerender } = renderHook((c: any) => useListaDeProductos(c), { initialProps: { buscar: "vieja", marca: null, disponibilidad: "todos" } as any });
    rerender({ buscar: "nueva", marca: null, disponibilidad: "todos" });
    await waitFor(() => expect(result.current.productos.map((p) => p.id)).toEqual(["n"]));
    await act(async () => { soltarVieja(pagina([prod("v", "VIEJA")])); });
    expect(result.current.productos.map((p) => p.id)).toEqual(["n"]);
  });

  it("018-E10: sin conexión lo dice y deja reintentar", async () => {
    apiFalsa.mockRejectedValueOnce(sinRed()).mockResolvedValueOnce(pagina([prod("a", "ARANDELA")]));
    const { result } = renderHook(() => useListaDeProductos({ buscar: "", marca: null, disponibilidad: "todos" }));
    await waitFor(() => expect(result.current.error).toBe(SIN_CONEXION_PARA_BUSCAR));
    act(() => result.current.reintentar());
    await waitFor(() => expect(result.current.productos).toHaveLength(1));
  });
});

describe("los clientes", () => {
  it("se piden al abrir Vender y no otra vez en el mismo minuto", async () => {
    apiFalsa.mockResolvedValue([{ id: "c1", nombre: "Constructora" }]);
    pedirClientes(); pedirClientes();
    const { result } = renderHook(() => useCatalogo());
    await waitFor(() => expect(result.current.clientes).toHaveLength(1));
    expect(pedidos()).toEqual(["/clientes"]);
  });
});

describe("sin conexión, con lo bajado a mano (historia 5)", () => {
  beforeEach(() => {
    apiFalsa.mockRejectedValue(sinRed());
    loBajado.actual = {
      productos: [prod("m", "MECHA 8 MM", { codigo_barras: "779", marca: "Bosch" }), prod("t", "TORNILLO", { marca: "Fischer" }), prod("c", "CLAVO", { marca: "bosch" })],
      stock: new Map([["m", 3]]),
      clientes: [{ id: "cl", nombre: "Constructora" }],
    };
  });

  it("018-E26: se busca, se escanea y se piden productos con lo bajado, con su stock", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { result } = renderHook(() => useCatalogo());
    result.current.buscarProductos("mecha");
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(result.current.buscarProductos("mecha").map((p) => p.id)).toEqual(["m"]);
    expect(result.current.error).toBeNull();
    expect(result.current.stock.get("m")).toBe(3);
    expect((await traerPorCodigo("779"))?.id).toBe("m");
    await traerPorIds(["t"]);
    expect(result.current.catalogo.map((p) => p.id).sort()).toEqual(["m", "t"]);
  });

  it("018-E26: la lista, con sus filtros, y los clientes también salen de lo bajado", async () => {
    const { result } = renderHook(() => useListaDeProductos({ buscar: "", marca: "BOSCH", disponibilidad: "todos" }));
    await waitFor(() => expect(result.current.productos.map((p) => p.id)).toEqual(["c", "m"]));
    expect(result.current.error).toBeNull();
    const conStock = renderHook(() => useListaDeProductos({ buscar: "", marca: null, disponibilidad: "con-stock" }));
    await waitFor(() => expect(conStock.result.current.productos.map((p) => p.id)).toEqual(["m"]));
    pedirClientes();
    const { result: cat } = renderHook(() => useCatalogo());
    await waitFor(() => expect(cat.current.clientes).toHaveLength(1));
  });

  it("018-E26: sin conexión se encuentra por el código de cualquiera de sus proveedores", async () => {
    loBajado.actual!.productos.push(prod("a", "ARANDELA", { codigo_proveedor: "A-1", codigos: ["A-1", "OTRO-77"] }));
    expect((await traerPorCodigo("OTRO-77"))?.id).toBe("a");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { result } = renderHook(() => useCatalogo());
    result.current.buscarProductos("otro");
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(result.current.buscarProductos("otro").map((p) => p.id)).toEqual(["a"]);
  });

  it("018-E03: sin conexión, la misma regla y el mismo orden que el servidor: primero las descripciones más cortas", async () => {
    loBajado.actual!.productos.push(prod("ml", "MECHA 8 MM LARGA"), prod("m6", "MECHA 6"));
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { result } = renderHook(() => useCatalogo());
    result.current.buscarProductos("mécha");
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(result.current.buscarProductos("mécha").map((p) => p.id)).toEqual(["m6", "m", "ml"]);
    result.current.buscarProductos("ech");
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(result.current.buscarProductos("ech")).toEqual([]); // el comienzo de una palabra, no el medio
  });

  it("un error del servidor no es falta de conexión: se dice tal cual y no se busca en lo bajado", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    apiFalsa.mockRejectedValue(new ErrorApi(500, "La base no responde"));
    const { result } = renderHook(() => useCatalogo());
    result.current.buscarProductos("mecha");
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(result.current.error).toBe("La base no responde");
    expect(result.current.buscarProductos("mecha")).toEqual([]);
  });

  it("018-E27: con conexión se busca en el servidor aunque haya algo bajado", async () => {
    apiFalsa.mockResolvedValue(pagina([prod("s", "DEL SERVIDOR", { codigo_barras: "779" })]));
    expect((await traerPorCodigo("779"))?.id).toBe("s");
  });
});

