/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));

import { Compras } from "./Compras";

const compras = [{ id: "c1", fecha: "2026-09-14", comprobante_tipo: "factura", comprobante_numero: "0001-00000777", total: "16000", estado: "confirmada", proveedor: "Proveedor uno", renglones: "2",
  items: [{ descripcion: "CINTA AISLADORA", cantidad: "10", costo_unitario: "1200" }, { descripcion: "PINCEL NUEVO", cantidad: "5", costo_unitario: "800" }] }];

function armar() {
  catalogo.actual = catalogoFalso([
    producto({ id: "cinta", descripcion: "CINTA AISLADORA", costo_neto: "1000" }),
    producto({ id: "cable", descripcion: "CABLE UNIPOLAR", costo_neto: "500", unidad: "m" }),
  ]);
  apiFalsa.mockImplementation(async (ruta: string) => {
    if (ruta === "/proveedores") return [{ id: "prov1", nombre: "Proveedor uno", activo: true }];
    if (ruta === "/compras") return compras;
    if (ruta === "/compras/semana") return { desde: "2026-09-08", por_proveedor: [{ proveedor: "Proveedor uno", compras: "1", total: "16000" }], total: 16000 };
    return [];
  });
  render(<Compras />);
  const busqueda = screen.getByTestId("busqueda");
  const agregar = (t: string) => { fireEvent.change(busqueda, { target: { value: t } }); fireEvent.keyDown(busqueda, { key: "Enter" }); };
  const renglon = (t: string) => screen.getAllByTestId("renglon").find((r) => r.textContent?.includes(t))!;
  return { agregar, renglon };
}

describe("Compras", () => {
  beforeEach(() => apiFalsa.mockReset());

  it("la cantidad es entera por unidad y con un decimal por metro; el costo viene de la lista", () => {
    const { agregar, renglon } = armar();
    agregar("cinta");
    const cant = within(renglon("CINTA")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.change(cant, { target: { value: "10.9" } });
    expect(cant.value).toBe("10");
    expect(renglon("CINTA").textContent).toContain("$1.000,00");
    agregar("cable");
    const metros = within(renglon("CABLE")).getByTestId("cantidad") as HTMLInputElement;
    expect(metros.getAttribute("step")).toBe("0.1");
    fireEvent.change(metros, { target: { value: "2.55" } });
    expect(metros.value).toBe("2.6");
    expect(screen.getByTestId("total").textContent).toContain("$11.300,00"); // 10 × 1000 + 2,6 × 500
  });

  it("compras recientes y gastos de la semana ya vienen desplegados; cada compra se abre y muestra sus renglones", async () => {
    armar();
    await screen.findByTestId("compras-recientes");
    expect(screen.getByRole("button", { name: /Compras recientes/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: /Gastos de la semana/ }).getAttribute("aria-expanded")).toBe("true");
    const compra = screen.getByTestId("compra-reciente");
    expect(within(compra).getAllByRole("row")).toHaveLength(1);
    fireEvent.click(within(compra).getAllByRole("row")[0]!);
    const filas = within(compra).getAllByRole("row");
    expect(filas).toHaveLength(3);
    expect(filas[1]!.textContent).toContain("10 × CINTA AISLADORA");
    expect(filas[1]!.textContent).toContain("$12.000,00");
    expect(filas[2]!.textContent).toContain("5 × PINCEL NUEVO");
  });

  it("registrar manda proveedor, comprobante y renglones, y muestra el resumen", async () => {
    const { agregar, renglon } = armar();
    await screen.findByRole("option", { name: "Proveedor uno" });
    fireEvent.change(screen.getByTestId("proveedor"), { target: { value: "prov1" } });
    fireEvent.change(screen.getByTestId("numero"), { target: { value: "0001-00000777" } });
    agregar("cinta");
    fireEvent.change(within(renglon("CINTA")).getByTestId("costo"), { target: { value: "1200" } });
    apiFalsa.mockImplementation(async (ruta: string, opciones?: RequestInit) => {
      if (ruta === "/compras" && opciones?.method === "POST") return { total: 1200, productos_nuevos: 0, costos_actualizados: 1 };
      if (ruta === "/compras/semana") return { desde: "2026-09-08", por_proveedor: [], total: 0 };
      return ruta === "/compras" ? compras : [];
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar ingreso" }));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toContain("Compra registrada: $1.200,00"));
    const llamada = apiFalsa.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === "POST")!;
    const cuerpo = JSON.parse((llamada[1] as { body: string }).body);
    expect(cuerpo).toMatchObject({ proveedor_id: "prov1", comprobante_tipo: "factura", comprobante_numero: "0001-00000777", items: [{ producto_id: "cinta", cantidad: 1, costo_unitario: 1200 }] });
  });
});
