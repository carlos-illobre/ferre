/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos, conTodosLosPermisos } from "../../../pruebas/sesion";
import { consultas } from "../../../datos/conexion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown; traerPorCodigo: (c: string) => Promise<unknown> } }));
vi.mock("../../../negocio/catalogo", async (original) => ({ ...(await original<typeof import("../../../negocio/catalogo")>()), ...((await import("../../../pruebas/catalogo-falso")).moduloDeCatalogo(() => catalogo.actual)) }));
vi.mock("../../../plataforma/camara/Escaner", () => ({ Escaner: () => null, hayCamara: () => false }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../../../datos/conexion", async (original) => ({ ...(await original<typeof import("../../../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../../datos/almacenamiento", async (original) => ({ ...(await original<typeof import("../../../datos/almacenamiento")>()), ...(({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a) })) }));

import { Deposito } from "./Deposito";
import { ComprasRecientes } from "../ComprasRecientes";

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
    if (ruta === "/compras/fotos") return { foto: "5d1f0a52-93a1-4f0e-8c1b-7a2e6d4c9b10.jpg" };
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

  it("el proveedor se elige en una hoja; la foto de la factura reemplaza al número; registrar manda todo y muestra el éxito", async () => {
    armar("ingreso");
    fireEvent.click(await screen.findByTestId("proveedor"));
    fireEvent.click(screen.getByTestId("opcion-proveedor"));
    expect(screen.getByTestId("proveedor").textContent).toContain("Proveedor uno");
    // El número no se tipea (RF-50): se sube la foto del comprobante.
    expect(screen.queryByTestId("numero")).toBeNull();
    fireEvent.change(screen.getByTestId("archivo-comprobante"), { target: { files: [new File(["x"], "factura.jpg", { type: "image/jpeg" })] } });
    await screen.findByTestId("ver-comprobante");
    agregar("cinta");
    fireEvent.change(within(renglon("CINTA")).getByTestId("costo"), { target: { value: "1200" } });
    expect(renglon("CINTA").textContent).toContain("+20 % vs. lista");
    fireEvent.click(screen.getByTestId("registrar"));
    await waitFor(() => expect(screen.getByTestId("exito").textContent).toContain("Ingreso registrado"));
    const llamada = apiFalsa.mock.calls.find((c) => c[0] === "/compras" && (c[1] as RequestInit | undefined)?.method === "POST")!;
    expect(JSON.parse((llamada[1] as { body: string }).body).comprobante_numero).toBeUndefined();
    expect(JSON.parse((llamada[1] as { body: string }).body)).toMatchObject({ proveedor_id: "prov1", comprobante_tipo: "factura", foto: "5d1f0a52-93a1-4f0e-8c1b-7a2e6d4c9b10.jpg", items: [{ producto_id: "cinta", cantidad: 1, costo_unitario: 1200 }] });
  });

  it("Ingreso es solo para recibir mercadería: las compras recientes no están acá (decisión 67)", async () => {
    armar("ingreso");
    await screen.findByTestId("proveedor");
    await waitFor(() => expect(apiFalsa.mock.calls.some((c) => c[0] === "/proveedores")).toBe(true));
    expect(screen.queryByTestId("compras-recientes")).toBeNull();
    expect(apiFalsa.mock.calls.some((c) => c[0] === "/compras" && !(c[1] as RequestInit | undefined)?.method)).toBe(false);
  });

  it("compras recientes (en Cómo va el negocio): cada compra se abre y muestra sus renglones", async () => {
    conTodosLosPermisos();
    consultas.clear(); // lo que trajeron las pruebas anteriores
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/compras" ? compras : []));
    render(<ComprasRecientes />);
    const compra = await screen.findByTestId("compra-reciente");
    expect(compra.textContent).not.toContain("CINTA AISLADORA");
    fireEvent.click(within(compra).getAllByRole("button")[0]!);
    expect(compra.textContent).toContain("10 un.");
    expect(compra.textContent).toContain("CINTA AISLADORA");
    expect(compra.textContent).toContain("$12.000");
    expect(compra.textContent).toContain("PINCEL NUEVO");
  });
});

describe("Depósito · Stock", () => {
  beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockClear(); });

  it("013-E10 con «Ver el dinero invertido», el total y el valor de cada producto (decisión 96)", async () => {
    armar("stock");
    const fila = await screen.findByTestId("fila-stock");
    // Como la v2: el valor está en la hoja del producto, con su stock y sus movimientos.
    fireEvent.click(within(fila).getByTestId("stock"));
    const hoja = await screen.findByTestId("detalle-stock");
    expect(within(hoja).getByTestId("valor-stock").textContent).toBe("$17.000");
    expect(screen.getByTestId("dinero-invertido-stock")).toBeTruthy();
  });

  it("013-E09 sin «Ver el dinero invertido», cantidades y ninguna suma de dinero; los movimientos de cada producto, y corrige", async () => {
    conPermisos("deposito.stock");
    armar("stock");
    const fila = await screen.findByTestId("fila-stock");
    expect(screen.queryByTestId("dinero-invertido-stock")).toBeNull();
    expect(screen.getByTestId("tabla-stock").textContent).not.toContain("$");
    expect(within(fila).getByTestId("foto-chica")).toBeTruthy(); // la foto del producto también se saca desde acá
    expect(within(fila).getByTestId("stock").textContent).toContain("17 un.");
    fireEvent.click(within(fila).getByTestId("stock"));
    const hoja = await screen.findByTestId("detalle-stock");
    await within(hoja).findByTestId("movimientos");
    expect(hoja.textContent).toContain("Es la suma de sus");
    expect(within(hoja).getByTestId("movimientos").textContent).toContain("+20");
    expect(within(hoja).queryByTestId("valor-stock")).toBeNull();
    fireEvent.change(within(hoja).getByTestId("cantidad-real"), { target: { value: "15" } });
    // El motivo es obligatorio, igual que en la computadora: sin motivo no se guarda.
    fireEvent.click(within(hoja).getByTestId("guardar-ajuste"));
    expect(within(hoja).getByRole("alert").textContent).toContain("Falta el motivo");
    expect(enviarOEncolar).not.toHaveBeenCalled();
    fireEvent.click(within(hoja).getByRole("button", { name: "Rotura" })); // un motivo frecuente, de un toque
    fireEvent.click(within(hoja).getByTestId("guardar-ajuste"));
    await waitFor(() => expect(enviarOEncolar).toHaveBeenCalledWith("stock.ajuste", "POST", "/stock/cinta/ajustes", { cantidad_real: 15, motivo: "Rotura" }));
  });
});

describe("Depósito · Contar", () => {
  beforeEach(() => { apiFalsa.mockReset(); });
  it("lista los sectores con su estado y ofrece crear uno", async () => {
    armar("contar");
    const sector = await screen.findByRole("button", { name: /Estantería bulones/ });
    expect(sector.textContent).toContain("Nunca contado");
    fireEvent.click(screen.getByTestId("sector-nuevo"));
    expect(screen.getByPlaceholderText(/Sector nuevo/)).toBeTruthy();
  });
});

// RF-72: lo que no se puede usar no se muestra.
describe("Depósito · según los permisos", () => {
  beforeEach(() => { apiFalsa.mockReset(); });

  it("quien solo ve las compras no tiene la pestaña Ingreso; las compras las ve en Cómo va el negocio, sin anular", async () => {
    conPermisos("deposito.compras");
    armar(null);
    expect(screen.queryByRole("tab", { name: "Ingreso" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Estanterías" })).toBeNull();
    const { container } = render(<ComprasRecientes soloVer />);
    fireEvent.click(within(await within(container).findByTestId("compra-reciente")).getAllByRole("button")[0]!);
    expect(container.textContent).toContain("CINTA AISLADORA");
    expect(within(container).queryByRole("button", { name: "Anular esta compra" })).toBeNull();
  });

  it("sin permisos de depósito abre en Inventario, que se puede mirar pero no corregir", async () => {
    conPermisos("ventas.registrar");
    armar(null);
    expect(screen.queryByRole("tab", { name: "Ingreso" })).toBeNull();
    fireEvent.click(await screen.findByTestId("stock"));
    expect(await screen.findByTestId("detalle-stock")).toBeTruthy();
    expect(screen.queryByTestId("corregir")).toBeNull();
  });

  it("021-E01 desde el menú, Depósito abre siempre en la primera pestaña: Stock · Compras · Contar, como la v2 (decisiones 56 y 149)", async () => {
    armar(null);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Stock", "Compras", "Contar"]);
    expect(screen.getByRole("tab", { name: "Stock" }).getAttribute("aria-selected")).toBe("true");
  });

  it("cada pestaña lleva a su propia dirección; el Ingreso y los Pedidos se ven con «Compras» marcada", () => {
    armar("stock");
    for (const [nombre, direccion] of [["Compras", "#/deposito/compras"], ["Contar", "#/deposito/contar"], ["Stock", "#/deposito/stock"]] as const) {
      fireEvent.click(screen.getByRole("tab", { name: nombre }));
      expect(location.hash).toBe(direccion);
    }
  });

  it("quien solo recibe mercadería entra a Compras directo al Ingreso", () => {
    conPermisos("deposito.ingresos");
    armar("compras");
    expect(screen.getByRole("tab", { name: "Compras" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByTestId("compras-recientes")).toBeNull();
  });

  it("021-T012 quien solo encarga compras entra a Compras a los Pedidos, no al Ingreso (decisión 153)", async () => {
    conPermisos("deposito.pedidos");
    armar("compras");
    expect(screen.getByRole("tab", { name: "Compras" }).getAttribute("aria-selected")).toBe("true");
    expect(await screen.findByTestId("pedido-nuevo")).toBeTruthy();
    expect(screen.queryByTestId("proveedor")).toBeNull();
  });

  it("entrar por la dirección a Estanterías sin permiso dice qué permiso falta", () => {
    conPermisos("deposito.ingresos");
    armar("contar");
    expect(screen.getByTestId("sin-permiso").textContent).toContain("Contar y corregir stock");
  });
});
