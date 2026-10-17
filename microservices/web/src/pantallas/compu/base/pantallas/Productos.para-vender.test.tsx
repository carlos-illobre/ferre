/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../../../pruebas/sesion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../../../pruebas/catalogo-falso";

// El Catálogo para vender en la computadora (specs/015-catalogo-para-vender): la columna Stock,
// «Agregar» debajo del precio, la tecla «+», el buscador largo y el panel de filtros con Esc.
const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso(), traerPorCodigo: async () => null, traerPorIds: async () => undefined }));
vi.mock("../../../../api", async (original) => ({ ...(await original<typeof import("../../../../api")>()), api: async () => [] }));
import { Productos } from "./Productos";
import { ventaActual } from "../../../../negocio/ventas/venta-en-curso";

function armar() {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "Mecha para madera 6 mm", marca: "Bosch", costo_neto: "1500", margen_elegido: 100 }),
    producto({ id: "cinta", descripcion: "Cinta aisladora negra 20 m", marca: "3M", costo_neto: "420", margen_elegido: 200 }),
  ]);
  falso.stock.set("mecha", 12);
  catalogo.actual = falso;
  return render(<Productos />);
}
const fila = (texto: string) => screen.getAllByTestId("producto").find((f) => f.textContent?.includes(texto))!;

describe("Catálogo para vender · computadora", () => {
  beforeEach(() => { conPermisos("ventas.registrar", "catalogo.margenes"); });

  it("015-E01 015-E03: la columna Stock dice la cantidad con su unidad, o «Sin stock»", () => {
    armar();
    expect(within(fila("Mecha")).getByTestId("stock").textContent).toBe("12 u.");
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
