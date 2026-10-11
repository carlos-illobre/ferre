/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { ErrorApi } from "../../api";
import { dibujar } from "../pruebas";
import { Stock } from "./Stock";

const fila = (id: string, stock: number, costo: number | null) => ({ id, stock: String(stock), costo_neto: costo === null ? null : String(costo), proveedor: "Comodo", valor: String(Math.max(0, stock) * (costo ?? 0)), ultimo_movimiento: null });
const FILAS = [fila("mecha", 18, 1000), fila("clavo", 2.5, 4000), fila("cinta", 0, 500), fila("llave", -2, 9000)];
const MOVIMIENTOS = [
  { id: "m1", tipo: "venta", cantidad: "-1", referencia_tipo: "venta", fecha: new Date().toISOString(), nota: null },
  { id: "m2", tipo: "compra", cantidad: "10", referencia_tipo: "compra", fecha: "2026-10-01", nota: "Factura 0003-1" },
  { id: "m3", tipo: "ajuste", cantidad: "-1", referencia_tipo: "ajuste", fecha: "2026-09-20T18:06:00", nota: "había 10, hay 9: rotura" },
];

function armar(filas = FILAS) {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA STOCK 6 MM", marca: "Bosch" }),
    producto({ id: "clavo", descripcion: "CLAVO STOCK", unidad: "kg" }),
    producto({ id: "cinta", descripcion: "CINTA STOCK" }),
    producto({ id: "llave", descripcion: "LLAVE STOCK" }),
    producto({ id: "nunca", descripcion: "NUNCA SE MOVIO STOCK" }),
  ]);
  catalogo.actual = falso;
  apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/stock" ? { productos: filas, valor_total: 28000 } : ruta.endsWith("/movimientos") ? MOVIMIENTOS : []));
  const vista = dibujar(<Stock />, "stock");
  const renglon = (texto: string) => screen.getAllByTestId("stock").find((r) => r.textContent?.includes(texto))!;
  return { vista, renglon };
}

describe("Stock (v4)", () => {
  beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockClear(); enviarOEncolar.mockImplementation(async () => ({ encolado: false })); });

  it("muestra la plata invertida, cuántos están en cero y en negativo, y cada producto con su cantidad", async () => {
    const { renglon } = armar();
    expect((await screen.findByTestId("plata-invertida")).textContent).toBe("$28.000");
    expect(screen.getByTestId("en-cero").textContent).toBe("1");
    expect(screen.getByTestId("en-negativo").textContent).toBe("1");
    // Solo lo que alguna vez se movió; lo que nunca tuvo stock aparece al buscarlo.
    expect(screen.getAllByTestId("stock")).toHaveLength(4);
    expect(renglon("MECHA").textContent).toContain("18 unidades");
    expect(renglon("CLAVO").textContent).toContain("2,5 kilos");
    expect(renglon("CINTA").textContent).toContain("En cero");
    expect(renglon("LLAVE").textContent).toContain("−2 unidades");
  });

  it("el filtro deja lo que está en cero o en negativo y el buscador llega a todo el catálogo", async () => {
    armar();
    await screen.findByTestId("plata-invertida");
    fireEvent.click(screen.getByTestId("filtro-sin-stock"));
    expect(screen.getAllByTestId("stock")).toHaveLength(2);
    fireEvent.click(screen.getByTestId("filtro-todos"));
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "nunca se movio" } });
    expect(screen.getAllByTestId("stock")).toHaveLength(1);
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "zzzz" } });
    expect(screen.getByTestId("sin-resultados").textContent).toContain("No hay productos con «zzzz»");
    fireEvent.click(within(screen.getByTestId("sin-resultados")).getByRole("button"));
    expect(screen.getAllByTestId("stock")).toHaveLength(4);
  });

  it("el detalle muestra cuánto hay y los movimientos que lo explican", async () => {
    const { renglon } = armar();
    await screen.findByTestId("plata-invertida");
    fireEvent.click(renglon("MECHA"));
    expect(screen.getByTestId("hay-ahora").textContent).toBe("18 unidades");
    const movimientos = await screen.findByTestId("movimientos");
    expect(apiFalsa).toHaveBeenCalledWith("/stock/mecha/movimientos");
    expect(movimientos.textContent).toContain("Venta");
    expect(movimientos.textContent).toContain("+10");
    expect(movimientos.textContent).toContain("Corrección");
    expect(movimientos.textContent).toContain("había 10, hay 9: rotura");
  });

  it("corregir arranca en lo que figura, exige un cambio y un motivo, y guarda la cantidad real", async () => {
    const { renglon } = armar();
    await screen.findByTestId("plata-invertida");
    fireEvent.click(renglon("MECHA"));
    fireEvent.click(screen.getByTestId("corregir"));
    const cuantas = screen.getByTestId("cantidad-real") as HTMLInputElement;
    expect(cuantas.value).toBe("18");
    fireEvent.click(screen.getByTestId("guardar-ajuste"));
    expect(screen.getByTestId("error-cantidad")).toBeTruthy();
    fireEvent.change(cuantas, { target: { value: "15" } });
    fireEvent.click(screen.getByTestId("guardar-ajuste"));
    expect(screen.getByTestId("correccion").textContent).toContain("sin motivo no se guarda");
    expect(enviarOEncolar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Rotura"));
    fireEvent.click(screen.getByTestId("guardar-ajuste"));
    await waitFor(() => expect(enviarOEncolar).toHaveBeenCalledWith("stock.ajuste", "POST", "/stock/mecha/ajustes", { cantidad_real: 15, motivo: "Rotura" }));
    expect((await screen.findByTestId("mensaje")).textContent).toContain("había 18, hay 15");
    expect(screen.queryByTestId("correccion")).toBeNull();
    // Con conexión se vuelve a pedir el stock.
    expect(apiFalsa.mock.calls.filter((c) => c[0] === "/stock").length).toBe(2);
  });

  it("sin conexión la corrección queda guardada acá y la lista ya muestra la cantidad nueva", async () => {
    const { renglon } = armar();
    await screen.findByTestId("plata-invertida");
    enviarOEncolar.mockResolvedValueOnce({ encolado: true });
    fireEvent.click(renglon("CINTA"));
    fireEvent.click(screen.getByTestId("corregir"));
    fireEvent.change(screen.getByTestId("cantidad-real"), { target: { value: "7" } });
    fireEvent.change(screen.getByTestId("motivo"), { target: { value: "apareció una caja" } });
    fireEvent.click(screen.getByTestId("guardar-ajuste"));
    expect((await screen.findByTestId("mensaje")).textContent).toContain("Se envía cuando vuelva internet");
    expect(enviarOEncolar.mock.calls[0]![3]).toEqual({ cantidad_real: 7, motivo: "apareció una caja" });
    expect(renglon("CINTA").textContent).toContain("7 unidades");
    expect(screen.getByTestId("en-cero").textContent).toBe("0");
  });

  it("si el servidor rechaza la corrección, lo dice en la hoja y no la cierra", async () => {
    const { renglon } = armar();
    await screen.findByTestId("plata-invertida");
    enviarOEncolar.mockRejectedValueOnce(new ErrorApi(400, "Decí cuántas hay"));
    fireEvent.click(renglon("MECHA"));
    fireEvent.click(screen.getByTestId("corregir"));
    fireEvent.change(screen.getByTestId("cantidad-real"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Se perdió"));
    fireEvent.click(screen.getByTestId("guardar-ajuste"));
    expect((await screen.findByTestId("error-correccion")).textContent).toContain("Decí cuántas hay");
  });

  it("sin stock cargado invita a recibir mercadería", async () => {
    armar([]);
    expect((await screen.findByTestId("sin-stock-cargado")).textContent).toContain("Todavía no hay stock cargado");
  });

  it("si no se puede cargar lo dice y deja reintentar", async () => {
    catalogo.actual = catalogoFalso([producto({ id: "mecha", descripcion: "MECHA STOCK 6 MM" })]);
    apiFalsa.mockRejectedValueOnce(new ErrorApi(500, "Se cayó la base"));
    apiFalsa.mockImplementation(async () => ({ productos: FILAS, valor_total: 28000 }));
    dibujar(<Stock />, "stock");
    expect((await screen.findByTestId("error-de-carga")).textContent).toContain("Se cayó la base");
    fireEvent.click(screen.getByTestId("reintentar"));
    expect((await screen.findByTestId("plata-invertida")).textContent).toBe("$28.000");
  });
});
