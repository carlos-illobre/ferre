/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: vi.fn(async () => ({ encolado: false })), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { ErrorApi } from "../../api";
import { dibujar } from "../pruebas";
import { Recibir } from "./Recibir";

const PROVEEDORES = [{ id: "pv1", nombre: "Comodo", activo: true }, { id: "pv2", nombre: "Tresge", activo: true }, { id: "pv3", nombre: "Cerrado", activo: false }];
const COMPRAS = [
  { id: "co1", fecha: new Date().toLocaleDateString("sv-SE"), comprobante_tipo: "factura", comprobante_numero: "0003-00018954", total: "84091", estado: "confirmada", proveedor: "Comodo", renglones: "2", items: [{ descripcion: "MECHA RECIBIR 6 MM", cantidad: "10", costo_unitario: "1649.14" }, { descripcion: "CLAVO RECIBIR", cantidad: "2.5", costo_unitario: "4000" }] },
  { id: "co2", fecha: "2026-09-01", comprobante_tipo: "sin_comprobante", comprobante_numero: null, total: "47600", estado: "anulada", proveedor: "Tresge", renglones: "0", items: [] },
];
const SEMANA = { desde: "2026-10-05", por_proveedor: [{ proveedor: "Comodo", total: "84091", compras: "2" }, { proveedor: "Tresge", total: "100", compras: "1" }], total: 84191 };

function armar() {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA RECIBIR 6 MM", costo_neto: "1000", proveedor: "Comodo", codigo_barras: "7790000000017" }),
    producto({ id: "clavo", descripcion: "CLAVO RECIBIR", costo_neto: "4000", unidad: "kg", proveedores: [{ proveedor_id: "pv2", proveedor: "Tresge", costo_neto: "5000", fecha_lista: "2026-09-01", codigo_proveedor: "T1" }] }),
    producto({ id: "raro", descripcion: "RARO RECIBIR", costo_neto: null }),
  ]);
  catalogo.actual = falso;
  apiFalsa.mockImplementation(async (ruta: string, opciones?: RequestInit) => {
    if (ruta === "/proveedores") return PROVEEDORES;
    if (ruta === "/compras/semana") return SEMANA;
    if (ruta === "/compras" && opciones?.method === "POST") return { id: "nueva", total: 30000, productos_nuevos: 1, costos_actualizados: 1 };
    if (ruta === "/compras") return COMPRAS;
    return undefined;
  });
  const vista = dibujar(<Recibir />, "recibir");
  const busqueda = () => screen.getByTestId("busqueda");
  const agregar = (texto: string) => { fireEvent.change(busqueda(), { target: { value: texto } }); fireEvent.keyDown(busqueda(), { key: "Enter" }); };
  const renglon = (texto: string) => screen.getAllByTestId("renglon").find((r) => r.textContent?.includes(texto))!;
  const elegirProveedor = async (nombre: string) => { await screen.findByTestId("proveedor"); fireEvent.click(screen.getAllByTestId("opcion-proveedor").find((b) => b.textContent?.includes(nombre))!); };
  const registrado = () => apiFalsa.mock.calls.find((c) => c[0] === "/compras" && c[1]?.method === "POST");
  return { vista, agregar, renglon, elegirProveedor, registrado };
}

describe("Recibir mercadería (v4)", () => {
  beforeEach(() => { apiFalsa.mockReset(); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("arranca en «Factura», con el número y la fecha a la vista, y solo ofrece los proveedores activos", async () => {
    const { elegirProveedor } = armar();
    await elegirProveedor("Comodo");
    expect(screen.getAllByTestId("opcion-proveedor")).toHaveLength(2);
    expect(screen.getByTestId("comprobante-factura").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("numero")).toBeTruthy();
    expect((screen.getByTestId("fecha") as HTMLInputElement).value).toBe(new Date().toLocaleDateString("sv-SE"));
    fireEvent.click(screen.getByTestId("comprobante-sin_comprobante"));
    expect(screen.queryByTestId("numero")).toBeNull();
    expect(screen.getByTestId("ingreso-vacio").textContent).toContain("Buscá el primer producto");
  });

  it("el renglón trae el costo de la lista; si el comprobante dice otro, avisa cuánto subió o bajó, y el total suma", async () => {
    const { agregar, renglon, elegirProveedor } = armar();
    await elegirProveedor("Comodo");
    agregar("mecha recibir");
    const costo = within(renglon("MECHA")).getByTestId("costo") as HTMLInputElement;
    expect(costo.value).toBe("1.000,00");
    expect(within(renglon("MECHA")).queryByTestId("cambio-de-costo")).toBeNull();
    fireEvent.change(costo, { target: { value: "1100" } });
    expect(within(renglon("MECHA")).getByTestId("cambio-de-costo").textContent).toBe("Subió 10 %");
    fireEvent.change(costo, { target: { value: "900,00" } });
    expect(within(renglon("MECHA")).getByTestId("cambio-de-costo").textContent).toBe("Bajó 10 %");
    fireEvent.change(within(renglon("MECHA")).getByTestId("cantidad"), { target: { value: "10" } });
    expect(within(renglon("MECHA")).getByTestId("subtotal").textContent).toBe("$9.000");
    agregar("mecha recibir"); // el mismo producto suma al renglón que ya está
    expect(screen.getAllByTestId("renglon")).toHaveLength(1);
    expect(screen.getByTestId("total").textContent).toBe("$9.900");
  });

  it("por kilo la cantidad acepta un decimal y el costo de lista es el del proveedor elegido", async () => {
    const { agregar, renglon, elegirProveedor } = armar();
    await elegirProveedor("Tresge");
    agregar("clavo recibir");
    expect((within(renglon("CLAVO")).getByTestId("costo") as HTMLInputElement).value).toBe("5.000,00");
    expect(renglon("CLAVO").textContent).toContain("Cantidad en kilos");
    fireEvent.change(within(renglon("CLAVO")).getByTestId("cantidad"), { target: { value: "12,5" } });
    expect(screen.getByTestId("total").textContent).toBe("$62.500");
  });

  it("un código de barras agrega el producto; uno desconocido ofrece cargarlo como nuevo", async () => {
    const { agregar, renglon } = armar();
    await screen.findByTestId("proveedor");
    agregar("7790000000017");
    expect(renglon("MECHA")).toBeTruthy();
    agregar("7790000000999");
    expect(screen.getByTestId("codigo-desconocido").textContent).toContain("7790000000999 no está en el catálogo");
  });

  it("sin proveedor o sin costo no registra: dice qué falta y se va al corregir", async () => {
    const { agregar, renglon, elegirProveedor, registrado } = armar();
    await screen.findByTestId("proveedor");
    agregar("raro recibir");
    expect(within(renglon("RARO")).getByTestId("falta-el-costo")).toBeTruthy();
    fireEvent.click(screen.getByTestId("registrar"));
    expect(screen.getByTestId("error-ingreso").textContent).toContain("Elegí de quién llegó");
    await elegirProveedor("Comodo");
    fireEvent.click(screen.getByTestId("registrar"));
    expect(screen.getByTestId("error-ingreso").textContent).toContain("Falta el costo de un producto");
    fireEvent.change(within(renglon("RARO")).getByTestId("costo"), { target: { value: "250" } });
    expect(screen.queryByTestId("error-ingreso")).toBeNull();
    expect(registrado()).toBeUndefined();
  });

  it("registrar manda proveedor, comprobante y renglones (con el producto nuevo) y muestra el resultado", async () => {
    const { agregar, renglon, elegirProveedor, registrado } = armar();
    await elegirProveedor("Comodo");
    fireEvent.change(screen.getByTestId("numero"), { target: { value: " 0003-00012851 " } });
    fireEvent.change(screen.getByTestId("fecha"), { target: { value: "2026-10-08" } });
    agregar("mecha recibir");
    fireEvent.change(within(renglon("MECHA")).getByTestId("costo"), { target: { value: "1.722,50" } });
    fireEvent.change(within(renglon("MECHA")).getByTestId("cantidad"), { target: { value: "10" } });
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "disco nuevo" } });
    fireEvent.click(screen.getByTestId("agregar-nuevo"));
    expect((screen.getByTestId("descripcion-nueva") as HTMLInputElement).value).toBe("disco nuevo");
    fireEvent.click(screen.getByTestId("agregar-al-ingreso"));
    expect(renglon("disco nuevo").textContent).toContain("Producto nuevo");
    fireEvent.change(within(renglon("disco nuevo")).getByTestId("costo"), { target: { value: "990" } });
    fireEvent.click(screen.getByTestId("registrar"));
    await waitFor(() => expect(registrado()).toBeTruthy());
    const cuerpo = JSON.parse(registrado()![1].body as string);
    expect(cuerpo).toMatchObject({
      proveedor_id: "pv1", fecha: "2026-10-08", comprobante_tipo: "factura", comprobante_numero: "0003-00012851",
      items: [{ producto_id: "mecha", descripcion: "MECHA RECIBIR 6 MM", cantidad: 10, costo_unitario: 1722.5 }, { producto_id: null, descripcion: "disco nuevo", cantidad: 1, costo_unitario: 990 }],
    });
    expect(cuerpo.id).toMatch(/^[0-9a-f-]{36}$/);
    const exito = await screen.findByTestId("exito");
    expect(exito.textContent).toContain("Ingreso registrado");
    expect(exito.textContent).toContain("$30.000");
    expect(exito.textContent).toContain("Comodo · 2 productos");
    expect(exito.textContent).toContain("1 costo actualizado y 1 producto nuevo");
    fireEvent.click(screen.getByTestId("cerrar-exito"));
    expect(screen.getByTestId("ingreso-vacio")).toBeTruthy();
    expect(localStorage.getItem("ferre.v4.ingreso")).toBeNull();
  });

  it("si el servidor lo rechaza, lo cargado sigue ahí con el motivo", async () => {
    const { agregar, elegirProveedor } = armar();
    await elegirProveedor("Comodo");
    agregar("mecha recibir");
    const base = apiFalsa.getMockImplementation()!;
    apiFalsa.mockImplementation(async (ruta: string, opciones?: RequestInit) => { if (ruta === "/compras" && opciones?.method === "POST") throw new ErrorApi(400, "Ya hay una factura con ese número"); return base(ruta, opciones); });
    fireEvent.click(screen.getByTestId("registrar"));
    expect((await screen.findByTestId("error-ingreso")).textContent).toContain("Ya hay una factura con ese número");
    expect(screen.getAllByTestId("renglon")).toHaveLength(1);
  });

  it("el ingreso a medio cargar sobrevive a una recarga", async () => {
    const { agregar, elegirProveedor, vista } = armar();
    await elegirProveedor("Tresge");
    fireEvent.click(screen.getByTestId("comprobante-remito"));
    fireEvent.change(screen.getByTestId("numero"), { target: { value: "0001-44" } });
    agregar("mecha recibir");
    vista.unmount();
    dibujar(<Recibir />, "recibir");
    await screen.findByTestId("proveedor");
    expect(screen.getAllByTestId("renglon")).toHaveLength(1);
    expect(screen.getByTestId("comprobante-remito").getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByTestId("numero") as HTMLInputElement).value).toBe("0001-44");
    expect(screen.getAllByTestId("opcion-proveedor").find((b) => b.textContent?.includes("Tresge"))!.getAttribute("aria-pressed")).toBe("true");
  });

  it("sin conexión se sigue cargando, pero registrar espera a que vuelva internet", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { agregar } = armar();
    await screen.findByTestId("proveedor");
    agregar("mecha recibir");
    expect(screen.getByTestId("sin-conexion").textContent).toContain("registrar el ingreso necesita internet");
    expect((screen.getByTestId("registrar") as HTMLButtonElement).disabled).toBe(true);
  });

  it("muestra lo gastado en la semana y las compras recientes; una compra se abre y se anula con confirmación", async () => {
    armar();
    const semana = await screen.findByTestId("gastos-semana");
    expect(semana.textContent).toContain("$84.191");
    expect(semana.textContent).toContain("3 compras");
    const compras = await screen.findAllByTestId("compra-reciente");
    expect(compras).toHaveLength(2);
    expect(compras[0]!.textContent).toContain("Hoy");
    expect(compras[1]!.textContent).toContain("Anulada");
    fireEvent.click(compras[0]!);
    const hoja = screen.getByTestId("hoja-compra");
    expect(hoja.textContent).toContain("Factura 0003-00018954");
    expect(hoja.textContent).toContain("2,5 kilos · $4.000,00 el kilo");
    fireEvent.click(screen.getByTestId("anular"));
    expect(screen.getByTestId("hoja-anular").textContent).toContain("¿Anular la compra a Comodo de $84.091?");
    fireEvent.click(screen.getByTestId("confirmar-si"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/compras/co1/anular", expect.objectContaining({ method: "POST" })));
    expect((await screen.findByTestId("mensaje")).textContent).toContain("Compra anulada");
  });

  it("una compra anulada se puede abrir pero no volver a anular", async () => {
    armar();
    const compras = await screen.findAllByTestId("compra-reciente");
    fireEvent.click(compras[1]!);
    expect(screen.getByTestId("hoja-compra").textContent).toContain("Sin comprobante");
    expect(screen.queryByTestId("anular")).toBeNull();
  });
});
