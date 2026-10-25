/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../pruebas/sesion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

// El Catálogo para vender en el celular (specs/015-catalogo-para-vender, maqueta B): el stock de
// cada producto, «Agregar» a la venta, el aviso, el número en Vender y los filtros.
const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown; traerPorCodigo: (c: string) => Promise<unknown> } }));
vi.mock("../../negocio/catalogo", async (original) => ({ ...(await original<typeof import("../../negocio/catalogo")>()), ...((await import("../../pruebas/catalogo-falso")).moduloDeCatalogo(() => catalogo.actual)) }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>(async () => []));
vi.mock("../../datos/conexion", async (original) => ({ ...(await original<typeof import("../../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { Catalogo } from "./Catalogo";
import { ParteVender } from "./ventas/ParteVender";
import { App } from "./App";
import { agregarALaVenta, vaciarVenta, ventaActual } from "../../negocio/ventas/venta-en-curso";
import { TEXTOS } from "../textos";

const MECHA = producto({ id: "mecha", descripcion: "Mecha para madera 6 mm", marca: "Bosch", costo_neto: "1500", margen_elegido: 100 });
const CLAVO = producto({ id: "clavo", descripcion: "Clavo punta París 2 pulgadas", marca: "Erpa", unidad: "kg", costo_neto: "3890", margen_elegido: 100 });
const CINTA = producto({ id: "cinta", descripcion: "Cinta aisladora negra 20 m", marca: "3M", costo_neto: "420", margen_elegido: 200 });
const CINTA2 = producto({ id: "cinta2", descripcion: "Cinta de papel 24 mm", marca: "3m", costo_neto: "300", margen_elegido: null });

function armar() {
  const falso = catalogoFalso([MECHA, CLAVO, CINTA, CINTA2].map((p) => ({ ...p })));
  falso.stock.set("mecha", 12); falso.stock.set("clavo", 3.5); falso.stock.set("cinta", 0);
  catalogo.actual = falso;
  const r = render(<Catalogo sub={null} />);
  return { ...r, falso };
}
const tarjeta = (texto: string) => screen.getAllByTestId("producto").find((f) => f.textContent?.toLowerCase().includes(texto.toLowerCase()))!.parentElement!;

describe("Catálogo para vender · celular", () => {
  beforeEach(() => { vi.useRealTimers(); apiFalsa.mockClear(); });

  it("015-E01 015-E02 015-E03 015-E04: cada producto dice su stock con su unidad, o «Sin stock»; ninguno dice «Stock bajo»", () => {
    armar();
    expect(within(tarjeta("mecha")).getByTestId("stock").textContent).toBe("12 un. en stock");
    expect(within(tarjeta("clavo")).getByTestId("stock").textContent).toBe("3,5 kg en stock");
    const sin = within(tarjeta("aisladora")).getByTestId("stock");
    expect(sin.textContent).toBe("Sin stock");
    expect(sin.className).toContain("no"); // distinto a la vista de los que tienen
    expect(within(tarjeta("papel")).getByTestId("stock").textContent).toBe("Sin stock"); // nunca cargado
    expect(document.body.textContent).not.toContain("Stock bajo");
  });

  it("015-E06 015-E14: «Agregar» deja el producto en la venta con cantidad 1, avisa y se sigue en el Catálogo con la misma búsqueda", () => {
    armar();
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "mecha" } });
    fireEvent.click(within(tarjeta("mecha")).getByTestId("agregar"));
    expect(ventaActual().items).toEqual([expect.objectContaining({ descripcion: "Mecha para madera 6 mm", cantidad: 1 })]);
    expect(screen.getByTestId("agregado").textContent).toContain("Agregado a la venta: Mecha para madera 6 mm");
    expect((screen.getByTestId("busqueda") as HTMLInputElement).value).toBe("mecha");
    expect(location.hash).not.toContain("vender");
  });

  it("015-E07: agregar otra vez suma 1 al mismo renglón", () => {
    armar();
    fireEvent.click(within(tarjeta("mecha")).getByTestId("agregar"));
    fireEvent.click(within(tarjeta("mecha")).getByTestId("agregar"));
    expect(ventaActual().items).toHaveLength(1);
    expect(ventaActual().items[0]!.cantidad).toBe(2);
  });

  it("015-E10 015-E11 015-E13: sin precio o sin stock entra igual, y agregar no necesita internet", () => {
    armar();
    apiFalsa.mockClear(); // al abrir, la pantalla pide cuántos hay sin precio; agregar no pide nada
    fireEvent.click(within(tarjeta("papel")).getByTestId("agregar")); // sin margen: sin precio
    fireEvent.click(within(tarjeta("aisladora")).getByTestId("agregar")); // sin stock
    expect(ventaActual().items.map((it) => it.descripcion)).toEqual(["Cinta de papel 24 mm", "Cinta aisladora negra 20 m"]);
    expect(ventaActual().items[0]!.abierto).toBe(true); // sin precio: el renglón abre los márgenes, como en Vender
    expect(apiFalsa).not.toHaveBeenCalled();
  });

  it("015-E12: sin permiso de vender no hay «Agregar»", () => {
    conPermisos("catalogo.margenes");
    armar();
    expect(screen.queryAllByTestId("agregar")).toHaveLength(0);
  });

  it("015-E15 015-E16 015-E18 015-E19: los filtros se abren desde un botón; con stock deja solo los que tienen, y el botón dice cuántos hay puestos", () => {
    armar();
    expect(screen.queryByTestId("hoja-filtros")).toBeNull(); // sin lugar fijo arriba de la lista
    fireEvent.click(screen.getByTestId("filtros"));
    fireEvent.click(screen.getByTestId("disponibilidad-con-stock"));
    expect(screen.getByTestId("ver-productos").textContent).toBe("Ver 2 productos");
    fireEvent.click(screen.getByTestId("ver-productos"));
    expect(screen.getAllByTestId("producto").map((f) => f.textContent?.toLowerCase())).toEqual([expect.stringContaining("clavo"), expect.stringContaining("mecha")]); // en orden alfabético, como llegan del servidor
    expect(screen.getByTestId("cuantos-filtros").textContent).toBe("1");
    expect(screen.getByTestId("con-filtros").textContent).toContain("2 productos con filtros");
    fireEvent.click(screen.getByTestId("sacar-filtros")); // de un toque
    expect(screen.getAllByTestId("producto")).toHaveLength(4);
    expect(screen.queryByTestId("cuantos-filtros")).toBeNull();
  });

  it("015-E17 015-E28: una marca, sin repetir la misma con otras mayúsculas", () => {
    armar();
    fireEvent.click(screen.getByTestId("filtros"));
    expect(screen.getAllByTestId("marca").map((b) => b.textContent)).toEqual(["Todas las marcas", "3M", "Bosch", "Erpa"]);
    fireEvent.click(screen.getAllByTestId("marca")[1]!);
    fireEvent.click(screen.getByTestId("ver-productos"));
    expect(screen.getAllByTestId("producto").map((f) => f.textContent?.toLowerCase())).toEqual([expect.stringContaining("aisladora"), expect.stringContaining("papel")]);
  });

  it("015-E18 015-E20: la búsqueda y los filtros juntos; si no queda nada, lo dice y ofrece sacarlos", async () => {
    armar();
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "cinta" } });
    await waitFor(() => expect(screen.getAllByTestId("producto")).toHaveLength(2));
    fireEvent.click(screen.getByTestId("filtros"));
    fireEvent.click(screen.getByTestId("disponibilidad-con-stock"));
    expect(screen.getByTestId("ver-productos").textContent).toBe(TEXTOS.catalogo.sinProductosConFiltros.corto);
    fireEvent.click(screen.getByTestId("ver-productos"));
    const vacio = screen.getByTestId("sin-resultados");
    expect(vacio.textContent).toContain("No hay productos con esos filtros.");
    fireEvent.click(within(vacio).getByRole("button", { name: "Sacar filtros" }));
    expect(screen.getAllByTestId("producto")).toHaveLength(2);
  });

  it("015-E29: las marcas para elegir son las de lo encontrado, no las de todo lo que trajo la memoria", async () => {
    armar(); // buscando en el servidor, la memoria junta lo de búsquedas anteriores: acá, todo el catálogo
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "cinta" } });
    await waitFor(() => expect(screen.getAllByTestId("producto")).toHaveLength(2));
    fireEvent.click(screen.getByTestId("filtros"));
    expect(screen.getAllByTestId("marca").map((b) => b.textContent)).toEqual(["Todas las marcas", "3M"]);
  });

  it("015-E18: con más productos de los que entran de una vez, dice cuántos son", () => {
    const muchos = Array.from({ length: 45 }, (_, i) => producto({ id: `tornillo-${i}`, descripcion: `Tornillo ${i}`, marca: "Fischer" }));
    const falso = catalogoFalso([...muchos, { ...CINTA }]);
    muchos.forEach((p) => falso.stock.set(p.id, 10));
    catalogo.actual = falso;
    render(<Catalogo sub={null} />);
    fireEvent.click(screen.getByTestId("filtros"));
    fireEvent.click(screen.getByTestId("disponibilidad-con-stock"));
    expect(screen.getByTestId("ver-productos").textContent).toBe("Ver 45 productos");
    fireEvent.click(screen.getByTestId("ver-productos"));
    expect(screen.getByTestId("con-filtros").textContent).toContain("45 productos con filtros");
    expect(screen.getAllByTestId("producto")).toHaveLength(45); // llegan de a 50 (specs/018)
  });

  it("015-E08: lo agregado desde el Catálogo está en Vender, con su precio", () => {
    const { unmount } = armar();
    fireEvent.click(within(tarjeta("mecha")).getByTestId("agregar"));
    unmount();
    render(<ParteVender sub={null} />);
    expect(document.body.textContent).toContain("Mecha para madera 6 mm");
    expect(document.body.textContent).toContain("$4.000"); // 1.500 × 2 × 1,21 = 3.630 → $4.000
  });

  it("015-E23: escribir una marca encuentra sus productos", async () => {
    armar();
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "bosch" } });
    await waitFor(() => expect(screen.getAllByTestId("producto").map((f) => f.textContent?.toLowerCase())).toEqual([expect.stringContaining("mecha")]));
  });

  it("015-E24: el menú muestra en Vender cuántos renglones lleva la venta, y nada sin venta", () => {
    catalogo.actual = catalogoFalso([{ ...MECHA }, { ...CINTA }]);
    location.hash = "#/catalogo";
    render(<App />);
    expect(screen.queryByTestId("cuenta-venta")).toBeNull();
    act(() => { agregarALaVenta(MECHA); agregarALaVenta(CINTA); agregarALaVenta(MECHA); });
    expect(within(screen.getByTestId("menu-vender")).getByTestId("cuenta-venta").textContent).toBe("2");
    act(() => { vaciarVenta(); });
    expect(screen.queryByTestId("cuenta-venta")).toBeNull();
  });

  it("015-E22: el buscador dice qué busca, resumido en el celular", () => {
    armar();
    expect(screen.getByTestId("busqueda").getAttribute("placeholder")).toBe("Producto, código o marca");
  });

  it("015-E21: las pestañas del celular miden al menos 44 px de alto", () => {
    const tema = readFileSync(`${process.cwd()}/src/pantallas/celular/tema.css`, "utf8");
    expect(tema).toMatch(/\.segmentos\.con-icono button \{ min-height: 44px; \}/);
  });
});
