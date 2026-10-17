/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../../../pruebas/sesion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../../../pruebas/catalogo-falso";

// El Catálogo para vender en la computadora (specs/015-catalogo-para-vender): la columna Stock,
// «Agregar» debajo del precio, la tecla «+», el buscador largo y el panel de filtros con Esc.
const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso(), traerPorCodigo: async () => null, traerPorIds: async () => undefined }));
vi.mock("../../../../api", async (original) => ({ ...(await original<typeof import("../../../../api")>()), api: async () => [] }));
import { Productos } from "./Productos";
import { ventaActual } from "../../../../negocio/ventas/venta-en-curso";

function armar(otros: ReturnType<typeof producto>[] = []) {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "Mecha para madera 6 mm", marca: "Bosch", costo_neto: "1500", margen_elegido: 100 }),
    producto({ id: "cinta", descripcion: "Cinta aisladora negra 20 m", marca: "3M", costo_neto: "420", margen_elegido: 200 }),
    ...otros,
  ]);
  falso.stock.set("mecha", 12);
  catalogo.actual = falso;
  render(<Productos />);
  return falso;
}
const fila = (texto: string) => screen.getAllByTestId("producto").find((f) => f.textContent?.includes(texto))!;

describe("Catálogo para vender · computadora", () => {
  beforeEach(() => { conPermisos("ventas.registrar", "catalogo.margenes"); });

  it("015-E01 015-E03: la columna Stock dice la cantidad con su unidad, o «Sin stock»", () => {
    armar();
    expect(within(fila("Mecha")).getByTestId("stock").textContent).toBe("12 un.");
    expect(within(fila("Cinta")).getByTestId("stock").textContent).toBe("Sin stock");
  });

  it("015-E06: «Agregar», debajo del precio, deja el producto en la venta y lo avisa", () => {
    armar();
    fireEvent.click(within(fila("Mecha")).getByTestId("agregar"));
    expect(ventaActual().items).toEqual([expect.objectContaining({ descripcion: "Mecha para madera 6 mm", cantidad: 1 })]);
    expect(screen.getByTestId("agregado").textContent).toContain("Agregado a la venta: Mecha para madera 6 mm");
  });

  it("015-E27: «+» agrega el elegido; la línea de atajos lo dice", () => {
    armar();
    expect(document.body.textContent).toContain("agrega el elegido a la venta");
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "+" });
    expect(ventaActual().items.map((it) => it.descripcion)).toEqual(["Cinta aisladora negra 20 m"]);
  });

  it("015-E27: «+» no agrega con Ctrl, Cmd o Alt (Ctrl y «+» agranda la página)", () => {
    armar();
    for (const mod of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) fireEvent.keyDown(window, { key: "+", ...mod });
    expect(ventaActual().items).toHaveLength(0);
  });

  it("015-E27: «+» con el foco en el buscador agrega el elegido y no se escribe (el buscador no busca signos)", () => {
    armar();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    const caja = screen.getByTestId("busqueda");
    caja.focus();
    fireEvent.keyDown(caja, { key: "+" });
    expect(ventaActual().items.map((it) => it.descripcion)).toEqual(["Cinta aisladora negra 20 m"]);
  });

  it("015-E07 015-E11 015-E14: agregar otra vez suma 1; sin stock entra igual; se sigue en el Catálogo con la búsqueda", async () => {
    armar();
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "cinta" } });
    await waitFor(() => expect(screen.getAllByTestId("producto")).toHaveLength(1));
    fireEvent.click(within(fila("Cinta")).getByTestId("agregar")); // sin stock
    fireEvent.click(within(fila("Cinta")).getByTestId("agregar"));
    expect(ventaActual().items).toEqual([expect.objectContaining({ descripcion: "Cinta aisladora negra 20 m", cantidad: 2 })]);
    expect((screen.getByTestId("busqueda") as HTMLInputElement).value).toBe("cinta");
    expect(screen.getAllByTestId("producto")).toHaveLength(1);
  });

  it("015-E17 015-E29: las marcas son las de lo encontrado, y elegir una deja solo sus productos", async () => {
    armar([producto({ id: "cinta2", descripcion: "Cinta de papel 24 mm", marca: "3m" })]);
    fireEvent.click(screen.getByTestId("filtros"));
    expect(screen.getAllByTestId("marca").map((b) => b.textContent)).toEqual(["Todas las marcas", "3M", "Bosch"]);
    fireEvent.click(screen.getAllByTestId("marca")[1]!);
    expect(screen.getAllByTestId("producto").map((f) => f.textContent)).toEqual([expect.stringContaining("aisladora"), expect.stringContaining("papel")]);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByTestId("sacar-filtros"));
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "mecha" } });
    await waitFor(() => expect(screen.getAllByTestId("producto")).toHaveLength(1));
    fireEvent.click(screen.getByTestId("filtros"));
    expect(screen.getAllByTestId("marca").map((b) => b.textContent)).toEqual(["Todas las marcas", "Bosch"]);
  });

  it("015-E18 015-E20: dice cuántos quedan aunque sean más de un tramo; si no queda nada, lo dice y ofrece sacarlos", () => {
    const falso = armar(Array.from({ length: 80 }, (_, i) => producto({ id: `tornillo-${i}`, descripcion: `Tornillo ${i}`, marca: "Fischer" })));
    for (let i = 0; i < 80; i++) falso.stock.set(`tornillo-${i}`, 5);
    fireEvent.click(screen.getByTestId("filtros"));
    fireEvent.click(screen.getByTestId("disponibilidad-con-stock"));
    expect(screen.getByTestId("con-filtros").textContent).toContain("81 productos con filtros");
    fireEvent.click(screen.getAllByTestId("marca").find((b) => b.textContent === "3M")!);
    expect(screen.queryAllByTestId("producto")).toHaveLength(0);
    const vacio = screen.getByTestId("sin-resultados");
    expect(vacio.textContent).toContain("No hay productos con esos filtros.");
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(within(screen.getByTestId("sin-resultados")).getByRole("button", { name: "Sacar filtros" }));
    expect(screen.getAllByTestId("producto").length).toBeGreaterThan(2);
  });

  it("015-E30: elegir en el panel no le saca el lugar a quien recorre con el teclado", () => {
    armar();
    fireEvent.click(screen.getByTestId("filtros"));
    const buscarMarca = screen.getByTestId("buscar-marca");
    buscarMarca.focus();
    fireEvent.change(buscarMarca, { target: { value: "bo" } });
    act(() => { fireEvent.click(screen.getByTestId("disponibilidad-con-stock")); buscarMarca.focus(); });
    fireEvent.change(buscarMarca, { target: { value: "bos" } }); // la pantalla se vuelve a dibujar
    expect(document.activeElement).toBe(buscarMarca);
  });

  it("015-E12 015-E27: sin permiso de vender no hay «Agregar», y «+» no hace nada", () => {
    conPermisos("catalogo.margenes");
    armar();
    expect(screen.queryAllByTestId("agregar")).toHaveLength(0);
    fireEvent.keyDown(window, { key: "+" });
    expect(ventaActual().items).toHaveLength(0);
    expect(document.body.textContent).not.toContain("agrega el elegido a la venta");
  });

  it("015-E22: el buscador dice qué busca, con el texto largo", () => {
    armar();
    expect(screen.getByTestId("busqueda").getAttribute("placeholder")).toBe("Buscar productos, códigos o marcas…");
  });

  it("015-E16 015-E19 015-E30: el panel de filtros filtra mientras se elige; Esc lo cierra y los filtros quedan", () => {
    armar();
    fireEvent.click(screen.getByTestId("filtros"));
    fireEvent.click(screen.getByTestId("disponibilidad-con-stock"));
    expect(screen.getAllByTestId("producto")).toHaveLength(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("panel-filtros")).toBeNull();
    expect(screen.getAllByTestId("producto")).toHaveLength(1);
    expect(screen.getByTestId("cuantos-filtros").textContent).toBe("1");
    fireEvent.click(screen.getByTestId("sacar-filtros"));
    expect(screen.getAllByTestId("producto")).toHaveLength(2);
  });
});
