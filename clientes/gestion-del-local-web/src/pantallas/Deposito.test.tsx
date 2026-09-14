/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
vi.mock("../componentes/Escaner", () => ({ Escaner: () => null, hayCamara: () => false }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a) }));

import { Deposito } from "./Deposito";

const compras = [{ id: "c1", fecha: "2026-09-14", comprobante_tipo: "factura", comprobante_numero: "0001-00000777", total: "16000", estado: "confirmada", proveedor: "Proveedor uno", renglones: "2",
  items: [{ descripcion: "CINTA AISLADORA", cantidad: "10", costo_unitario: "1200" }, { descripcion: "PINCEL NUEVO", cantidad: "5", costo_unitario: "800" }] }];
const stock = { productos: [{ id: "cinta", stock: "17", costo_neto: "1000", proveedor: "Proveedor uno", valor: "17000", ultimo_movimiento: "2026-09-14T10:00:00Z" }], valor_total: 17000, por_proveedor: { "Proveedor uno": { unidades: 17, valor: 17000, productos: 1 } } };

function armar(sub: string | null) {
  catalogo.actual = catalogoFalso([
    producto({ id: "cinta", descripcion: "CINTA AISLADORA", costo_neto: "1000" }),
    producto({ id: "cable", descripcion: "CABLE UNIPOLAR", costo_neto: "500", unidad: "m" }),
  ]);
  apiFalsa.mockImplementation(async (ruta: string, opciones?: RequestInit) => {
    if (ruta === "/proveedores") return [{ id: "prov1", nombre: "Proveedor uno", activo: true }];
    if (ruta === "/compras" && opciones?.method === "POST") return { total: 1200, productos_nuevos: 0, costos_actualizados: 1 };
    if (ruta === "/compras") return compras;
    if (ruta === "/compras/semana") return { desde: "2026-09-08", por_proveedor: [{ proveedor: "Proveedor uno", compras: "1", total: "16000" }], total: 16000 };
    if (ruta === "/stock") return stock;
    if (ruta === "/stock/cinta/movimientos") return [{ id: "m1", tipo: "compra", cantidad: "20", referencia_tipo: null, fecha: "2026-09-10", nota: null }, { id: "m2", tipo: "venta", cantidad: "-3", referencia_tipo: null, fecha: "2026-09-12", nota: null }];
    if (ruta === "/sectores") return [{ id: "s1", nombre: "Estantería bulones", productos: "12", ultimo_conteo: null, conteo_abierto: null }];
    return [];
  });
  render(<Deposito sub={sub} />);
}

describe("Depósito · Ingreso", () => {
  beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockClear(); });
  const busqueda = () => screen.getByTestId("busqueda");
  const agregar = (t: string) => { fireEvent.change(busqueda(), { target: { value: t } }); fireEvent.keyDown(busqueda(), { key: "Enter" }); };
  const renglon = (t: string) => screen.getAllByTestId("renglon").find((r) => r.textContent?.includes(t))!;

  it("la cantidad es entera por unidad y con un decimal por metro; el costo viene de la lista", () => {
    armar("ingreso");
    agregar("cinta");
    const cant = within(renglon("CINTA")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.change(cant, { target: { value: "10.9" } });
    expect(cant.value).toBe("10");
    expect(renglon("CINTA").textContent).toContain("igual que la lista");
    agregar("cable");
    const metros = within(renglon("CABLE")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.change(metros, { target: { value: "2.55" } });
    expect(metros.value).toBe("2,6");
    expect(screen.getByTestId("total").textContent).toBe("$11.300"); // 10 × 1000 + 2,6 × 500
  });

  it("el proveedor se elige en una hoja; registrar manda todo y muestra el éxito", async () => {
    armar("ingreso");
    await screen.findByTestId("compras-recientes");
    fireEvent.click(screen.getByTestId("proveedor"));
    fireEvent.click(screen.getByTestId("opcion-proveedor"));
    expect(screen.getByTestId("proveedor").textContent).toContain("Proveedor uno");
    fireEvent.change(screen.getByTestId("numero"), { target: { value: "0001-00000777" } });
    agregar("cinta");
    fireEvent.change(within(renglon("CINTA")).getByTestId("costo"), { target: { value: "1200" } });
    expect(renglon("CINTA").textContent).toContain("+20 % vs. lista");
    fireEvent.click(screen.getByTestId("registrar"));
    await waitFor(() => expect(screen.getByTestId("exito").textContent).toContain("Ingreso registrado"));
    const llamada = apiFalsa.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === "POST")!;
    expect(JSON.parse((llamada[1] as { body: string }).body)).toMatchObject({ proveedor_id: "prov1", comprobante_tipo: "factura", comprobante_numero: "0001-00000777", items: [{ producto_id: "cinta", cantidad: 1, costo_unitario: 1200 }] });
  });

  it("compras recientes: cada compra se abre y muestra sus renglones; el gasto de la semana arriba", async () => {
    armar("ingreso");
    const compra = await screen.findByTestId("compra-reciente");
    expect(screen.getByTestId("gastos-semana").textContent).toContain("$16.000");
    expect(compra.textContent).not.toContain("CINTA AISLADORA");
    fireEvent.click(within(compra).getAllByRole("button")[0]!);
    expect(compra.textContent).toContain("10 ×");
    expect(compra.textContent).toContain("CINTA AISLADORA");
    expect(compra.textContent).toContain("$12.000,00");
    expect(compra.textContent).toContain("PINCEL NUEVO");
  });
});

describe("Depósito · Stock", () => {
  beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockClear(); });

  it("muestra el valor del inventario, el stock por producto, sus movimientos y corrige", async () => {
    armar(null);
    await screen.findByTestId("valorizacion");
    expect(screen.getByTestId("valorizacion").textContent).toContain("$17.000");
    const fila = screen.getByTestId("fila-stock");
    expect(within(fila).getByTestId("stock").textContent).toContain("17 u.");
    fireEvent.click(within(fila).getByTestId("stock"));
    await screen.findByTestId("movimientos");
    expect(fila.textContent).toContain("Stock 17 = suma de estos movimientos");
    expect(screen.getByTestId("movimientos").textContent).toContain("+20");
    fireEvent.click(within(fila).getByTestId("corregir"));
    fireEvent.change(within(fila).getByTestId("cantidad-real"), { target: { value: "15" } });
    fireEvent.click(within(fila).getByTestId("guardar-ajuste"));
    await waitFor(() => expect(enviarOEncolar).toHaveBeenCalledWith("stock.ajuste", "POST", "/stock/cinta/ajustes", { cantidad_real: 15, motivo: "" }));
  });
});

describe("Depósito · Contar", () => {
  beforeEach(() => { apiFalsa.mockReset(); });
  it("lista los sectores con su estado y ofrece crear uno", async () => {
    armar("contar");
    const sector = await screen.findByRole("button", { name: /Estantería bulones/ });
    expect(sector.textContent).toContain("nunca contado");
    fireEvent.click(screen.getByTestId("sector-nuevo"));
    expect(screen.getByPlaceholderText(/Sector nuevo/)).toBeTruthy();
  });
});
