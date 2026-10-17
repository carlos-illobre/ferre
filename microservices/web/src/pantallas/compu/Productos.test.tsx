import { beforeEach, describe, expect, it, vi } from "vitest";
import { conPermisos } from "../../pruebas/sesion";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
const descargar = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), descargar }));

import { ventaActual } from "../../negocio/ventas/venta-en-curso";
import { Productos } from "./base/pantallas/Productos";

function armar() {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA PRODUCTO 8 MM", costo_neto: "1000", margen_elegido: 100, fecha_lista: "2026-08-11", lista_importada_id: "lista-1" }),
    producto({ id: "tornillo", descripcion: "TORNILLO PRODUCTO", costo_neto: "10" }),
    producto({ id: "huerfano", descripcion: "SIN COSTO PRODUCTO", costo_neto: null }),
  ]);
  catalogo.actual = falso;
  vi.useFakeTimers();
  render(<Productos />);
  const buscar = (texto: string) => { fireEvent.change(screen.getByTestId("busqueda"), { target: { value: texto } }); act(() => { vi.advanceTimersByTime(200); }); };
  const fila = (texto: string) => screen.getAllByTestId("producto").find((f) => f.textContent?.includes(texto))!;
  return { falso, buscar, fila };
}

describe("Productos (v2)", () => {
  beforeEach(() => { vi.useRealTimers(); descargar.mockClear(); });

  it("busca mientras se escribe y muestra el precio redondeado", () => {
    const { buscar, fila } = armar();
    buscar("mecha");
    expect(screen.getAllByTestId("producto")).toHaveLength(1);
    expect(fila("MECHA").textContent).toContain("$3.000");
  });

  it("sin resultados dice qué probar", () => {
    const { buscar } = armar();
    buscar("zzzz");
    expect(screen.getByTestId("sin-resultados").textContent).toContain("menos palabras");
  });

  it("un toque en un margen lo guarda; el que no tiene costo no deja elegir", () => {
    const { fila, falso } = armar();
    fireEvent.click(within(fila("TORNILLO")).getByTestId("margen-200"));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 200 });
    expect((within(fila("SIN COSTO")).getByTestId("margen-200") as HTMLButtonElement).disabled).toBe(true);
  });

  it("Mayúsculas + 3 fija el 100 % del producto elegido con las flechas, aun sin el cursor en la búsqueda", () => {
    const { falso } = armar();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "#", code: "Digit3", shiftKey: true });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 100 });
  });

  it("«otro margen» es un porcentaje y se guarda con Enter", () => {
    const { fila, falso } = armar();
    const otro = within(fila("TORNILLO")).getByTestId("otro-margen");
    fireEvent.change(otro, { target: { value: "120" } });
    fireEvent.keyDown(otro, { key: "Enter" });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 120 });
  });

  it("desde la lista de origen se baja el Excel del proveedor", () => {
    const { fila } = armar();
    fireEvent.click(within(fila("MECHA")).getByTestId("bajar-lista"));
    expect(descargar).toHaveBeenCalledWith("/listas/lista-1/archivo", expect.stringContaining("2026-08-11.xlsx"));
  });

  // 002-T002: en la ficha, ← → recorren los márgenes y Enter elige; ↑ ↓ recorren los proveedores y «Listo».
  it("en la ficha las flechas recorren márgenes, proveedores y «Listo», y Enter elige", () => {
    const falso = catalogoFalso([producto({ id: "sil", descripcion: "SILICONA", costo_neto: "2400", margen_elegido: 100, proveedor: "Barato", proveedor_id: "b", proveedores: [
      { proveedor_id: "b", proveedor: "Barato", costo_neto: "2400", fecha_lista: "2026-08-11", codigo_proveedor: "S1" },
      { proveedor_id: "c", proveedor: "Caro", costo_neto: "3000", fecha_lista: "2026-08-11", codigo_proveedor: "S2" },
    ] })]);
    catalogo.actual = falso;
    render(<Productos />);
    fireEvent.keyDown(window, { key: "Enter" });
    const ficha = screen.getByTestId("ficha-producto");
    const tecla = (key: string) => fireEvent.keyDown(document.activeElement ?? ficha, { key });
    const foco = () => document.activeElement;
    // Al abrirse, el navegador pone el foco en la ficha (jsdom no lo hace solo).
    within(ficha).getByRole("button", { name: "Cerrar" }).focus();

    tecla("ArrowRight");
    expect(foco()).toBe(within(ficha).getByTestId("margen-100"));
    tecla("ArrowRight");
    expect(foco()).toBe(within(ficha).getByTestId("margen-50"));
    tecla("ArrowLeft"); tecla("ArrowLeft");
    expect(foco()).toBe(within(ficha).getByTestId("margen-200"));
    // Moverse no elige: elige Enter (el botón con el foco).
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
    fireEvent.click(foco()!);
    expect(falso.actualizarProducto).toHaveBeenCalledWith("sil", { margen_elegido: 200 });

    // ↓ recorre las partes de la ficha: el proveedor en uso (Enter muestra los demás), «Usar»
    // del otro, «Así se calcula», «Listo» y «Agregar a la venta» (specs/016).
    tecla("ArrowDown");
    const enUso = within(ficha).getByTestId("proveedor-en-uso");
    expect(foco()).toBe(enUso);
    fireEvent.click(enUso);
    tecla("ArrowDown");
    expect(foco()).toBe(within(ficha).getByTestId("proveedor-de-producto"));
    fireEvent.click(foco()!);
    expect(falso.actualizarProducto).toHaveBeenCalledWith("sil", { proveedor_preferido_id: "c" });
    for (let i = 0; i < 6; i++) tecla("ArrowDown");
    expect(foco()).toBe(within(ficha).getByTestId("ficha-agregar"));
    for (let i = 0; i < 8; i++) tecla("ArrowUp");
    // ↑ desde la primera parte vuelve al margen elegido.
    expect(foco()).toBe(within(ficha).getByTestId("margen-200"));
  });

  it("016-E27: en la ficha, «+» agrega a la venta (con Ctrl no) y Mayús + 1 a 5 fijan el margen", () => {
    const falso = catalogoFalso([producto({ id: "sil", descripcion: "SILICONA", costo_neto: "2400", margen_elegido: 100 })]);
    catalogo.actual = falso;
    render(<Productos />);
    fireEvent.keyDown(window, { key: "Enter" });
    const ficha = screen.getByTestId("ficha-producto");
    fireEvent.keyDown(ficha, { key: "+", ctrlKey: true });
    expect(ventaActual().items).toHaveLength(0);
    fireEvent.keyDown(ficha, { key: "+" });
    expect(ventaActual().items.map((it) => it.descripcion)).toEqual(["SILICONA"]);
    expect(within(ficha).getByTestId("mensaje-ficha").textContent).toContain("Agregado a la venta: SILICONA");
    fireEvent.keyDown(ficha, { key: "!", code: "Digit1", shiftKey: true });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("sil", { margen_elegido: 300 });
  });

  it("Enter abre la ficha del producto elegido", () => {
    armar();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByTestId("ficha-producto").textContent).toContain("MECHA PRODUCTO 8 MM");
  });

  // Decisión 53: los costos se ven solo con «Ver costos».
  it("sin el permiso de ver costos la tabla no tiene la columna Costo ni explica el precio", () => {
    conPermisos("catalogo.margenes");
    armar();
    expect(screen.queryByRole("columnheader", { name: "Costo" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Precio de venta" })).toBeTruthy();
    expect(document.querySelector("[data-testid=explicacion]")).toBeNull();
  });
});
