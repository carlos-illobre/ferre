/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../pruebas/catalogo-falso";
import { ObservadorFalso } from "../pruebas/preparar";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
const descargar = vi.fn<(...a: any[]) => Promise<void>>(async () => undefined);
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), descargar: (...a: unknown[]) => descargar(...a) }));

import { Productos } from "./Productos";

// Todo lo que pidió el dueño para Productos: precio redondeado para arriba a $1.000,
// margen a mano en porcentaje, memoria del margen, atajos sin foco, carga de a 30 y
// bajar el Excel original.
function armar(productos = [
  producto({ id: "mecha", descripcion: "MECHA PARA MADERA 6 MM", codigo_proveedor: "ME6", costo_neto: "1500", explicacion_costo: ["Precio de lista 2000", "− 25 % (linea) = 1500"] }),
  producto({ id: "taladro", descripcion: "TALADRO PERCUTOR 750 W", costo_neto: "120000" }),
]) {
  const falso = catalogoFalso(productos);
  catalogo.actual = falso;
  vi.useFakeTimers();
  const r = render(<Productos />);
  const buscar = (texto: string) => {
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: texto } });
    act(() => { vi.advanceTimersByTime(200); }); // debounce
  };
  return { ...r, falso, buscar };
}
const fila = (texto: string) => screen.getAllByTestId("producto").find((f) => f.textContent?.includes(texto))!;

describe("Productos", () => {
  beforeEach(() => { vi.useRealTimers(); descargar.mockClear(); });

  it("busca con debounce y calcula el precio para arriba a múltiplos de $1.000", () => {
    const { buscar } = armar();
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "mecha" } });
    expect(screen.queryAllByTestId("producto")).toHaveLength(0); // todavía no pasaron los 150 ms
    act(() => { vi.advanceTimersByTime(200); });
    const f = fila("MECHA");
    expect(f.textContent).toContain("sin precio: elegí un margen");
    fireEvent.click(within(f).getByRole("button", { name: "100 %" }));
    expect(within(f).getByRole("button", { name: "100 %" }).className).toContain("activo");
    expect(within(f).getByText("$4.000,00")).toBeTruthy(); // 1500 × 2 × 1,21 = 3630 → 4000
    buscar("taladro");
    fireEvent.click(within(fila("TALADRO")).getByRole("button", { name: "25 %" }));
    expect(within(fila("TALADRO")).getByText("$182.000,00")).toBeTruthy(); // 181.500 → 182.000
  });

  it("el margen elegido se guarda en el producto (memoria al recargar)", () => {
    const { buscar, falso } = armar();
    buscar("mecha");
    fireEvent.click(within(fila("MECHA")).getByRole("button", { name: "50 %" }));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { margen_elegido: 50 });
  });

  it("'otro margen' es un porcentaje, no un precio: 20 → 20 % de margen", () => {
    const { buscar, falso } = armar();
    buscar("mecha");
    const f = fila("MECHA");
    fireEvent.click(within(f).getByRole("button", { name: "otro margen" }));
    const caja = within(f).getByPlaceholderText("20");
    fireEvent.change(caja, { target: { value: "20" } });
    fireEvent.keyDown(caja, { key: "Enter" });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { margen_elegido: 20 });
    buscar("mecha");
    expect(within(fila("MECHA")).getByText("$3.000,00")).toBeTruthy(); // 1500 × 1,2 × 1,21 = 2178 → 3000
    expect(fila("MECHA").textContent).toContain("margen a mano · 20 %");
    for (const m of ["300 %", "200 %", "100 %", "50 %", "25 %"]) expect(within(fila("MECHA")).getByRole("button", { name: m }).className).not.toContain("activo");
  });

  it("la explicación del costo y del precio muestran los pasos", () => {
    const { buscar } = armar();
    buscar("mecha");
    fireEvent.click(within(fila("MECHA")).getByRole("button", { name: "100 %" }));
    expect(fila("MECHA").textContent).toContain("− 25 % (linea) = 1500");
    expect(fila("MECHA").textContent).toContain("+ 100 % de margen");
    expect(fila("MECHA").textContent).toContain("Redondeado para arriba a $4.000,00");
  });

  it("flechas y Shift+número funcionan aunque la búsqueda no tenga el foco", () => {
    const { buscar, falso } = armar();
    buscar("marca");
    // dos resultados (los dos son MARCA); el primero está elegido
    const primero = screen.getAllByTestId("producto")[0]!;
    expect(primero.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(screen.getAllByTestId("producto")[1]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.body, { key: "2", code: "Digit2", shiftKey: true });
    const elegido = screen.getAllByTestId("producto")[1]!;
    const id = elegido.textContent?.includes("MECHA") ? "mecha" : "taladro";
    expect(falso.actualizarProducto).toHaveBeenCalledWith(id, { margen_elegido: 200 });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect((screen.getByTestId("busqueda") as HTMLInputElement).value).toBe("");
  });

  it("carga de a 30 y trae 30 más al llegar al final", () => {
    const muchos = Array.from({ length: 40 }, (_, i) => producto({ id: `t${i}`, descripcion: `TUERCA SCROLL ${i + 1}` }));
    const { buscar } = armar(muchos);
    buscar("tuerca");
    expect(screen.getAllByTestId("producto")).toHaveLength(30);
    expect(screen.getByTestId("cargar-mas")).toBeTruthy();
    act(() => { ObservadorFalso.ultimo!.cruzar(); });
    expect(screen.getAllByTestId("producto")).toHaveLength(40);
    expect(screen.queryByTestId("cargar-mas")).toBeNull();
  });

  it("'lista del ...' baja el Excel original de esa lista", () => {
    const { buscar } = armar();
    buscar("mecha");
    fireEvent.click(within(fila("MECHA")).getByTestId("bajar-lista"));
    expect(descargar).toHaveBeenCalledWith("/listas/lista-1/archivo", expect.stringContaining("Proveedor uno"));
  });

  it("con varios proveedores marca el más barato y permite usar otro", () => {
    const { buscar, falso } = armar([producto({ id: "sil", descripcion: "SILICONA", costo_neto: "2400", proveedor: "Barato", proveedores: [
      { proveedor_id: "b", proveedor: "Barato", costo_neto: "2400", fecha_lista: "2026-08-11", codigo_proveedor: "S1" },
      { proveedor_id: "c", proveedor: "Caro", costo_neto: "3000", fecha_lista: "2026-08-11", codigo_proveedor: "S2" },
    ] })]);
    buscar("silicona");
    const otros = within(fila("SILICONA")).getByTestId("otros-proveedores");
    expect(otros.textContent).toContain("★ Barato $2.400,00");
    fireEvent.click(within(otros).getByRole("button", { name: "usar" }));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("sil", { proveedor_preferido_id: "c" });
  });
});
