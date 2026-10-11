/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

// El patrón para simular la API en las pruebas de la v4: se reemplazan los módulos que salen
// a la red (`api`, `cola`, y acá también `catalogo` y `puesto`) y se mira qué se les pidió.
const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
vi.mock("../../puesto", () => ({ enviarCodigoAlPuesto: vi.fn(async () => false), escucharPuesto: vi.fn(() => () => undefined), puestoRemoto: () => null, puestoLocal: () => null, guardarPuestoLocal: vi.fn() }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { ErrorApi } from "../../api";
import { DURACION_DEL_AVISO } from "../piezas";
import { dibujar } from "../pruebas";
import { reiniciarVenta, Vender } from "./Vender";

function armar() {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA VENDER 8 MM", costo_neto: "1000", margen_elegido: 100, codigo_barras: "7790000000017" }),
    producto({ id: "tornillo", descripcion: "TORNILLO VENDER", costo_neto: "10" }),
    producto({ id: "clavo", descripcion: "CLAVO VENDER", costo_neto: "1000", margen_elegido: 100, unidad: "kg" }),
    producto({ id: "raro", descripcion: "RARO SIN COSTO", costo_neto: null }),
  ]);
  const clientes = [{ id: "c1", nombre: "Constructora Uno", telefono: null, cuenta_corriente: true, deuda: "5000" }];
  catalogo.actual = { useCatalogoFalso: () => ({ ...(falso.useCatalogoFalso() as object), clientes }) };
  apiFalsa.mockImplementation(async () => []);
  const vista = dibujar(<Vender />, "vender");
  const busqueda = () => screen.getByTestId("busqueda");
  const agregar = (texto: string) => { fireEvent.change(busqueda(), { target: { value: texto } }); fireEvent.keyDown(busqueda(), { key: "Enter" }); };
  const item = (texto: string) => screen.getAllByTestId("item").find((i) => i.textContent?.includes(texto))!;
  return { falso, busqueda, agregar, item, vista };
}

describe("Vender (v4)", () => {
  beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockClear(); reiniciarVenta(); enviarOEncolar.mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("la venta vacía dice qué hacer para empezar", () => {
    armar();
    expect(screen.getByTestId("venta-vacia").textContent).toContain("Todavía no hay nada en la venta");
    expect(screen.queryByTestId("cobrar")).toBeNull();
  });

  it("buscar muestra el precio de cada producto y cuál está sin precio", () => {
    const { busqueda } = armar();
    fireEvent.change(busqueda(), { target: { value: "vender" } });
    const filas = screen.getAllByTestId("sugerencia");
    expect(filas).toHaveLength(3);
    const fila = (texto: string) => filas.find((f) => f.textContent?.includes(texto))!;
    expect(fila("MECHA").textContent).toContain("$3.000");
    expect(fila("TORNILLO").textContent).toContain("Sin precio");
    fireEvent.click(fila("MECHA"));
    expect(screen.getByTestId("total").textContent).toBe("$3.000");
  });

  it("Enter agrega, el precio se redondea para arriba a $1.000 y el total suma", () => {
    const { agregar, item } = armar();
    agregar("mecha vender"); // 1000 × 2 × 1,21 = 2420 → 3000
    expect(screen.getByTestId("total").textContent).toBe("$3.000");
    fireEvent.change(within(item("MECHA")).getByTestId("cantidad"), { target: { value: "3" } });
    expect(screen.getByTestId("total").textContent).toBe("$9.000");
    agregar("mecha vender"); // el mismo producto suma al renglón que ya está
    expect(screen.getAllByTestId("item")).toHaveLength(1);
    expect(screen.getByTestId("total").textContent).toBe("$12.000");
  });

  it("por unidad la cantidad es entera; por kilo acepta un decimal, y la unidad queda guardada en el producto", () => {
    const { agregar, item, falso } = armar();
    agregar("mecha vender");
    const cantidad = within(item("MECHA")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.change(cantidad, { target: { value: "2.7" } });
    expect(cantidad.value).toBe("2");
    agregar("clavo vender");
    const kilos = within(item("CLAVO")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.change(kilos, { target: { value: "2,5" } }); // 3000 × 2,5 = 7500 → 8000
    expect(within(item("CLAVO")).getByTestId("subtotal").textContent).toBe("$8.000");
    fireEvent.change(within(item("MECHA")).getByTestId("unidad"), { target: { value: "m" } });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { unidad: "m" });
  });

  it("un renglón sin precio ya muestra los márgenes; elegir uno lo guarda en el producto y le pone precio", () => {
    const { agregar, item, falso } = armar();
    agregar("tornillo vender");
    expect(within(item("TORNILLO")).getByTestId("sin-precio")).toBeTruthy();
    fireEvent.click(within(item("TORNILLO")).getByTestId("margen-300"));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 300 });
    expect(within(item("TORNILLO")).queryByTestId("sin-precio")).toBeNull();
    expect(screen.getByTestId("total").textContent).toBe("$1.000");
    // Los márgenes siguen a la vista, por si se eligió mal.
    expect(within(item("TORNILLO")).getByTestId("margen-100")).toBeTruthy();
  });

  it("el precio a mano vale para esta venta y no cambia el producto; sin costo es la única salida", () => {
    const { agregar, item, falso } = armar();
    agregar("tornillo vender");
    fireEvent.change(within(item("TORNILLO")).getByTestId("precio-manual"), { target: { value: "2500" } });
    expect(screen.getByTestId("total").textContent).toBe("$3.000");
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
    agregar("raro sin costo");
    expect(within(item("RARO")).queryByTestId("margen-100")).toBeNull();
    expect(within(item("RARO")).getByTestId("precio-manual")).toBeTruthy();
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
    expect(hoja.textContent).toContain("Debe $5.000");
    fireEvent.click(within(hoja).getByTestId("cliente-opcion"));
    expect(screen.getByTestId("cliente").textContent).toContain("Constructora Uno");
    fireEvent.keyDown(window, { key: "F2" });
    await waitFor(() => expect(screen.getByTestId("exito")).toBeTruthy());
    expect(screen.getByTestId("exito").textContent).toContain("Va a la cuenta corriente de Constructora Uno");
    const [tipo, metodo, ruta, cuerpo] = enviarOEncolar.mock.calls[0]!;
    expect([tipo, metodo, ruta]).toEqual(["venta", "POST", "/ventas"]);
    expect(cuerpo).toMatchObject({ medio_pago: "cuenta_corriente", cliente_id: "c1", items: [{ producto_id: "mecha", cantidad: 1, precio_unitario: 3000, margen_aplicado: 100 }] });
  });

  it("con la venta armada, F5 y el Enter final la cobran, descuentan el stock local y dejan la venta vacía", async () => {
    const { agregar, busqueda, falso } = armar();
    agregar("mecha vender");
    fireEvent.keyDown(window, { key: "F5" });
    fireEvent.keyDown(busqueda(), { key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("exito").textContent).toContain("Venta registrada"));
    expect(screen.getByTestId("exito").textContent).toContain("$3.000");
    expect(screen.getByTestId("exito").textContent).toContain("Pagó en efectivo");
    expect(falso.ajustarStockLocal).toHaveBeenCalledWith("mecha", -1);
    fireEvent.click(screen.getByTestId("cerrar-exito"));
    expect(screen.queryByTestId("item")).toBeNull();
    expect(screen.getByTestId("venta-vacia")).toBeTruthy();
  });

  it("sin conexión la venta queda guardada en el dispositivo y lo dice", async () => {
    enviarOEncolar.mockResolvedValueOnce({ encolado: true });
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("medio-efectivo"));
    fireEvent.click(screen.getByTestId("cobrar"));
    await waitFor(() => expect(screen.getByTestId("exito").textContent).toContain("Venta guardada sin conexión"));
    expect(screen.getByTestId("exito").textContent).toContain("Se envía sola cuando vuelva internet");
  });

  it("si el servidor rechaza la venta, lo dice en el cobro y la venta sigue armada", async () => {
    enviarOEncolar.mockRejectedValueOnce(new ErrorApi(409, "El cliente no tiene cuenta corriente"));
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("medio-tarjeta"));
    fireEvent.click(screen.getByTestId("cobrar"));
    await waitFor(() => expect(screen.getByTestId("error-cobro").textContent).toContain("El cliente no tiene cuenta corriente"));
    expect(screen.getAllByTestId("item")).toHaveLength(1);
  });

  it("«No llevó» vacía la venta y anota la consulta con lo ofrecido cuando ya no se puede deshacer", () => {
    vi.useFakeTimers();
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("no-llevo"));
    expect(screen.queryByTestId("item")).toBeNull();
    expect(screen.getByTestId("mensaje").textContent).toContain("No llevó");
    expect(enviarOEncolar).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(DURACION_DEL_AVISO); });
    expect(enviarOEncolar).toHaveBeenCalledWith("consulta", "POST", "/consultas", expect.objectContaining({ items: [expect.objectContaining({ producto_id: "mecha", precio_ofrecido: 3000 })] }));
  });

  it("«Deshacer» devuelve la venta y no anota nada", () => {
    vi.useFakeTimers();
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("no-llevo"));
    fireEvent.click(within(screen.getByTestId("mensaje")).getByText("Deshacer"));
    expect(screen.getAllByTestId("item")).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(DURACION_DEL_AVISO * 2); });
    expect(enviarOEncolar).not.toHaveBeenCalled();
  });

  it("lo que no está en productos se agrega con su nombre y el precio a mano", () => {
    const { agregar, item } = armar();
    agregar("cosa rara");
    const hoja = screen.getByTestId("hoja-libre");
    expect((within(hoja).getByTestId("descripcion-libre") as HTMLInputElement).value).toBe("cosa rara");
    fireEvent.click(within(hoja).getByTestId("agregar-a-la-venta"));
    expect(hoja.textContent).toContain("Poné el precio.");
    fireEvent.change(within(hoja).getByTestId("precio-libre"), { target: { value: "5000" } });
    fireEvent.click(within(hoja).getByTestId("agregar-a-la-venta"));
    expect(item("cosa rara").textContent).toContain("No está en productos");
    expect(screen.getByTestId("total").textContent).toBe("$5.000");
  });

  it("un código de barras conocido agrega el producto; uno desconocido se asocia al que se elija", () => {
    const { agregar, busqueda, falso } = armar();
    agregar("7790000000017");
    expect(screen.getAllByTestId("item")).toHaveLength(1);
    agregar("7791234500017");
    expect(screen.getByTestId("codigo-desconocido").textContent).toContain("7791234500017");
    fireEvent.change(busqueda(), { target: { value: "tornillo" } });
    fireEvent.keyDown(busqueda(), { key: "Enter" });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { codigo_barras: "7791234500017" });
    expect(screen.queryByTestId("codigo-desconocido")).toBeNull();
    expect(screen.getAllByTestId("item")).toHaveLength(2);
  });

  it("la venta en curso sigue ahí al volver de otra pantalla", () => {
    const { agregar, vista } = armar();
    agregar("mecha vender");
    vista.unmount();
    armar();
    expect(screen.getAllByTestId("item")).toHaveLength(1);
  });

  it("la computadora muestra el código para vincular el celular", async () => {
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/puestos" ? { id: "pu-1", codigo: "ABC123", expiraEnSegundos: 300 } : { vinculado_en: null, expira_en: "" }));
    armar();
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/puestos" ? { id: "pu-1", codigo: "ABC123", expiraEnSegundos: 300 } : { vinculado_en: null, expira_en: "" }));
    fireEvent.click(screen.getByTestId("vincular-celular"));
    await waitFor(() => expect((window as unknown as { __enlaceVinculacion?: string }).__enlaceVinculacion).toContain("#/vincular-celular?codigo=ABC123"));
    expect(apiFalsa).toHaveBeenCalledWith("/puestos", expect.objectContaining({ method: "POST" }));
  });
});
