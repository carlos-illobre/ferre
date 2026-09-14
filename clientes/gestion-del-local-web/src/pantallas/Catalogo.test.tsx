/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../pruebas/catalogo-falso";
import { ObservadorFalso } from "../pruebas/preparar";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
const descargar = vi.fn<(...a: any[]) => Promise<void>>(async () => undefined);
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>(async () => []));
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), descargar: (...a: unknown[]) => descargar(...a), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../sesion", () => ({ useSesion: () => ({ sesion: { estado: "con-sesion", usuario: { id: "u1", email: "a@b", nombre: "Ana", rol: "dueño" } } }), administra: () => true }));

import { Catalogo } from "./Catalogo";

// Todo lo que pidió el dueño para Productos, sobre el rediseño: la lista busca con debounce y
// carga de a 30; la ficha tiene el margen (botones o tipeado), los proveedores, la foto y el
// Excel de origen; los atajos de teclado siguen funcionando sin foco.
function armar(productos = [
  producto({ id: "mecha", descripcion: "MECHA PARA MADERA 6 MM", codigo_proveedor: "ME6", costo_neto: "1500", explicacion_costo: ["Precio de lista 2000", "− 25 % (linea) = 1500"] }),
  producto({ id: "taladro", descripcion: "TALADRO PERCUTOR 750 W", costo_neto: "120000" }),
], sub: string | null = null) {
  const falso = catalogoFalso(productos);
  catalogo.actual = falso;
  vi.useFakeTimers();
  const r = render(<Catalogo sub={sub} />);
  const buscar = (texto: string) => {
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: texto } });
    act(() => { vi.advanceTimersByTime(200); }); // debounce
  };
  return { ...r, falso, buscar };
}
const fila = (texto: string) => screen.getAllByTestId("producto").find((f) => f.textContent?.includes(texto))!;
const ficha = () => screen.getByTestId("ficha-producto");

describe("Catálogo · Productos", () => {
  beforeEach(() => { vi.useRealTimers(); descargar.mockClear(); });

  it("busca con debounce, muestra el precio redondeado para arriba a $1.000 y abre la ficha", () => {
    const { buscar } = armar();
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "mecha" } });
    expect(screen.getAllByTestId("producto")).toHaveLength(2); // todavía no pasaron los 150 ms: sigue la lista entera
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getAllByTestId("producto")).toHaveLength(1);
    expect(fila("MECHA").textContent).toContain("sin margen");
    fireEvent.click(fila("MECHA"));
    fireEvent.click(within(ficha()).getByRole("button", { name: "100 %" }));
    expect(within(ficha()).getByRole("button", { name: "100 %" }).className).toContain("activo");
    expect(within(ficha()).getByRole("button", { name: "De dónde sale $4.000" })).toBeTruthy(); // 1500 × 2 × 1,21 = 3630 → 4000
    fireEvent.keyDown(window, { key: "Escape" });
    expect(fila("MECHA").textContent).toContain("$4.000");
    buscar("taladro");
    fireEvent.click(fila("TALADRO"));
    fireEvent.click(within(ficha()).getByRole("button", { name: "25 %" }));
    expect(within(ficha()).getByRole("button", { name: "De dónde sale $182.000" })).toBeTruthy(); // 181.500 → 182.000
  });

  it("el margen elegido se guarda en el producto (memoria al recargar)", () => {
    const { buscar, falso } = armar();
    buscar("mecha");
    fireEvent.click(fila("MECHA"));
    fireEvent.click(within(ficha()).getByRole("button", { name: "50 %" }));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { margen_elegido: 50 });
  });

  it("'otro margen' es un porcentaje, no un precio: 20 → 20 % de margen", () => {
    const { buscar, falso } = armar();
    buscar("mecha");
    fireEvent.click(fila("MECHA"));
    const caja = within(ficha()).getByTestId("otro-margen");
    fireEvent.change(caja, { target: { value: "20" } });
    fireEvent.keyDown(caja, { key: "Enter" });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { margen_elegido: 20 });
    expect(within(ficha()).getByRole("button", { name: "De dónde sale $3.000" })).toBeTruthy(); // 1500 × 1,2 × 1,21 = 2178 → 3000
    expect(ficha().textContent).toContain("20 % a mano");
    for (const m of ["300 %", "200 %", "100 %", "50 %", "25 %"]) expect(within(ficha()).getByRole("button", { name: m }).className).not.toContain("activo");
  });

  it("la explicación del costo y del precio muestran los pasos numerados", () => {
    const { buscar } = armar();
    buscar("mecha");
    fireEvent.click(fila("MECHA"));
    fireEvent.click(within(ficha()).getByRole("button", { name: "100 %" }));
    fireEvent.click(within(ficha()).getByRole("button", { name: /Cómo se calcula el costo/ }));
    expect(screen.getByTestId("hoja-explicacion").textContent).toContain("− 25 % (linea) = 1500");
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(within(ficha()).getByRole("button", { name: "De dónde sale $4.000" }));
    const pasos = within(screen.getByTestId("hoja-explicacion")).getAllByRole("listitem").map((li) => li.textContent);
    expect(pasos[1]).toContain("+ 100 % de margen");
    expect(pasos[3]).toContain("Redondeado para arriba a $4.000,00");
  });

  it("flechas, Enter y Shift+número funcionan aunque la búsqueda no tenga el foco", () => {
    const { buscar, falso } = armar();
    buscar("marca");
    expect(screen.getAllByTestId("producto")[0]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(screen.getAllByTestId("producto")[1]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.body, { key: "2", code: "Digit2", shiftKey: true });
    const id = screen.getAllByTestId("producto")[1]!.textContent?.includes("MECHA") ? "mecha" : "taladro";
    expect(falso.actualizarProducto).toHaveBeenCalledWith(id, { margen_elegido: 200 });
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(screen.getByTestId("ficha-producto")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("ficha-producto")).toBeNull();
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

  it("desde la ficha se baja el Excel original de la lista", () => {
    const { buscar } = armar();
    buscar("mecha");
    fireEvent.click(fila("MECHA"));
    fireEvent.click(within(ficha()).getByTestId("bajar-lista"));
    expect(descargar).toHaveBeenCalledWith("/listas/lista-1/archivo", expect.stringContaining("Proveedor uno"));
  });

  it("con varios proveedores marca el más barato y permite usar otro", () => {
    const { buscar, falso } = armar([producto({ id: "sil", descripcion: "SILICONA", costo_neto: "2400", proveedor: "Barato", proveedores: [
      { proveedor_id: "b", proveedor: "Barato", costo_neto: "2400", fecha_lista: "2026-08-11", codigo_proveedor: "S1" },
      { proveedor_id: "c", proveedor: "Caro", costo_neto: "3000", fecha_lista: "2026-08-11", codigo_proveedor: "S2" },
    ] })]);
    buscar("silicona");
    fireEvent.click(fila("SILICONA"));
    const otros = within(ficha()).getByTestId("otros-proveedores");
    expect(otros.textContent).toContain("★ Barato");
    expect(otros.textContent).toContain("en uso");
    fireEvent.click(within(otros).getAllByTestId("proveedor-de-producto")[1]!);
    expect(falso.actualizarProducto).toHaveBeenCalledWith("sil", { proveedor_preferido_id: "c" });
  });

  it("los segmentos llevan a Listas y Duplicados", () => {
    armar(undefined, "duplicados");
    expect(screen.getByRole("tab", { name: "Duplicados" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("buscar-duplicados")).toBeTruthy();
  });
});
