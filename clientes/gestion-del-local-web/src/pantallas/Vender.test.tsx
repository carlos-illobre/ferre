/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
function armar(ventas: unknown = ventasVacias, esDueno = false) {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA VENDER 8 MM", costo_neto: "1000", margen_elegido: 100 }),
    producto({ id: "tornillo", descripcion: "TORNILLO VENDER", costo_neto: "10" }),
  ]);
  catalogo.actual = falso;
  apiFalsa.mockImplementation(async (ruta: string) => (ruta.startsWith("/ventas") ? ventas : []));
  render(<Vender esDueno={esDueno} />);
  const busqueda = screen.getByTestId("busqueda");
  const agregar = (texto: string) => { fireEvent.change(busqueda, { target: { value: texto } }); fireEvent.keyDown(busqueda, { key: "Enter" }); };
  const item = (texto: string) => screen.getAllByTestId("item").find((i) => i.textContent?.includes(texto))!;
  return { falso, busqueda, agregar, item };
}

// Todo lo que pidió el dueño para Vender, sobre el rediseño: renglones como tarjetas,
// cantidades enteras o a granel, margen en el renglón, cobro con éxito a pantalla completa.
describe("Vender", () => {
  beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockClear(); });

  it("agrega con Enter, muestra el precio redondeado a $1.000 y suma el total", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    expect(screen.getByTestId("total").textContent).toBe("$3.000"); // 1000 × 2 × 1,21 = 2420 → 3000
  });

  it("cantidades enteras por unidad: 2,7 es 2, el + suma de a 1, y nunca queda un cero", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    const cantidad = within(item("MECHA")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.change(cantidad, { target: { value: "2.7" } });
    expect(cantidad.value).toBe("2");
    fireEvent.click(within(item("MECHA")).getByRole("button", { name: "Más" }));
    expect(cantidad.value).toBe("3");
    fireEvent.change(cantidad, { target: { value: "" } });
    expect(cantidad.value).toBe("");
    fireEvent.blur(cantidad);
    expect(cantidad.value).toBe("1");
    fireEvent.change(cantidad, { target: { value: "3" } });
    expect(screen.getByTestId("total").textContent).toBe("$9.000");
  });

  it("a granel (kg) admite un decimal, el + suma de a 0,5 y la unidad queda guardada en el producto", () => {
    const { agregar, item, falso } = armar();
    agregar("mecha vender");
    fireEvent.change(within(item("MECHA")).getByTestId("unidad"), { target: { value: "kg" } });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { unidad: "kg" });
    const cantidad = within(item("MECHA")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.change(cantidad, { target: { value: "1.55" } });
    expect(cantidad.value).toBe("1,6");
    expect(screen.getByTestId("total").textContent).toBe("$4.800");
    fireEvent.click(within(item("MECHA")).getByRole("button", { name: "Más" }));
    expect(cantidad.value).toBe("2,1");
  });

  it("un producto sin margen abre el detalle y queda sin precio hasta elegirlo; el margen se guarda", () => {
    const { agregar, item, falso } = armar();
    agregar("tornillo vender");
    expect(within(item("TORNILLO")).getByTestId("margen").textContent).toContain("elegí margen");
    fireEvent.click(within(item("TORNILLO")).getByRole("button", { name: "300 %" }));
    expect(item("TORNILLO").textContent).toContain("$1.000"); // 10 × 4 × 1,21 = 48,4 → 1000
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 300 });
  });

  it("el detalle del renglón se abre con el chip del margen y muestra el costo con explicación", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    expect(within(item("MECHA")).queryByRole("button", { name: "50 %" })).toBeNull();
    fireEvent.click(within(item("MECHA")).getByTestId("margen"));
    expect(within(item("MECHA")).getByRole("button", { name: "100 %" }).className).toContain("activo");
    expect(item("MECHA").textContent).toContain("Costo $1.000,00");
    fireEvent.click(within(item("MECHA")).getByRole("button", { name: /Costo \$1\.000,00/ }));
    expect(screen.getByTestId("hoja-explicacion").textContent).toContain("según la lista");
  });

  it("'a mano' en el renglón es un precio absoluto solo para esta venta", () => {
    const { agregar, item, falso } = armar();
    agregar("mecha vender");
    fireEvent.click(within(item("MECHA")).getByTestId("margen"));
    fireEvent.change(within(item("MECHA")).getByTestId("precio-manual"), { target: { value: "2500" } });
    expect(screen.getByTestId("total").textContent).toBe("$2.500");
    expect(within(item("MECHA")).getByTestId("margen").textContent).toContain("a mano");
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
  });

  it("el subtotal explica de dónde sale, incluida la cantidad", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    fireEvent.change(within(item("MECHA")).getByTestId("cantidad"), { target: { value: "3" } });
    fireEvent.click(within(item("MECHA")).getByRole("button", { name: "De dónde sale $9.000" }));
    const pasos = within(screen.getByTestId("hoja-explicacion")).getAllByRole("listitem").map((li) => li.textContent);
    expect(pasos.join(" | ")).toContain("+ 100 % de margen");
    expect(pasos.at(-1)).toContain("× 3 unidades = $9.000,00");
  });

  it("los avisos de cobro desaparecen solos al corregir la causa", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("cobrar"));
    expect(screen.getByRole("alert").textContent).toContain("Elegí cómo paga");
    fireEvent.click(screen.getByRole("button", { name: "Cta. cte." }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("hoja-clientes")).toBeTruthy(); // sin cliente elegido, pide elegirlo
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByTestId("cobrar"));
    expect(screen.getByRole("alert").textContent).toContain("elegí el cliente");
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Efectivo" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("cobrar en efectivo manda la venta con cantidad, precio, margen y explicación, y muestra el éxito", async () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.keyDown(window, { key: "F5" }); // efectivo
    fireEvent.click(screen.getByTestId("cobrar"));
    await waitFor(() => expect(screen.getByTestId("exito").textContent).toContain("Venta registrada"));
    expect(screen.getByTestId("exito").textContent).toContain("$3.000");
    expect(screen.getByTestId("exito").textContent).toContain("Efectivo");
    const cuerpo = enviarOEncolar.mock.calls[0]![3] as { medio_pago: string; items: { cantidad: number; precio_unitario: number; margen_aplicado: number; explicacion: { pasos: string[] } }[] };
    expect(cuerpo.medio_pago).toBe("efectivo");
    expect(cuerpo.items[0]).toMatchObject({ cantidad: 1, precio_unitario: 3000, margen_aplicado: 100 });
    expect(cuerpo.items[0]!.explicacion.pasos.join(" ")).toContain("+ 100 % de margen");
    fireEvent.click(screen.getByTestId("cerrar-exito"));
    expect(screen.queryByTestId("exito")).toBeNull();
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
  });

  it("el dueño ve el total de hoy en un chip que abre la hoja con las ventas y permite anular", async () => {
    armar({ total: 10500, totales: { efectivo: 10500 }, ventas: [
      { id: "v1", fecha: "2026-09-14T12:00:00Z", medio_pago: "efectivo", total: "10500", estado: "confirmada", cliente: null, items: [
        { descripcion: "MECHA VENDER 8 MM", cantidad: "3", precio_unitario: "3000" }, { descripcion: "TORNILLO VENDER", cantidad: "1.5", precio_unitario: "1000" }] },
      { id: "v2", fecha: "2026-09-14T12:30:00Z", medio_pago: "tarjeta", total: "3000", estado: "anulada", cliente: null, items: [{ descripcion: "MECHA VENDER 8 MM", cantidad: "1", precio_unitario: "3000" }] },
    ] }, true);
    const chip = await screen.findByTestId("hoy");
    expect(chip.textContent).toContain("$10.500");
    fireEvent.click(chip);
    const ventas = within(screen.getByTestId("hoja-hoy")).getAllByTestId("venta-dia");
    expect(ventas).toHaveLength(2);
    expect(ventas[0]!.textContent).toContain("3 × MECHA VENDER 8 MM");
    expect(ventas[0]!.textContent).toContain("1.5 × TORNILLO VENDER");
    expect(ventas[0]!.textContent).toContain("Efectivo");
    expect(ventas[1]!.textContent).toContain("anulada");
    expect(within(ventas[1]!).queryByRole("button", { name: "Anular" })).toBeNull();
    window.prompt = () => "se arrepintió";
    fireEvent.click(within(ventas[0]!).getByRole("button", { name: "Anular" }));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/ventas/v1/anular", expect.objectContaining({ method: "POST" })));
  });

  it("'No llevó' anota la consulta y vacía la venta", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByRole("button", { name: "No llevó" }));
    expect(enviarOEncolar).toHaveBeenCalledWith("consulta", "POST", "/consultas", expect.objectContaining({ items: [expect.objectContaining({ producto_id: "mecha", precio_ofrecido: 3000 })] }));
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
  });

  it("sin resultados, Enter agrega un ítem libre con su precio a mano", () => {
    const { agregar } = armar();
    agregar("bolsa de arena");
    const libre = screen.getByTestId("item");
    expect(within(libre).getByTestId("descripcion-libre")).toHaveProperty("value", "bolsa de arena");
    fireEvent.change(within(libre).getByTestId("precio-manual"), { target: { value: "1500" } });
    expect(screen.getByTestId("total").textContent).toBe("$1.500");
  });
});
