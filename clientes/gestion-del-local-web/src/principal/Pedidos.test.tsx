/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../pruebas/catalogo-falso";
import { conPermisos } from "../pruebas/sesion";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
vi.mock("./celular/componentes/Escaner", () => ({ Escaner: () => null, hayCamara: () => false }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));

import { Pedidos, renglonesDelPedido, textoDelPedido, type Pedido } from "./Pedidos";

const TRESGE = "pv-tresge";
const item = (id: string, descripcion: string, cantidad: string, recibido = "0", extra: Record<string, unknown> = {}) => ({ producto_id: id, descripcion, marca: "Stanley", unidad: "unidad", codigo_proveedor: `TR-${id}`, cantidad, costo_estimado: "1000", recibido, ...extra });
const pedido = (id: string, estado: Pedido["estado"], items = [item("mecha", "MECHA 6 MM", "24")], extra: Partial<Pedido> = {}): Pedido => ({ id, estado, proveedor_id: TRESGE, proveedor: "Tresge", whatsapp: null, creado_en: "2026-10-07T12:00:00Z", enviado_en: estado === "borrador" ? null : "2026-10-08T12:00:00Z", cerrado_en: null, enviado_por: "Marta", cerrado_por: null, items, ...extra });
let lista: Pedido[] = [];
const llamadas = (metodo: string) => apiFalsa.mock.calls.filter((c) => c[1]?.method === metodo);

function armar(celular = false) {
  catalogo.actual = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA 6 MM", proveedor: "Tresge", codigo_proveedor: "TR-60124", costo_neto: "2480" }),
    producto({ id: "clavo", descripcion: "CLAVO PUNTA PARIS", proveedor: "Tresge", codigo_proveedor: "TR-60129", costo_neto: "3890", unidad: "kg" }),
    producto({ id: "pincel", descripcion: "PINCEL DE OTRO", proveedor: "Comodo", codigo_proveedor: "CO-1", costo_neto: "800" }),
  ]);
  apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/pedidos" ? lista : ruta === "/proveedores" ? [{ id: TRESGE, nombre: "Tresge", activo: true, whatsapp: null }, { id: "pv-viejo", nombre: "Dado de baja", activo: false, whatsapp: null }] : {}));
  const alIngresar = vi.fn();
  render(<Pedidos celular={celular} alIngresar={alIngresar} />);
  return { alIngresar };
}

// Pedidos a proveedores (RF-55, decisión 52).
describe("Pedidos a proveedores", () => {
  beforeEach(() => { apiFalsa.mockReset(); vi.useRealTimers(); lista = [pedido("p-enviado", "enviado"), pedido("p-parcial", "recibido_parcial", [item("mecha", "MECHA 6 MM", "10", "4"), item("clavo", "CLAVO", "2", "2")]), pedido("p-borrador", "borrador"), pedido("p-cancelado", "cancelado", undefined, { cerrado_por: "Carlos" })]; });

  it("el mensaje para el proveedor lleva código, descripción y cantidad, y ningún costo", () => {
    const texto = textoDelPedido([{ descripcion: "MECHA 6 MM", codigo: "TR-60124", cantidad: 24, unidad: "unidad" }, { descripcion: "CLAVO PUNTA PARIS", codigo: null, cantidad: 7.5, unidad: "kg" }], new Date(2026, 9, 11));
    expect(texto).toBe("Ferrebress · pedido del 11/10/2026\n\n24 × MECHA 6 MM (TR-60124)\n7,5 kg × CLAVO PUNTA PARIS\n\n2 renglones. Gracias.");
    expect(texto).not.toContain("$");
  });

  it("la lista separa lo que está por llegar, lo que no se mandó y lo cerrado, con el estado en palabras", async () => {
    const { alIngresar } = armar();
    const porLlegar = await screen.findByTestId("por-llegar");
    expect(within(porLlegar).getAllByTestId("pedido")).toHaveLength(2);
    expect(porLlegar.textContent).toContain("Enviado");
    expect(porLlegar.textContent).toContain("Recibido parcial");
    expect(porLlegar.textContent).toContain("falta 1");
    expect(screen.getByTestId("sin-mandar").textContent).toContain("Borrador");
    expect(screen.getByTestId("cerrados").textContent).toContain("lo canceló Carlos");
    fireEvent.click(within(porLlegar).getByRole("button", { name: "Llegó la mercadería" }));
    expect(alIngresar).toHaveBeenCalledWith("p-enviado");
  });

  it("quien solo registra ingresos no arma pedidos ni ve el total estimado; quien solo encarga no ingresa mercadería", async () => {
    conPermisos("deposito.ingresos");
    lista = [pedido("p-enviado", "enviado")];
    armar();
    await screen.findByTestId("por-llegar");
    expect(screen.queryByTestId("pedido-nuevo")).toBeNull();
    expect(apiFalsa).not.toHaveBeenCalledWith("/proveedores");
    fireEvent.click(screen.getByRole("button", { name: /Abrir el pedido a Tresge/ }));
    expect(screen.getByTestId("pedido-abierto").textContent).not.toContain("Total estimado");
    expect(screen.queryByTestId("cancelar-pedido")).toBeNull();
    expect(screen.getByTestId("llego-la-mercaderia")).toBeTruthy();
  });

  it("un pedido nuevo: se elige el proveedor, se agregan productos, se guarda solo y se manda por WhatsApp", async () => {
    lista = [];
    armar();
    expect((await screen.findByTestId("sin-pedidos")).textContent).toContain("Pedido nuevo");
    fireEvent.click(screen.getByTestId("pedido-nuevo"));
    const opciones = await screen.findAllByTestId("proveedor-opcion");
    expect(opciones.map((o) => o.textContent)).toEqual(["Tresge"]); // el dado de baja no se ofrece
    vi.useFakeTimers();
    fireEvent.click(opciones[0]!);
    expect(screen.getByTestId("pedido-vacio")).toBeTruthy();
    const buscar = screen.getByTestId("buscar-para-pedir");
    fireEvent.change(buscar, { target: { value: "pincel" } });
    expect(screen.getByTestId("resultado-para-pedir").textContent).toContain("no figura en la lista de Tresge");
    fireEvent.change(buscar, { target: { value: "mecha" } });
    fireEvent.keyDown(buscar, { key: "Enter" });
    fireEvent.change(buscar, { target: { value: "clavo" } });
    fireEvent.click(screen.getByTestId("resultado-para-pedir"));
    const renglones = screen.getAllByTestId("renglon-pedido");
    fireEvent.change(within(renglones[0]!).getByTestId("cantidad-pedido"), { target: { value: "24" } });
    fireEvent.blur(within(renglones[0]!).getByTestId("cantidad-pedido"));
    fireEvent.click(within(renglones[1]!).getByRole("button", { name: /Una más/ })); // a granel suma de a 0,5
    expect(screen.getByTestId("total-estimado").textContent).toBe("$65.355"); // 24 × 2480 + 1,5 × 3890
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    const guardado = llamadas("PUT").at(-1)!;
    expect(guardado[0]).toMatch(/^\/pedidos\/[0-9a-f-]{36}$/);
    expect(JSON.parse(guardado[1].body)).toEqual({ proveedor_id: TRESGE, items: [{ producto_id: "mecha", cantidad: 24 }, { producto_id: "clavo", cantidad: 1.5 }] });
    vi.useRealTimers();

    fireEvent.click(screen.getByTestId("revisar-y-mandar"));
    const hoja = await screen.findByTestId("hoja-mandar");
    expect(within(hoja).getByTestId("mensaje-pedido").textContent).toContain("24 × MECHA 6 MM (TR-60124)");
    expect(within(hoja).getByTestId("mensaje-pedido").textContent).toContain("1,5 kg × CLAVO PUNTA PARIS (TR-60129)");
    expect(within(hoja).getByTestId("mensaje-pedido").textContent).not.toContain("$");
    const abrir = vi.spyOn(window, "open").mockReturnValue(null);
    fireEvent.click(within(hoja).getByTestId("mandar-whatsapp"));
    expect(within(hoja).getByRole("alert").textContent).toContain("WhatsApp del proveedor");
    expect(abrir).not.toHaveBeenCalled();
    fireEvent.change(within(hoja).getByTestId("whatsapp-proveedor"), { target: { value: "+54 9 11 5555-0101" } });
    fireEvent.click(within(hoja).getByTestId("mandar-whatsapp"));
    expect(String(abrir.mock.calls[0]![0])).toMatch(/^https:\/\/wa\.me\/5491155550101\?text=Ferrebress/);
    await waitFor(() => expect(llamadas("POST").at(-1)![0]).toMatch(/\/enviar$/));
    expect(JSON.parse(llamadas("POST").at(-1)![1].body)).toEqual({ whatsapp: "5491155550101" });
    expect((await screen.findByTestId("mensaje-pedidos")).textContent).toBe("Pedido enviado a Tresge.");
    abrir.mockRestore();
  });

  it("copiar el texto no lo da por enviado: hay que marcarlo; y vacío no se manda", async () => {
    lista = [pedido("p-borrador", "borrador")];
    armar();
    fireEvent.click(await screen.findByRole("button", { name: /Abrir el pedido a Tresge/ }));
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } });
    fireEvent.click(screen.getByTestId("revisar-y-mandar"));
    fireEvent.click(await screen.findByTestId("copiar-texto"));
    expect(llamadas("POST")).toHaveLength(0);
    fireEvent.click(await screen.findByTestId("marcar-enviado"));
    await waitFor(() => expect(llamadas("POST")[0]![0]).toBe("/pedidos/p-borrador/enviar"));
    expect(JSON.parse(llamadas("POST")[0]![1].body)).toEqual({});
  });

  it("un borrador sin renglones no se manda, y se puede borrar", async () => {
    lista = [pedido("p-borrador", "borrador")];
    armar();
    fireEvent.click(await screen.findByRole("button", { name: /Abrir el pedido a Tresge/ }));
    fireEvent.click(screen.getByTestId("quitar-renglon"));
    fireEvent.click(screen.getByTestId("revisar-y-mandar"));
    expect(screen.getByRole("alert").textContent).toContain("al menos un producto");
    expect(screen.queryByTestId("hoja-mandar")).toBeNull();
    fireEvent.click(screen.getByTestId("borrar-borrador"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/pedidos/p-borrador", { method: "DELETE" }));
  });

  it("un pedido enviado se cancela; uno que llegó incompleto muestra qué falta y se cierra", async () => {
    armar();
    fireEvent.click(within(await screen.findByTestId("por-llegar")).getByRole("button", { name: /Abrir el pedido a Tresge, Enviado/ }));
    expect(screen.queryByTestId("cerrar-pedido")).toBeNull();
    fireEvent.click(screen.getByTestId("cancelar-pedido"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/pedidos/p-enviado/cancelar", { method: "POST", body: "{}" }));
    fireEvent.click(within(await screen.findByTestId("por-llegar")).getByRole("button", { name: /Recibido parcial/ }));
    const renglones = screen.getAllByTestId("renglon-pedido");
    expect(renglones[0]!.textContent).toContain("Pedido 10");
    expect(renglones[0]!.textContent).toContain("Llegó 4");
    expect(renglones[0]!.textContent).toContain("Falta 6");
    expect(renglones[1]!.textContent).not.toContain("Falta");
    expect(screen.queryByTestId("cancelar-pedido")).toBeNull();
    fireEvent.click(screen.getByTestId("cerrar-pedido"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/pedidos/p-parcial/cerrar", { method: "POST", body: "{}" }));
  });

  it("el ingreso desde un pedido se precarga solo con lo que falta llegar, al costo de la lista", () => {
    const p = pedido("p-parcial", "recibido_parcial", [item("mecha", "MECHA 6 MM", "10", "4", { costo_estimado: "2480" }), item("clavo", "CLAVO", "2", "2")]);
    const renglones = renglonesDelPedido(p, [producto({ id: "mecha", descripcion: "MECHA 6 MM" })]);
    expect(renglones).toHaveLength(1);
    expect(renglones[0]).toMatchObject({ descripcion: "MECHA 6 MM", cantidad: 6, costo: 2480, costoLista: 2480, costoTexto: "2480" });
    expect(renglones[0]!.producto?.id).toBe("mecha");
  });
});
