/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
vi.mock("../componentes/Escaner", () => ({ Escaner: () => null, hayCamara: () => false }));
vi.mock("../componentes/VincularCelular", () => ({ VincularCelular: () => null }));
vi.mock("../puesto", () => ({ enviarCodigoAlPuesto: vi.fn(), escucharPuesto: vi.fn(() => () => undefined), puestoRemoto: () => null }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { Vender } from "./Vender";

const ventasVacias = { ventas: [], totales: {}, total: 0 };
function armar(ventas: unknown = ventasVacias) {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA VENDER 8 MM", costo_neto: "1000", margen_elegido: 100 }),
    producto({ id: "tornillo", descripcion: "TORNILLO VENDER", costo_neto: "10" }),
  ]);
  catalogo.actual = falso;
  apiFalsa.mockImplementation(async (ruta: string) => (ruta.startsWith("/ventas") ? ventas : []));
  render(<Vender />);
  const busqueda = screen.getByTestId("busqueda");
  const agregar = (texto: string) => { fireEvent.change(busqueda, { target: { value: texto } }); fireEvent.keyDown(busqueda, { key: "Enter" }); };
  const item = (texto: string) => screen.getAllByTestId("item").find((i) => i.textContent?.includes(texto))!;
  return { falso, busqueda, agregar, item };
}

describe("Vender", () => {
  beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockClear(); });

  it("agrega con Enter, muestra el precio redondeado a $1.000 y suma el total", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    expect(screen.getByTestId("total").textContent).toContain("$3.000,00"); // 1000 × 2 × 1,21 = 2420 → 3000
  });

  it("cantidades enteras por unidad: 2,7 es 2, la flechita suma de a 1, y nunca queda un cero", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    const cantidad = within(item("MECHA")).getByTestId("cantidad") as HTMLInputElement;
    expect(cantidad.getAttribute("step")).toBe("1");
    expect(cantidad.getAttribute("min")).toBe("1");
    fireEvent.change(cantidad, { target: { value: "2.7" } });
    expect(cantidad.value).toBe("2");
    fireEvent.change(cantidad, { target: { value: "" } });
    expect(cantidad.value).toBe("");
    fireEvent.blur(cantidad);
    expect(cantidad.value).toBe("1");
    fireEvent.change(cantidad, { target: { value: "3" } });
    expect(screen.getByTestId("total").textContent).toContain("$9.000,00");
  });

  it("a granel (kg) admite un decimal y la unidad queda guardada en el producto", () => {
    const { agregar, item, falso } = armar();
    agregar("mecha vender");
    fireEvent.change(within(item("MECHA")).getByTestId("unidad"), { target: { value: "kg" } });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { unidad: "kg" });
    const cantidad = within(item("MECHA")).getByTestId("cantidad") as HTMLInputElement;
    expect(cantidad.getAttribute("step")).toBe("0.1");
    fireEvent.change(cantidad, { target: { value: "1.55" } });
    expect(cantidad.value).toBe("1.6");
    expect(screen.getByTestId("total").textContent).toContain("$4.800,00");
  });

  it("un producto sin margen queda sin precio hasta elegirlo en la fila, y el margen se guarda", () => {
    const { agregar, item, falso } = armar();
    agregar("tornillo vender");
    expect(item("TORNILLO").textContent).toContain("elegí margen o precio");
    fireEvent.click(within(item("TORNILLO")).getByRole("button", { name: "300 %" }));
    expect(item("TORNILLO").textContent).toContain("$1.000,00"); // 10 × 4 × 1,21 = 48,4 → 1000
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 300 });
  });

  it("'a mano' en el renglón es un precio absoluto solo para esta venta", () => {
    const { agregar, item, falso } = armar();
    agregar("mecha vender");
    fireEvent.change(within(item("MECHA")).getByTestId("precio-manual"), { target: { value: "2500" } });
    expect(screen.getByTestId("total").textContent).toContain("$2.500,00");
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
  });

  it("los avisos de cobro desaparecen solos al corregir la causa", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("cobrar"));
    expect(screen.getByRole("alert").textContent).toContain("Elegí cómo paga");
    fireEvent.click(screen.getByRole("button", { name: "Cuenta corriente" }));
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByTestId("cobrar"));
    expect(screen.getByRole("alert").textContent).toContain("elegí el cliente");
    fireEvent.click(screen.getByRole("button", { name: "Efectivo" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("cobrar en efectivo manda la venta con cantidad, precio, margen y explicación", async () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.keyDown(window, { key: "F5" }); // efectivo
    fireEvent.click(screen.getByTestId("cobrar"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toContain("Venta registrada: $3.000,00 en efectivo"));
    const cuerpo = enviarOEncolar.mock.calls[0]![3] as { medio_pago: string; items: { cantidad: number; precio_unitario: number; margen_aplicado: number; explicacion: { pasos: string[] } }[] };
    expect(cuerpo.medio_pago).toBe("efectivo");
    expect(cuerpo.items[0]).toMatchObject({ cantidad: 1, precio_unitario: 3000, margen_aplicado: 100 });
    expect(cuerpo.items[0]!.explicacion.pasos.join(" ")).toContain("+ 100 % de margen");
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
  });

  it("Ventas de hoy: cada producto en su fila y la venta se pliega", async () => {
    armar({ total: 10500, totales: { efectivo: 10500 }, ventas: [
      { id: "v1", fecha: "2026-09-14T12:00:00Z", medio_pago: "efectivo", total: "10500", estado: "confirmada", cliente: null, items: [
        { descripcion: "MECHA VENDER 8 MM", cantidad: "3", precio_unitario: "3000" }, { descripcion: "TORNILLO VENDER", cantidad: "1.5", precio_unitario: "1000" }] },
      { id: "v2", fecha: "2026-09-14T12:30:00Z", medio_pago: "tarjeta", total: "3000", estado: "anulada", cliente: null, items: [{ descripcion: "MECHA VENDER 8 MM", cantidad: "1", precio_unitario: "3000" }] },
    ] });
    await screen.findByTestId("ventas-de-hoy");
    const ventas = screen.getAllByTestId("venta-dia");
    expect(ventas).toHaveLength(2);
    const [v1, v2] = ventas as [HTMLElement, HTMLElement];
    expect(within(v1).getAllByRole("row")).toHaveLength(3);
    expect(within(v1).getAllByRole("row")[1]!.textContent).toContain("3 × MECHA VENDER");
    expect(within(v1).getAllByRole("row")[2]!.textContent).toContain("1.5 × TORNILLO VENDER");
    fireEvent.click(within(v1).getAllByRole("row")[0]!);
    expect(within(v1).getAllByRole("row")).toHaveLength(1);
    expect(v1.textContent).toContain("2 productos: MECHA VENDER 8 MM, TORNILLO VENDER");
    expect(within(v2).getAllByRole("row")).toHaveLength(1); // un solo producto: sin pliegue
    expect(v2.textContent).toContain("anulada");
    expect(screen.getByRole("button", { name: /Ventas de hoy/ }).getAttribute("aria-expanded")).toBe("true");
  });

  it("'No llevó' anota la consulta y vacía la venta", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByRole("button", { name: "No llevó" }));
    expect(enviarOEncolar).toHaveBeenCalledWith("consulta", "POST", "/consultas", expect.objectContaining({ items: [expect.objectContaining({ producto_id: "mecha", precio_ofrecido: 3000 })] }));
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
  });
});
