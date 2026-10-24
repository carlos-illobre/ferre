import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { agregarALaVenta, useVentaEnCurso, ventaActual } from "./venta-en-curso";
import type { Producto } from "../catalogo";

// La venta en curso vive fuera de las pantallas (ADR-022, specs/015-catalogo-para-vender).
const MECHA = { id: "p-mecha", descripcion: "Mecha 6 mm", marca: "Bosch", codigo_barras: null, unidad: "unidad", margen_elegido: 100, proveedor: null, codigo_proveedor: null, costo_neto: 1500, iva: 21, fecha_lista: null, explicacion_costo: [] } as unknown as Producto;

function Contador() {
  const { items } = useVentaEnCurso();
  return <output data-testid="renglones">{items.map((it) => `${it.descripcion} × ${it.cantidad}`).join(", ")}</output>;
}

describe("la venta en curso", () => {
  it("015-E06 015-E07: agregar entra con cantidad 1, y agregar otra vez suma 1 al mismo renglón", () => {
    agregarALaVenta(MECHA);
    agregarALaVenta(MECHA);
    expect(ventaActual().items).toHaveLength(1);
    expect(ventaActual().items[0]).toMatchObject({ descripcion: "Mecha 6 mm", cantidad: 2 });
  });

  it("015-E25: la venta sigue al cerrar la pantalla que la mostraba y abrir otra", () => {
    const { unmount } = render(<Contador />);
    act(() => { agregarALaVenta(MECHA); });
    expect(screen.getByTestId("renglones").textContent).toBe("Mecha 6 mm × 1");
    unmount();
    render(<Contador />);
    expect(screen.getByTestId("renglones").textContent).toBe("Mecha 6 mm × 1");
  });
});
