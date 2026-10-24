import { beforeEach, describe, expect, it, vi } from "vitest";
import { conPermisos } from "../../pruebas/sesion";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../negocio/catalogo", async (original) => ({ ...(await original<typeof import("../../negocio/catalogo")>()), ...((await import("../../pruebas/catalogo-falso")).moduloDeCatalogo(() => catalogo.actual)) }));
const descargar = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../datos/conexion", async (original) => ({ ...(await original<typeof import("../../datos/conexion")>()), descargar }));

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
  const buscar = (texto: string) => { fireEvent.change(screen.getByTestId("busqueda"), { target: { value: texto } }); act(() => { vi.advanceTimersByTime(350); }); };
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

  // La v2 (decisión 145): la ficha del elegido está siempre a la derecha de la lista.
  const ficha = () => screen.getByTestId("ficha-producto");

  it("la ficha del elegido está siempre al lado; tocar otro producto o ↓ la cambia", () => {
    const { fila } = armar();
    expect(ficha().textContent).toContain("MECHA PRODUCTO 8 MM");
    fireEvent.click(fila("TORNILLO"));
    expect(fila("TORNILLO").getAttribute("aria-selected")).toBe("true");
    expect(ficha().textContent).toContain("TORNILLO PRODUCTO");
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(ficha().textContent).toContain("SIN COSTO PRODUCTO");
  });

  it("un toque en un margen de la ficha lo guarda; el que no tiene costo no deja elegir", () => {
    const { fila, falso } = armar();
    fireEvent.click(fila("TORNILLO"));
    fireEvent.click(within(ficha()).getByTestId("margen-200"));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 200 });
    fireEvent.click(fila("SIN COSTO"));
    expect((within(ficha()).getByTestId("margen-200") as HTMLButtonElement).disabled).toBe(true);
    expect(within(ficha()).getByTestId("sin-precio").textContent).toBe("sin costo");
  });

  it("Mayúsculas + 3 fija el 100 % del producto elegido con las flechas, aun sin el cursor en la búsqueda", () => {
    const { falso } = armar();
    // La lista llega en orden alfabético: MECHA, SIN COSTO, TORNILLO.
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "#", code: "Digit3", shiftKey: true });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 100 });
  });

  it("«Otro» abre la caja del margen a mano: es un porcentaje y se guarda con Enter", () => {
    const { fila, falso } = armar();
    fireEvent.click(fila("TORNILLO"));
    fireEvent.click(within(ficha()).getByTestId("margen-otro"));
    const otro = within(ficha()).getByTestId("otro-margen");
    fireEvent.change(otro, { target: { value: "120" } });
    fireEvent.keyDown(otro, { key: "Enter" });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 120 });
    expect(within(ficha()).queryByTestId("otro-margen")).toBeNull();
  });

  it("desde el archivo de origen de la ficha se baja el Excel del proveedor", () => {
    armar();
    fireEvent.click(within(ficha()).getByTestId("bajar-lista"));
    expect(descargar).toHaveBeenCalledWith("/listas/lista-1/archivo", expect.stringContaining("2026-08-11.xlsx"));
  });

  it("«Así se calcula» está abierto, con cada paso de la cuenta; F1 lo pliega y deja lo que se cobra", () => {
    armar();
    const cuenta = () => within(ficha()).getByTestId("cuenta-del-precio").textContent!;
    // 1000 de costo, 100 % de margen, 21 % de IVA: 2000, 2420 → se cobra $3.000.
    expect(cuenta()).toContain("Costo de compra$1.000,00");
    expect(cuenta()).toContain("+ 100 % de margen$2.000,00");
    expect(cuenta()).toContain("+ IVA 21 %$2.420,00");
    expect(within(ficha()).getByTestId("se-cobra").textContent).toBe("$3.000");
    fireEvent.keyDown(window, { key: "F1" });
    expect(cuenta()).not.toContain("Costo de compra");
    expect(within(ficha()).getByTestId("se-cobra").textContent).toBe("$3.000");
  });

  // 002-T002: en la ficha, ← → recorren los márgenes y Enter elige; ↑ ↓ recorren los proveedores y «Listo».
  it("Enter entra a la ficha: las flechas recorren márgenes, proveedores y «Listo»; Esc vuelve a la búsqueda", () => {
    const falso = catalogoFalso([producto({ id: "sil", descripcion: "SILICONA", costo_neto: "2400", margen_elegido: 100, proveedor: "Barato", proveedor_id: "b", proveedores: [
      { proveedor_id: "b", proveedor: "Barato", costo_neto: "2400", fecha_lista: "2026-08-11", codigo_proveedor: "S1" },
      { proveedor_id: "c", proveedor: "Caro", costo_neto: "3000", fecha_lista: "2026-08-11", codigo_proveedor: "S2" },
    ] })]);
    catalogo.actual = falso;
    render(<Productos />);
    const ficha = screen.getByTestId("ficha-producto");
    const tecla = (key: string) => fireEvent.keyDown(document.activeElement ?? ficha, { key });
    const foco = () => document.activeElement;
    fireEvent.keyDown(window, { key: "Enter" });
    // El foco entra al margen elegido.
    expect(foco()).toBe(within(ficha).getByTestId("margen-100"));
    tecla("ArrowRight");
    expect(foco()).toBe(within(ficha).getByTestId("margen-50"));
    tecla("ArrowLeft"); tecla("ArrowLeft");
    expect(foco()).toBe(within(ficha).getByTestId("margen-200"));
    // Moverse no elige: elige Enter (el botón con el foco).
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
    fireEvent.click(foco()!);
    expect(falso.actualizarProducto).toHaveBeenCalledWith("sil", { margen_elegido: 200 });

    // ↓ recorre las partes de la ficha: «Usar» del otro proveedor, «Así se calcula», el archivo,
    // «Listo» y «Agregar a la venta».
    tecla("ArrowDown");
    expect(foco()).toBe(within(ficha).getByTestId("proveedor-de-producto"));
    expect(within(ficha).getByTestId("otros-proveedores").textContent).toContain("Caro");
    fireEvent.click(foco()!);
    expect(falso.actualizarProducto).toHaveBeenCalledWith("sil", { proveedor_preferido_id: "c" });
    for (let i = 0; i < 6; i++) tecla("ArrowDown");
    expect(foco()).toBe(within(ficha).getByTestId("ficha-agregar"));
    for (let i = 0; i < 8; i++) tecla("ArrowUp");
    // ↑ desde la primera parte vuelve al margen elegido.
    expect(foco()).toBe(within(ficha).getByTestId("margen-200"));
    // Esc vuelve a la búsqueda sin borrarla.
    tecla("Escape");
    expect(foco()).toBe(screen.getByTestId("busqueda"));
  });

  it("016-E27: con el foco en la ficha, «+» agrega a la venta (con Ctrl no) y Mayús + 1 a 5 fijan el margen", () => {
    const falso = catalogoFalso([producto({ id: "sil", descripcion: "SILICONA", costo_neto: "2400", margen_elegido: 100 })]);
    catalogo.actual = falso;
    render(<Productos />);
    const listo = within(screen.getByTestId("ficha-producto")).getByTestId("ficha-listo");
    listo.focus();
    fireEvent.keyDown(listo, { key: "+", ctrlKey: true });
    expect(ventaActual().items).toHaveLength(0);
    fireEvent.keyDown(listo, { key: "+" });
    expect(ventaActual().items.map((it) => it.descripcion)).toEqual(["SILICONA"]);
    expect(screen.getByTestId("agregado").textContent).toContain("Agregado a la venta: SILICONA");
    fireEvent.keyDown(listo, { key: "!", code: "Digit1", shiftKey: true });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("sil", { margen_elegido: 300 });
    // «Listo» devuelve el foco a la búsqueda.
    fireEvent.click(listo);
    expect(document.activeElement).toBe(screen.getByTestId("busqueda"));
  });

  // Decisión 53: los costos se ven solo con «Ver costos».
  it("sin el permiso de ver costos la ficha no tiene proveedores, ni «Así se calcula», ni el archivo", () => {
    conPermisos("catalogo.margenes");
    armar();
    expect(within(ficha()).getByTestId("precio-de-venta").textContent).toBe("$3.000");
    expect(within(ficha()).queryByTestId("otros-proveedores")).toBeNull();
    expect(within(ficha()).queryByTestId("asi-se-calcula")).toBeNull();
    expect(within(ficha()).queryByTestId("archivo-de-origen")).toBeNull();
    expect(ficha().textContent).not.toContain("1.000,00");
  });
});
