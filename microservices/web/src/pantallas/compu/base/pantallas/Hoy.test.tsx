/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../../../pruebas/sesion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// «Ventas de hoy» en la computadora como la v2, «El día y la venta» (decisión 135), con «Corregir»
// (specs/019). El dispositivo cree que es el sábado 17/10/2026 a las 12:00; el servidor de mentira
// contesta las ventas de cada día.
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../../../api", async (original) => ({ ...(await original<typeof import("../../../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { Hoy } from "./Hoy";
import { consultas } from "../../../../consultas";

const a = (dia: string, h: number, m = 0) => new Date(`${dia}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`).toISOString();
let n = 0;
const renglon = (descripcion: string, cantidad: string, precio: number, margen: string | null = null) => ({ id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, producto_id: null, devuelto: "0", descripcion, cantidad, precio_unitario: String(precio), subtotal: Number(cantidad) * precio, margen_aplicado: margen, explicacion: null, foto_url: null });
const venta = (id: string, fecha: string, medio: string, total: number, items: any[], extra: any = {}) => ({ id, fecha, medio_pago: medio, total: String(total), estado: "confirmada", pagada_en: null, cliente: null, cliente_id: null, version: fecha, correcciones: 0, items, ...extra });
const HOY = () => [
  venta("v1", a("2026-10-17", 9, 12), "efectivo", 12000, [renglon("Mecha 6 mm madera", "2", 4000), renglon("Cinta aisladora negra 20 m", "2", 2000)]),
  venta("v2", a("2026-10-17", 10, 40), "mercado_pago", 223000, [renglon("Taladro inalámbrico 18 V", "1", 223000)]),
  venta("v3", a("2026-10-17", 11, 5), "cuenta_corriente", 58000, [{ ...renglon("Clavo punta París 2 pulgadas", "2.5", 10000), unidad: "kg" }, renglon("Electrodo 2,5 mm", "1", 18000), renglon("Disco de corte 115 mm", "3", 5000)], { cliente: "Constructora Martínez", cliente_id: "c1" }),
  venta("v4", a("2026-10-17", 11, 48), "tarjeta", 6000, [renglon("Lija al agua grano 220", "3", 2000)], { estado: "anulada" }),
];
const AYER = [venta("y1", a("2026-10-16", 9), "efectivo", 50000, [renglon("x", "1", 50000)]), venta("y2", a("2026-10-16", 11, 30), "efectivo", 200000, [renglon("y", "1", 200000)]), venta("y3", a("2026-10-16", 17), "efectivo", 900000, [renglon("z", "1", 900000)])];
let dias: Record<string, any[]>;
const dia = (d: string, ventas: any[]) => ({ dia: d, ventas, totales: {}, total: 0 });

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-17T12:00:00"), toFake: ["Date"] });
  consultas.clear(); apiFalsa.mockReset(); conPermisos("ventas.ver");
  dias = { "2026-10-17": HOY(), "2026-10-16": AYER, "2026-10-15": [venta("j1", a("2026-10-15", 10), "tarjeta", 30000, [renglon("w", "1", 30000)])], "2026-10-14": [] };
  apiFalsa.mockImplementation(async (ruta: string) => {
    if (ruta === "/clientes") return [{ id: "c1", nombre: "Constructora Martínez", cuenta_corriente: true, deuda: "58000" }, { id: "c2", nombre: "Herrería Gómez", cuenta_corriente: true, deuda: "0" }];
    const d = ruta.match(/dia=(.*)$/)?.[1] ?? "2026-10-17"; return dia(d, dias[d] ?? []);
  });
});
afterEach(() => { vi.useRealTimers(); });
const abrir = async () => { render(<Hoy />); await screen.findByTestId("total-de-hoy"); await screen.findByTestId("comparacion"); };
const elegida = () => screen.getByTestId("venta-elegida");
const filas = () => screen.getAllByTestId("venta-dia");

describe("«Ventas de hoy» · computadora", () => {
  it("017-E01 017-E02 017-E05 017-E07 017-E08 017-E09: el día con el total, la comparación, los tres números y las barras", async () => {
    await abrir();
    expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Sábado 17/10 · hasta las 12:00");
    expect(screen.getByTestId("total-de-hoy").textContent).toBe("$293.000");
    expect(screen.getByTestId("comparacion").textContent).toBe("+17 %vs. ayer a esta hora ($250.000)");
    expect(screen.getByTestId("numeros").textContent).toBe("3ventas6productos$97.667ticket promedio");
    expect(within(screen.getByTestId("grafico")).getAllByTestId("barra")).toHaveLength(4);
  });

  it("017-E04: la barra de cada hora marca lo de ayer a esa hora; la hora actual lleva su importe", async () => {
    await abrir();
    const barras = within(screen.getByTestId("grafico")).getAllByTestId("barra");
    expect(barras.map((b) => b.querySelector(".ayer") !== null)).toEqual([true, false, true, false]);
    expect(barras[1]!.getAttribute("aria-label")).toBe("10 h: $223.000");
  });

  it("017-E11: cada medio con cuántas y cuánto; la tabla con la hora, qué se llevó, quién y el total; la anulada no suma", async () => {
    await abrir();
    const cc = screen.getByTestId("medio-cuenta_corriente");
    expect(cc.textContent).toContain("1 venta");
    expect(cc.textContent).toContain("$58.000");
    expect(screen.getByTestId("medio-tarjeta").textContent).toContain("0 ventas");
    expect(filas().map((f) => f.textContent)).toEqual([
      "11:483 un. Lija al agua grano 220anulada$6.000",
      "11:053 productos Clavo, Electrodo, DiscoConstructora Martínez$58.000",
      "10:401 un. Taladro inalámbrico 18 VMercado Pago$223.000",
      "09:122 productos Mecha, CintaEfectivo$12.000",
    ]);
    expect(filas()[0]!.className).toContain("anulada");
  });

  it("los filtros: cuenta corriente y anuladas, con cuántas hay", async () => {
    await abrir();
    expect(screen.getByTestId("filtro-todas").textContent).toBe("Todas (4)");
    fireEvent.click(screen.getByTestId("filtro-cuenta"));
    expect(filas()).toHaveLength(1);
    expect(filas()[0]!.textContent).toContain("Constructora Martínez");
    fireEvent.click(screen.getByTestId("filtro-anuladas"));
    expect(filas()).toHaveLength(1);
    expect(elegida().textContent).toContain("Anulada. El stock volvió");
  });

  it("017-E13: arranca elegida la última que no está anulada; ↑ ↓ eligen y la venta se ve a la derecha", async () => {
    await abrir();
    expect(within(elegida()).getByTestId("detalle-venta").textContent).toContain("2,5 kg × $10.000");
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(elegida().textContent).toContain("Taladro inalámbrico 18 V");
    fireEvent.click(filas()[3]!);
    expect(elegida().textContent).toContain("Mecha 6 mm madera");
  });

  it("017-E26 017-E27: Supr anula la venta elegida con motivo y comentario", async () => {
    conPermisos("ventas.ver", "ventas.anular");
    await abrir();
    fireEvent.keyDown(window, { key: "Delete" });
    const hoja = screen.getByTestId("hoja-anular");
    expect(within(hoja).getByTestId("confirmar-anular").textContent).toContain("−$58.000");
    fireEvent.change(within(hoja).getByTestId("comentario-anular"), { target: { value: "vino fallada" } });
    apiFalsa.mockResolvedValueOnce({});
    fireEvent.click(within(hoja).getByTestId("confirmar-anular"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/ventas/v3/anular", expect.objectContaining({ method: "POST" })));
    expect(String(apiFalsa.mock.calls.find((c) => c[0] === "/ventas/v3/anular")![1].body)).toContain("vino fallada");
  });

  it("017-E26 019-E24: sin el permiso de anular, la venta no ofrece «Corregir» ni «Anular», y las teclas no hacen nada", async () => {
    await abrir();
    expect(screen.queryByTestId("anular")).toBeNull();
    expect(screen.queryByTestId("corregir")).toBeNull();
    fireEvent.keyDown(window, { key: "e" });
    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.queryByTestId("corrigiendo")).toBeNull();
    expect(screen.queryByTestId("hoja-anular")).toBeNull();
  });

  it("017-E22 017-E23 017-E25: Ctrl+K busca por producto o cliente y dice cuántas halló", async () => {
    await abrir();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const campo = screen.getByTestId("buscar-venta");
    expect(document.activeElement).toBe(campo);
    fireEvent.change(campo, { target: { value: "constructora" } });
    expect(screen.getByTestId("cuantas-halladas").textContent).toBe("1 de 4 ventas · suman $58.000");
    expect(filas()).toHaveLength(1);
    fireEvent.keyDown(campo, { key: "Escape" });
    expect(filas()).toHaveLength(4);
  });

  it("017-E16 017-E18: F abre «Otro día» con los últimos siete días; otro día, y «Volver a hoy»", async () => {
    await abrir();
    fireEvent.keyDown(window, { key: "f" });
    const panel = screen.getByTestId("hoja-otro-dia");
    expect(panel.querySelectorAll("[data-testid^='otro-dia-']")).toHaveLength(7);
    expect(screen.getByTestId("otro-dia-2026-10-17").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByTestId("otro-dia-2026-10-15"));
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Jueves 15/10"));
    await waitFor(() => expect(screen.getByTestId("comparacion").textContent).toBe("El día anterior no hubo ventas"));
    fireEvent.click(screen.getByTestId("volver-a-hoy"));
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Sábado 17/10 · hasta las 12:00"));
  });

  it("017-E16: en «Otro día», el calendario propio llega hasta hoy y elige un día de antes", async () => {
    await abrir();
    fireEvent.click(screen.getByTestId("cambiar-fecha"));
    fireEvent.click(screen.getByTestId("elegir-en-calendario"));
    expect((screen.getByTestId("dia-2026-10-18") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("mes-anterior"));
    fireEvent.click(screen.getByTestId("dia-2026-09-30"));
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Miércoles 30/09"));
    expect(screen.queryByTestId("hoja-otro-dia")).toBeNull();
  });

  it("017-E20: un día sin ventas lo dice", async () => {
    dias["2026-10-17"] = [];
    await abrir();
    expect(screen.getByTestId("sin-ventas").textContent).toContain("Todavía no hay ventas hoy.");
  });

  it("017-E21: sin conexión con lo último bajado a la vista, no avisa nada: se ve eso", async () => {
    await abrir();
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    await consultas.refetchQueries();
    expect(screen.getByTestId("total-de-hoy").textContent).toBe("$293.000");
    expect(screen.queryByText(/Sin conexión/)).toBeNull();
  });
});

describe("«Corregir» en la computadora (019, historia 1)", () => {
  beforeEach(() => { conPermisos("ventas.ver", "ventas.anular"); });
  const corregirLaDeEfectivo = async () => {
    await abrir();
    fireEvent.click(filas()[3]!);
    fireEvent.keyDown(window, { key: "e" });
    return screen.getByTestId("corrigiendo");
  };
  const enviado = () => JSON.parse(String(apiFalsa.mock.calls.find((c) => String(c[0]).endsWith("/corregir"))![1].body));

  it("019-E01 019-E02 019-E03: E corrige; una más sube el total, el botón dice la diferencia y se cobra con el medio elegido", async () => {
    const panel = await corregirLaDeEfectivo();
    fireEvent.click(within(panel).getAllByTestId("mas")[0]!);
    expect(within(panel).getByTestId("total-corregido").textContent).toBe("$16.000");
    expect(within(panel).getByTestId("diferencia").textContent).toBe("+$4.000");
    expect(within(panel).getByTestId("guardar-correccion").textContent).toContain("Guardar · +$4.000");
    expect(within(panel).getByTestId("como-se-resuelve").textContent).toContain("Se cobra con");
    fireEvent.click(within(panel).getByTestId("dif-mercado_pago"));
    apiFalsa.mockResolvedValueOnce({ id: "v1", total: 16000, diferencia: 4000, resuelta: "cobrada", version: "x" });
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toBe("Corrección guardada · +$4.000 en mercado pago"));
    expect(enviado()).toMatchObject({ version: a("2026-10-17", 9, 12), medio_pago: "efectivo", medio_diferencia: "mercado_pago", items: [{ cantidad: 3, precio_unitario: 4000 }, { cantidad: 2, precio_unitario: 2000 }] });
    expect(screen.queryByTestId("corrigiendo")).toBeNull();
  });

  it("019-E04 019-E29: si baja, se devuelve en efectivo; el precio cambiado queda a mano", async () => {
    const panel = await corregirLaDeEfectivo();
    fireEvent.click(within(panel).getAllByTestId("precio")[0]!);
    const caja = within(panel).getByTestId("precio-ed");
    fireEvent.change(caja, { target: { value: "3500" } });
    fireEvent.keyDown(caja, { key: "Enter" });
    expect(within(panel).getByTestId("total-corregido").textContent).toBe("$11.000");
    expect(within(panel).getByTestId("como-se-resuelve").textContent).toBe("Se devuelve en efectivo: $1.000");
    apiFalsa.mockResolvedValueOnce({ id: "v1", total: 11000, diferencia: -1000, resuelta: "devuelta", version: "x" });
    fireEvent.click(within(panel).getByTestId("guardar-correccion"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toBe("Corrección guardada · −$1.000 en efectivo"));
    expect(enviado().items[0]).toMatchObject({ precio_unitario: 3500, margen_aplicado: null });
    expect(enviado()).not.toHaveProperty("medio_diferencia");
  });

  it("019-E05: en cuenta corriente la diferencia cambia la deuda", async () => {
    await abrir();
    fireEvent.keyDown(window, { key: "e" });
    const panel = screen.getByTestId("corrigiendo");
    fireEvent.click(within(panel).getAllByTestId("quitar")[2]!);
    expect(within(panel).getByTestId("como-se-resuelve").textContent).toBe("Baja lo que debe Constructora Martínez: $15.000");
    expect(within(panel).getByTestId("renglon-quitado").textContent).toContain("quitado");
  });

  it("019-E08: Esc descarta: la venta queda como estaba y no se manda nada", async () => {
    const panel = await corregirLaDeEfectivo();
    fireEvent.click(within(panel).getAllByTestId("mas")[0]!);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("corrigiendo")).toBeNull();
    expect(within(elegida()).getByTestId("detalle-venta").textContent).toContain("2 un. × $4.000");
    expect(apiFalsa.mock.calls.some((c) => String(c[0]).endsWith("/corregir"))).toBe(false);
  });

  it("019-E09 019-E10: cambiar el medio; a cuenta corriente pide el cliente y sin cliente no se guarda", async () => {
    const panel = await corregirLaDeEfectivo();
    fireEvent.click(within(panel).getByTestId("medio-ed-mercado_pago"));
    expect(within(panel).getByTestId("como-se-resuelve").textContent).toBe("Sin diferencia de dinero");
    fireEvent.click(within(panel).getByTestId("medio-ed-cuenta_corriente"));
    const hoja = screen.getByTestId("hoja-clientes");
    fireEvent.keyDown(within(hoja).getByTestId("buscar-cliente"), { key: "Escape" });
    fireEvent.click(within(hoja).getAllByRole("button").find((b) => b.getAttribute("aria-label")?.startsWith("Cerrar"))!);
    fireEvent.click(within(panel).getByTestId("guardar-correccion"));
    expect(within(panel).getByRole("alert").textContent).toBe("Elegí el cliente de la cuenta corriente.");
    fireEvent.click(within(panel).getByTestId("cliente-ed"));
    await waitFor(() => expect(screen.getAllByTestId("cliente-opcion").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByTestId("cliente-opcion")[1]!);
    expect(within(panel).getByTestId("cliente-ed").textContent).toBe("Herrería Gómez");
    apiFalsa.mockResolvedValueOnce({ id: "v1", total: 12000, diferencia: 0, resuelta: "cuenta_corriente", version: "x" });
    fireEvent.click(within(panel).getByTestId("guardar-correccion"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toBe("Corrección guardada"));
    expect(enviado()).toMatchObject({ medio_pago: "cuenta_corriente", cliente_id: "c2" });
  });

  it("019-E28: si otra persona la corrigió mientras tanto, se vuelve a cargar y se empieza de nuevo", async () => {
    const panel = await corregirLaDeEfectivo();
    fireEvent.click(within(panel).getAllByTestId("mas")[0]!);
    apiFalsa.mockRejectedValueOnce(Object.assign(new Error("La venta cambió mientras tanto"), { estado: 409 }));
    dias["2026-10-17"]![0]!.items[0].cantidad = "5";
    fireEvent.click(within(panel).getByTestId("guardar-correccion"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toBe("La venta cambió mientras la corregías: se volvió a cargar. Corregila de nuevo."));
    expect(screen.queryByTestId("corrigiendo")).toBeNull();
    await waitFor(() => expect(within(elegida()).getByTestId("detalle-venta").textContent).toContain("5 un. × $4.000"));
  });

  it("019-E27: sin conexión, dice que hace falta internet y la corrección sigue abierta", async () => {
    const panel = await corregirLaDeEfectivo();
    fireEvent.click(within(panel).getAllByTestId("mas")[0]!);
    apiFalsa.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fireEvent.click(within(panel).getByTestId("guardar-correccion"));
    await waitFor(() => expect(within(panel).getByRole("alert").textContent).toBe("Sin conexión: para corregir hace falta internet."));
    expect(within(panel).getByTestId("total-corregido").textContent).toBe("$16.000");
  });

  it("019-E25: sin renglones no se guarda: para eso se anula", async () => {
    const panel = await corregirLaDeEfectivo();
    fireEvent.click(within(panel).getAllByTestId("quitar")[0]!);
    fireEvent.click(within(panel).getAllByTestId("quitar")[0]!);
    fireEvent.click(within(panel).getByTestId("guardar-correccion"));
    expect(within(panel).getByRole("alert").textContent).toBe("Para dejar la venta sin productos, se anula.");
  });

  it("019-E22: una venta anulada no se corrige", async () => {
    await abrir();
    fireEvent.click(filas()[0]!);
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.queryByTestId("corrigiendo")).toBeNull();
    expect(screen.queryByTestId("corregir")).toBeNull();
  });
});
