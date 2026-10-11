/* eslint-disable @typescript-eslint/no-explicit-any */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";
import { ObservadorFalso } from "../../pruebas/preparar";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
const subirFoto = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<string>>(async () => "/fotos/nueva.jpg"));
const descargar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<void>>(async () => undefined));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), subirFoto: (...a: unknown[]) => subirFoto(...a), descargar: (...a: unknown[]) => descargar(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: vi.fn(async () => ({ encolado: false })), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { ErrorApi } from "../../api";
import { dibujar } from "../pruebas";
import { Productos } from "./Productos";

const PROVEEDORES = [
  { proveedor_id: "pv-barato", proveedor: "Proveedor barato", costo_neto: "900", fecha_lista: "2026-08-20", codigo_proveedor: "B-1" },
  { proveedor_id: "pv-uno", proveedor: "Proveedor uno", costo_neto: "1000", fecha_lista: "2026-09-02", codigo_proveedor: "A-1" },
];

function armar(extra: Record<string, unknown> = {}, camino = "productos") {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA PRUEBA 8 MM", marca: "Bosch", costo_neto: "1000", margen_elegido: 100, codigo_proveedor: "A-1", explicacion_costo: ["Precio de lista: $1.250,00", "Descuento del 20 %"], proveedores: PROVEEDORES }),
    producto({ id: "tornillo", descripcion: "TORNILLO PRUEBA", costo_neto: "10" }),
    producto({ id: "clavo", descripcion: "CLAVO PRUEBA", costo_neto: "1000", margen_elegido: 138, unidad: "kg", foto_url: "/fotos/clavo.jpg" }),
    producto({ id: "raro", descripcion: "RARO PRUEBA SIN COSTO", costo_neto: null, proveedor: null, fecha_lista: null, lista_importada_id: null }),
  ]);
  catalogo.actual = { useCatalogoFalso: () => ({ ...(falso.useCatalogoFalso() as object), ...extra }) };
  dibujar(<Productos />, camino);
  const fila = (texto: string) => screen.getAllByTestId("producto").find((f) => f.textContent?.includes(texto))!;
  const abrir = (texto: string) => { fireEvent.click(fila(texto)); return screen.getByTestId("ficha-producto"); };
  return { falso, fila, abrir, busqueda: () => screen.getByTestId("busqueda") };
}

describe("Productos (v4)", () => {
  beforeEach(() => { vi.restoreAllMocks(); subirFoto.mockClear(); descargar.mockReset(); descargar.mockResolvedValue(undefined); });
  afterEach(() => { vi.useRealTimers(); });

  it("la lista muestra nombre, marca y precio, y cuál está sin precio", () => {
    const { fila } = armar();
    expect(screen.getAllByTestId("producto")).toHaveLength(4);
    expect(fila("MECHA").textContent).toContain("Bosch");
    expect(fila("MECHA").textContent).toContain("$3.000"); // 1000 × 2 × 1,21 = 2420 → 3000
    expect(fila("CLAVO").textContent).toContain("el kilo");
    expect(within(fila("TORNILLO")).getByTestId("sin-precio").textContent).toBe("Sin precio todavía");
  });

  it("buscar filtra al instante y dice cuando no hay nada", () => {
    const { busqueda } = armar();
    fireEvent.change(busqueda(), { target: { value: "mecha" } });
    expect(screen.getAllByTestId("producto")).toHaveLength(1);
    fireEvent.change(busqueda(), { target: { value: "zzzz" } });
    expect(screen.getByTestId("sin-resultados").textContent).toContain("No hay productos con «zzzz»");
    fireEvent.click(screen.getByText("Borrar lo escrito"));
    expect(screen.getAllByTestId("producto")).toHaveLength(4);
  });

  it("con el teclado: las flechas marcan, Enter abre la ficha y Escape borra lo escrito", () => {
    const { busqueda } = armar();
    const filas = () => screen.getAllByTestId("producto");
    expect(filas()[0]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(busqueda(), { key: "ArrowDown" });
    expect(filas()[1]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(busqueda(), { key: "ArrowUp" });
    fireEvent.keyDown(busqueda(), { key: "ArrowUp" });
    expect(filas()[0]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(busqueda(), { key: "Enter" });
    expect(window.location.hash).toBe("#/productos?producto=mecha");
    expect(screen.getByTestId("ficha-producto").textContent).toContain("MECHA PRUEBA 8 MM");
    fireEvent.click(screen.getByTestId("listo"));
    expect(window.location.hash).toBe("#/productos");
    fireEvent.change(busqueda(), { target: { value: "clavo" } });
    fireEvent.keyDown(busqueda(), { key: "Escape" });
    expect((busqueda() as HTMLInputElement).value).toBe("");
  });

  it("muestra de a tandas y trae más al llegar al final", () => {
    const muchos = Array.from({ length: 70 }, (_, i) => producto({ id: `p${i}`, descripcion: `PRODUCTO ${i}` }));
    const falso = catalogoFalso(muchos);
    catalogo.actual = falso;
    dibujar(<Productos />, "productos");
    expect(screen.getAllByTestId("producto")).toHaveLength(30);
    act(() => ObservadorFalso.ultimo!.cruzar());
    expect(screen.getAllByTestId("producto")).toHaveLength(60);
    act(() => ObservadorFalso.ultimo!.cruzar());
    expect(screen.getAllByTestId("producto")).toHaveLength(70);
    expect(screen.queryByTestId("cargar-mas")).toBeNull();
  });

  it("la ficha explica el precio y el costo en pasos", () => {
    const { abrir } = armar();
    const ficha = abrir("MECHA");
    expect(ficha.textContent).toContain("Bosch · código A-1");
    expect(within(ficha).getByTestId("precio").textContent).toBe("$3.000");
    fireEvent.click(within(within(ficha).getByTestId("precio")).getByTestId("explicacion"));
    expect(screen.getByTestId("hoja-explicacion").textContent).toContain("1.000");
    fireEvent.click(within(screen.getByTestId("hoja-explicacion")).getByLabelText("Cerrar"));
    expect(within(ficha).getByTestId("costo").textContent).toContain("según la lista de Proveedor uno");
    fireEvent.click(within(within(ficha).getByTestId("costo")).getByTestId("explicacion"));
    expect(screen.getByTestId("hoja-explicacion").textContent).toContain("Descuento del 20 %");
  });

  it("elegir uno de los cinco márgenes lo guarda en el producto y cambia el precio en el momento", () => {
    const { abrir, falso } = armar();
    const ficha = abrir("TORNILLO");
    expect(within(ficha).getByTestId("sin-precio").textContent).toContain("Elegí el margen");
    fireEvent.click(within(ficha).getByTestId("margen-300"));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 300 });
    expect(within(ficha).getByTestId("precio").textContent).toBe("$1.000");
    expect(within(ficha).getByTestId("guardado").textContent).toBe("Guardado: margen de 300 %");
    expect(within(ficha).getByTestId("margen-300").getAttribute("aria-pressed")).toBe("true");
  });

  it("«otro porcentaje» cambia el precio mientras se escribe y se guarda una sola vez", () => {
    vi.useFakeTimers();
    const { abrir, falso } = armar();
    const ficha = abrir("CLAVO");
    const otro = within(ficha).getByTestId("otro-margen") as HTMLInputElement;
    expect(otro.value).toBe("138"); // el del producto, que no es uno de los cinco
    expect(within(ficha).getByTestId("margen-100").getAttribute("aria-pressed")).toBe("false");
    fireEvent.change(otro, { target: { value: "1" } });
    fireEvent.change(otro, { target: { value: "15" } });
    fireEvent.change(otro, { target: { value: "150" } }); // 1000 × 2,5 × 1,21 = 3025 → 4000
    expect(within(ficha).getByTestId("precio").textContent).toContain("$4.000");
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(800); });
    expect(falso.actualizarProducto).toHaveBeenCalledTimes(1);
    expect(falso.actualizarProducto).toHaveBeenCalledWith("clavo", { margen_elegido: 150 });
    expect(within(ficha).getByTestId("guardado").textContent).toBe("Guardado: margen de 150 %");
    // Elegir uno de los cinco vacía «otro porcentaje».
    fireEvent.click(within(ficha).getByTestId("margen-50"));
    expect(otro.value).toBe("");
    expect(falso.actualizarProducto).toHaveBeenLastCalledWith("clavo", { margen_elegido: 50 });
  });

  it("si se cierra la ficha con un porcentaje recién escrito, se guarda igual", () => {
    const { abrir, falso } = armar();
    const ficha = abrir("TORNILLO");
    fireEvent.change(within(ficha).getByTestId("otro-margen"), { target: { value: "80" } });
    fireEvent.click(screen.getByTestId("listo"));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 80 });
  });

  it("sin conexión el margen queda guardado en el dispositivo y lo dice", async () => {
    const { abrir, falso } = armar();
    falso.actualizarProducto.mockResolvedValueOnce({ encolado: true });
    const ficha = abrir("TORNILLO");
    fireEvent.click(within(ficha).getByTestId("margen-100"));
    await waitFor(() => expect(within(ficha).getByTestId("guardado").textContent).toContain("Se envía cuando vuelva internet"));
  });

  it("si el servidor rechaza el cambio, lo dice en la ficha", async () => {
    const { abrir, falso } = armar();
    falso.actualizarProducto.mockRejectedValueOnce(new ErrorApi(400, "El margen es un porcentaje entero mayor que cero"));
    const ficha = abrir("TORNILLO");
    fireEvent.click(within(ficha).getByTestId("margen-100"));
    await waitFor(() => expect(within(ficha).getByTestId("error-ficha").textContent).toContain("No se pudo guardar el cambio: El margen es un porcentaje entero"));
  });

  it("sin costo no hay márgenes: lo dice", () => {
    const { abrir } = armar();
    const ficha = abrir("RARO");
    expect(within(ficha).getByTestId("sin-costo").textContent).toContain("Sin costo todavía");
    expect(within(ficha).queryByTestId("margen-100")).toBeNull();
    expect(within(ficha).queryByTestId("otros-proveedores")).toBeNull();
  });

  it("muestra quién lo vende, con el más barato primero, y «Usar este» cambia el proveedor", () => {
    const { abrir, falso } = armar();
    const ficha = abrir("MECHA");
    const filas = within(ficha).getAllByTestId("proveedor-de-producto");
    expect(filas).toHaveLength(2);
    expect(filas[0]!.textContent).toContain("Proveedor barato");
    expect(filas[0]!.textContent).toContain("$900,00");
    expect(filas[0]!.textContent).toContain("Lista del 20/08/2026");
    expect(within(filas[0]!).getByTestId("mas-barato")).toBeTruthy();
    expect(within(filas[1]!).getByTestId("en-uso")).toBeTruthy();
    fireEvent.click(within(filas[0]!).getByTestId("usar-este"));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { proveedor_preferido_id: "pv-barato" });
    expect(within(ficha).getByTestId("guardado").textContent).toBe("Guardado: se usa el costo de Proveedor barato");
  });

  it("con un solo proveedor no hay nada que elegir", () => {
    const { abrir } = armar();
    const ficha = abrir("TORNILLO");
    expect(within(ficha).getAllByTestId("proveedor-de-producto")).toHaveLength(1);
    expect(within(ficha).queryByTestId("usar-este")).toBeNull();
    expect(within(ficha).queryByTestId("en-uso")).toBeNull();
  });

  it("baja la planilla de la que salió el costo", async () => {
    const { abrir } = armar();
    const ficha = abrir("MECHA");
    expect(within(ficha).getByTestId("bajar-lista").textContent).toBe("Bajar la planilla de la lista del 11/08/2026");
    fireEvent.click(within(ficha).getByTestId("bajar-lista"));
    expect(descargar).toHaveBeenCalledWith("/listas/lista-1/archivo", "lista Proveedor uno 2026-08-11.xlsx");
    descargar.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fireEvent.click(within(ficha).getByTestId("bajar-lista"));
    await waitFor(() => expect(within(ficha).getByTestId("error-ficha").textContent).toContain("Para bajar la planilla hace falta internet"));
  });

  it("sacar una foto la sube y queda en el producto; con foto se puede ampliar", async () => {
    const { abrir, falso } = armar();
    let ficha = abrir("TORNILLO");
    expect(within(ficha).queryByTestId("ver-foto")).toBeNull();
    expect(within(ficha).getByTestId("sacar-foto").textContent).toBe("Sacar una foto");
    const foto = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(within(ficha).getByTestId("archivo-foto"), { target: { files: [foto] } });
    await waitFor(() => expect(within(ficha).getByTestId("foto-guardada")).toBeTruthy());
    expect(subirFoto).toHaveBeenCalledWith("tornillo", foto);
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { foto_url: "/fotos/nueva.jpg" });
    expect(within(ficha).getByTestId("sacar-foto").textContent).toBe("Sacar otra foto");
    fireEvent.click(within(ficha).getByTestId("ver-foto"));
    expect(screen.getByTestId("hoja-foto").querySelector("img")?.getAttribute("src")).toContain("/fotos/nueva.jpg");
    fireEvent.click(screen.getByText("Cerrar"));
    fireEvent.click(screen.getByTestId("listo"));

    subirFoto.mockRejectedValueOnce(new ErrorApi(413, "La foto pesa más de 10 MB"));
    ficha = abrir("CLAVO");
    fireEvent.change(within(ficha).getByTestId("archivo-foto"), { target: { files: [foto] } });
    await waitFor(() => expect(within(ficha).getByTestId("error-ficha").textContent).toContain("No se pudo guardar la foto: La foto pesa más de 10 MB"));
  });

  it("sin conexión se busca y se cambia el margen, pero la foto y el proveedor piden internet", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { abrir, falso } = armar({ desdeDispositivo: true });
    const ficha = abrir("MECHA");
    expect((within(ficha).getByTestId("usar-este") as HTMLButtonElement).disabled).toBe(true);
    expect((within(ficha).getByTestId("sacar-foto") as HTMLButtonElement).disabled).toBe(true);
    expect(ficha.textContent).toContain("Para cambiar de proveedor hace falta internet");
    expect(ficha.textContent).toContain("Para guardar una foto hace falta internet");
    fireEvent.click(within(ficha).getByTestId("margen-200"));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { margen_elegido: 200 });
  });

  it("la dirección abre la ficha de un producto", () => {
    armar({}, "productos?producto=clavo");
    expect(screen.getByTestId("ficha-producto").textContent).toContain("CLAVO PRUEBA");
  });

  it("mientras baja el catálogo lo dice; si no se pudo, deja reintentar; vacío, manda a cargar una lista", () => {
    catalogo.actual = { useCatalogoFalso: () => ({ catalogo: null, error: null, buscarProductos: () => [], actualizarProducto: vi.fn() }) };
    const vista = dibujar(<Productos />, "productos");
    expect(screen.getByTestId("progreso").textContent).toContain("Bajando el catálogo");
    vista.unmount();

    const pedidos = vi.fn(() => ({ catalogo: null, error: "Sin conexión con el servidor y sin catálogo guardado en este dispositivo: conectá una vez para bajarlo.", buscarProductos: () => [], actualizarProducto: vi.fn() }));
    catalogo.actual = { useCatalogoFalso: pedidos };
    const otra = dibujar(<Productos />, "productos");
    expect(screen.getByTestId("error-de-carga").textContent).toContain("No se pudo bajar el catálogo");
    catalogo.actual = catalogoFalso([producto({ id: "uno", descripcion: "UNO" })]);
    fireEvent.click(screen.getByTestId("reintentar"));
    expect(screen.getAllByTestId("producto")).toHaveLength(1);
    otra.unmount();

    catalogo.actual = catalogoFalso([]);
    dibujar(<Productos />, "productos");
    expect(screen.getByTestId("sin-productos").textContent).toContain("Todavía no hay productos");
    fireEvent.click(screen.getByText("Cargar una lista de precios"));
    expect(window.location.hash).toBe("#/listas");
  });

  it("si el catálogo no se pudo actualizar, avisa y sigue con el del dispositivo", () => {
    armar({ error: "Error 500" });
    expect(screen.getByTestId("error-catalogo").textContent).toContain("Se usa el que está guardado en este dispositivo");
    expect(screen.getAllByTestId("producto")).toHaveLength(4);
  });
});
