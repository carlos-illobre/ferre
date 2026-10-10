/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
vi.mock("../../componentes/Escaner", () => ({ Escaner: () => null, hayCamara: () => false }));
vi.mock("../../puesto", () => ({ enviarCodigoAlPuesto: vi.fn(), escucharPuesto: vi.fn(() => () => undefined), puestoRemoto: () => null, puestoLocal: () => null, guardarPuestoLocal: vi.fn() }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { Vender } from "./Vender";

function armar() {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA VENDER 8 MM", costo_neto: "1000", margen_elegido: 100 }),
    producto({ id: "tornillo", descripcion: "TORNILLO VENDER", costo_neto: "10" }),
  ]);
  (falso as unknown as { clientes: unknown[] }).clientes = [{ id: "c1", nombre: "Constructora Uno", telefono: null, cuenta_corriente: true, deuda: "5000" }];
  catalogo.actual = { useCatalogoFalso: () => ({ ...(falso.useCatalogoFalso() as object), clientes: (falso as unknown as { clientes: unknown[] }).clientes }) };
  apiFalsa.mockImplementation(async (ruta: string) => (ruta.startsWith("/ventas") ? { ventas: [], totales: {}, total: 0 } : []));
  render(<Vender />);
  const busqueda = screen.getByTestId("busqueda");
  const agregar = (texto: string) => { fireEvent.change(busqueda, { target: { value: texto } }); fireEvent.keyDown(busqueda, { key: "Enter" }); };
  const item = (texto: string) => screen.getAllByTestId("item").find((i) => i.textContent?.includes(texto))!;
  return { falso, busqueda, agregar, item };
}

describe("Vender (v2)", () => {
  beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockClear(); });

  it("la venta nueva dice qué hacer para empezar", () => {
    armar();
    expect(screen.getByText("Venta nueva")).toBeTruthy();
    expect(screen.queryByTestId("cobro")).toBeNull();
  });

  it("Enter agrega, el precio se redondea para arriba a $1.000 y el total suma", () => {
    const { agregar, item } = armar();
    agregar("mecha vender"); // 1000 × 2 × 1,21 = 2420 → 3000
    expect(screen.getByTestId("total").textContent).toBe("$3.000");
    fireEvent.change(within(item("MECHA")).getByTestId("cantidad"), { target: { value: "3" } });
    expect(screen.getByTestId("total").textContent).toBe("$9.000");
  });

  it("la cantidad no deja ceros a la izquierda y por unidad es entera", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    const cantidad = within(item("MECHA")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.change(cantidad, { target: { value: "2.7" } });
    expect(cantidad.value).toBe("2");
    fireEvent.change(cantidad, { target: { value: "" } });
    expect(cantidad.value).toBe("");
    fireEvent.blur(cantidad);
    expect(cantidad.value).toBe("1");
  });

  it("un renglón sin precio ya muestra los márgenes; elegir uno lo guarda en el producto y le pone precio", () => {
    const { agregar, item, falso } = armar();
    agregar("tornillo vender");
    expect(within(item("TORNILLO")).getByTestId("sin-precio")).toBeTruthy();
    fireEvent.click(within(item("TORNILLO")).getByTestId("margen-300"));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 300 });
    expect(within(item("TORNILLO")).queryByTestId("sin-precio")).toBeNull();
    expect(screen.getByTestId("total").textContent).toBe("$1.000");
  });

  it("el precio a mano vale para esta venta y no cambia el producto", () => {
    const { agregar, item, falso } = armar();
    agregar("tornillo vender");
    fireEvent.change(within(item("TORNILLO")).getByTestId("precio-manual"), { target: { value: "2500" } });
    expect(screen.getByTestId("total").textContent).toBe("$3.000");
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
  });

  it("cobrar sin precio o sin medio de pago avisa en el cobro, y el aviso se va al corregir", () => {
    const { agregar, item } = armar();
    agregar("tornillo vender");
    fireEvent.click(screen.getByTestId("cobrar"));
    expect(screen.getByTestId("error-cobro").textContent).toContain("Hay productos sin precio");
    fireEvent.click(within(item("TORNILLO")).getByTestId("margen-100"));
    expect(screen.queryByTestId("error-cobro")).toBeNull();
    fireEvent.click(screen.getByTestId("cobrar"));
    expect(screen.getByTestId("error-cobro").textContent).toContain("Elegí cómo paga");
    expect(enviarOEncolar).not.toHaveBeenCalled();
  });

  it("cuenta corriente pide el cliente en el mismo gesto y el éxito lo nombra", async () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.keyDown(window, { key: "F8" });
    const hoja = screen.getByTestId("hoja-clientes");
    expect(hoja.textContent).toContain("debe $5.000");
    fireEvent.click(within(hoja).getByTestId("cliente-opcion"));
    expect(screen.getByTestId("cliente").textContent).toContain("Constructora Uno");
    fireEvent.keyDown(window, { key: "F2" });
    await waitFor(() => expect(screen.getByTestId("exito")).toBeTruthy());
    expect(screen.getByTestId("exito").textContent).toContain("Cuenta corriente · Constructora Uno");
    const [tipo, metodo, ruta, cuerpo] = enviarOEncolar.mock.calls[0]!;
    expect([tipo, metodo, ruta]).toEqual(["venta", "POST", "/ventas"]);
    expect(cuerpo).toMatchObject({ medio_pago: "cuenta_corriente", cliente_id: "c1", items: [{ producto_id: "mecha", cantidad: 1, precio_unitario: 3000, margen_aplicado: 100 }] });
  });

  it("con la venta armada, F5 y el Enter final la cobran y dejan la venta vacía", async () => {
    const { agregar, busqueda } = armar();
    agregar("mecha vender");
    fireEvent.keyDown(window, { key: "F5" });
    fireEvent.keyDown(busqueda, { key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("exito").textContent).toContain("Venta registrada"));
    expect(screen.getByTestId("exito").textContent).toContain("$3.000");
    fireEvent.click(screen.getByTestId("cerrar-exito"));
    expect(screen.queryByTestId("item")).toBeNull();
  });

  it("sin conexión la venta queda guardada en el dispositivo y lo dice", async () => {
    enviarOEncolar.mockResolvedValueOnce({ encolado: true });
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("medio-efectivo"));
    fireEvent.click(screen.getByTestId("cobrar"));
    await waitFor(() => expect(screen.getByTestId("exito").textContent).toContain("guardada en este dispositivo"));
  });

  it("«No llevó» anota la consulta con lo ofrecido y vacía la venta", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("no-llevo"));
    expect(enviarOEncolar).toHaveBeenCalledWith("consulta", "POST", "/consultas", expect.objectContaining({ items: [expect.objectContaining({ producto_id: "mecha", precio_ofrecido: 3000 })] }));
    expect(screen.queryByTestId("item")).toBeNull();
    expect(screen.getByTestId("mensaje").textContent).toContain("No llevó");
  });

  it("lo que no está en ninguna lista se agrega como ítem libre", () => {
    const { agregar } = armar();
    agregar("cosa rara");
    expect((screen.getByTestId("descripcion-libre") as HTMLInputElement).value).toBe("cosa rara");
  });
});
