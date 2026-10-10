import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
const descargar = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), descargar }));

import { Productos } from "./Productos";

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

  it("Enter abre la ficha del producto elegido", () => {
    armar();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByTestId("ficha-producto").textContent).toContain("MECHA PRODUCTO 8 MM");
  });
});
