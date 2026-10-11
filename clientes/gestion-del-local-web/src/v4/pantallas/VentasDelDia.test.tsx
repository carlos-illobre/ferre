/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
const cola = vi.hoisted(() => ({ pendientes: [] as unknown[], oyentes: new Set<() => void>() }));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({
  enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => cola.pendientes),
  alCambiarLaCola: (oyente: () => void) => { cola.oyentes.add(oyente); return () => cola.oyentes.delete(oyente); },
}));

import { guardar, leerTodo, reemplazarTodo } from "../../almacen";
import { ErrorApi } from "../../api";
import { dibujar } from "../pruebas";
import { VentasDelDia } from "./VentasDelDia";

const hoyA = (h: number, m: number) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };
const clave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ayer = () => clave(new Date(Date.now() - 86400000));

const VENTAS = [
  { id: "v-3", fecha: hoyA(11, 48), medio_pago: "tarjeta", total: "6000", estado: "anulada", cliente: null, items: [{ descripcion: "Lija al agua", cantidad: "3", precio_unitario: "2000" }] },
  { id: "v-2", fecha: hoyA(11, 5), medio_pago: "cuenta_corriente", total: "58000", estado: "confirmada", cliente: "Constructora Martínez", items: [{ descripcion: "Clavo punta París", cantidad: "2.5", precio_unitario: "10000" }, { descripcion: "Disco de corte", cantidad: "3", precio_unitario: "5000" }] },
  { id: "v-1", fecha: hoyA(9, 12), medio_pago: "efectivo", total: "12000", estado: "confirmada", cliente: null, items: [{ descripcion: "Mecha 6 mm", cantidad: "2", precio_unitario: "4000" }] },
];

function conVentas(ventas: unknown[] = VENTAS) {
  apiFalsa.mockImplementation(async () => ({ ventas }));
}
const ponerEnCola = (cambios: unknown[]) => { cola.pendientes = cambios; cola.oyentes.forEach((o) => o()); };
const venta = (texto: string) => screen.getAllByTestId("venta-dia").find((v) => v.textContent?.includes(texto))!;

describe("Ventas del día (v4)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    apiFalsa.mockReset(); apiFalsa.mockRejectedValue(new TypeError("Failed to fetch")); enviarOEncolar.mockReset(); enviarOEncolar.mockResolvedValue({ encolado: false });
    cola.pendientes = []; cola.oyentes.clear();
    await reemplazarTodo("ventas", []);
  });

  it("muestra el total del día, cada medio de pago y cada venta con sus productos", async () => {
    conVentas();
    dibujar(<VentasDelDia />, "ventas");
    expect(screen.getByTestId("progreso").textContent).toContain("Buscando las ventas");
    await waitFor(() => expect(screen.getAllByTestId("venta-dia")).toHaveLength(3));
    expect(apiFalsa).toHaveBeenCalledWith("/ventas");
    // La anulada no suma.
    expect(screen.getByTestId("total-del-dia").textContent).toBe("$70.000");
    expect(screen.getByTestId("total-efectivo").textContent).toContain("$12.000");
    expect(screen.getByTestId("total-cuenta_corriente").textContent).toContain("$58.000");
    expect(screen.getByTestId("total-tarjeta").textContent).toContain("$0");
    expect(venta("Clavo").textContent).toContain("2,5 × Clavo punta París");
    expect(venta("Clavo").textContent).toContain("Va a la cuenta corriente de Constructora Martínez");
    expect(within(venta("Lija")).getByTestId("anulada").textContent).toBe("Anulada");
    expect(within(venta("Lija")).queryByTestId("anular")).toBeNull();
  });

  it("sin ventas invita a ir a vender", async () => {
    conVentas([]);
    dibujar(<VentasDelDia />, "ventas");
    await waitFor(() => expect(screen.getByTestId("sin-ventas").textContent).toContain("Todavía no hay ventas hoy"));
    fireEvent.click(screen.getByText("Ir a vender"));
    expect(window.location.hash).toBe("#/vender");
  });

  it("otro día se pide al servidor con su fecha, y «Volver a hoy» vuelve", async () => {
    conVentas();
    dibujar(<VentasDelDia />, "ventas");
    await waitFor(() => expect(screen.getAllByTestId("venta-dia")).toHaveLength(3));
    conVentas([]);
    fireEvent.change(screen.getByTestId("dia"), { target: { value: ayer() } });
    await waitFor(() => expect(screen.getByTestId("sin-ventas").textContent).toContain("Ese día no hubo ventas"));
    expect(apiFalsa).toHaveBeenLastCalledWith(`/ventas?dia=${ayer()}`);
    expect(window.location.hash).toBe(`#/ventas?dia=${ayer()}`);
    expect(screen.getByTestId("dia-en-palabras").textContent).not.toContain("Hoy");
    conVentas();
    fireEvent.click(screen.getByTestId("volver-a-hoy"));
    await waitFor(() => expect(screen.getAllByTestId("venta-dia")).toHaveLength(3));
    expect(apiFalsa).toHaveBeenLastCalledWith("/ventas");
    expect(screen.queryByTestId("volver-a-hoy")).toBeNull();
  });

  it("anular pide confirmar, manda el motivo y la venta queda anulada sin sumar al total", async () => {
    conVentas();
    dibujar(<VentasDelDia />, "ventas");
    await waitFor(() => expect(screen.getAllByTestId("venta-dia")).toHaveLength(3));
    fireEvent.click(within(venta("Mecha")).getByTestId("anular"));
    const hoja = screen.getByTestId("hoja-anular");
    expect(hoja.textContent).toContain("¿Anular la venta de $12.000?");
    expect(hoja.textContent).toContain("2 × Mecha 6 mm");
    fireEvent.change(screen.getByTestId("motivo-anular"), { target: { value: " se cobró dos veces " } });
    fireEvent.click(screen.getByTestId("confirmar-si"));
    await waitFor(() => expect(within(venta("Mecha")).getByTestId("anulada").textContent).toBe("Anulada"));
    expect(enviarOEncolar).toHaveBeenCalledWith("venta.anulacion", "POST", "/ventas/v-1/anular", { motivo: "se cobró dos veces" });
    expect(screen.getByTestId("mensaje").textContent).toContain("Venta de $12.000 anulada");
    expect(screen.getByTestId("mensaje").textContent).toContain("La mercadería volvió al stock");
    expect(screen.getByTestId("total-del-dia").textContent).toBe("$58.000");
    expect(screen.queryByText("No anular")).toBeNull();
  });

  it("«No anular» cierra sin tocar nada", async () => {
    conVentas();
    dibujar(<VentasDelDia />, "ventas");
    await waitFor(() => expect(screen.getAllByTestId("venta-dia")).toHaveLength(3));
    fireEvent.click(within(venta("Mecha")).getByTestId("anular"));
    fireEvent.click(screen.getByText("No anular"));
    expect(enviarOEncolar).not.toHaveBeenCalled();
    expect(within(venta("Mecha")).getByTestId("anular")).toBeTruthy();
  });

  it("si el servidor no deja anular, el error queda en la hoja y se vuelven a pedir las ventas", async () => {
    conVentas();
    dibujar(<VentasDelDia />, "ventas");
    await waitFor(() => expect(screen.getAllByTestId("venta-dia")).toHaveLength(3));
    enviarOEncolar.mockRejectedValueOnce(new ErrorApi(409, "La venta no existe o ya está anulada"));
    fireEvent.click(within(venta("Mecha")).getByTestId("anular"));
    fireEvent.click(screen.getByTestId("confirmar-si"));
    await waitFor(() => expect(screen.getByTestId("error-anular").textContent).toContain("ya está anulada"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledTimes(2));
  });

  it("sin conexión se puede anular: queda «Anulada · por enviar» hasta que salga", async () => {
    conVentas();
    dibujar(<VentasDelDia />, "ventas");
    await waitFor(() => expect(screen.getAllByTestId("venta-dia")).toHaveLength(3));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    window.dispatchEvent(new Event("offline"));
    // Lo que ya se había visto sigue a la vista, con el aviso.
    await waitFor(() => expect(screen.getByTestId("aviso-sin-conexion").textContent).toContain("pueden no estar todas"));
    expect(screen.getAllByTestId("venta-dia")).toHaveLength(3);

    enviarOEncolar.mockImplementationOnce(async (tipo, metodo, ruta, cuerpo) => {
      ponerEnCola([{ orden: 1, creado_en: "", tipo, metodo, ruta, cuerpo }]);
      return { encolado: true };
    });
    fireEvent.click(within(venta("Mecha")).getByTestId("anular"));
    fireEvent.click(screen.getByTestId("confirmar-si"));
    await waitFor(() => expect(within(venta("Mecha")).getByTestId("anulada").textContent).toBe("Anulada · por enviar"));
    expect(screen.getByTestId("mensaje").textContent).toContain("anulada en este dispositivo");
    expect(screen.getByTestId("mensaje").textContent).toContain("Se envía sola cuando vuelva internet");
    expect(screen.getByTestId("total-del-dia").textContent).toBe("$58.000");

    // Vuelve internet, la cola se vacía y el servidor ya la da por anulada.
    conVentas(VENTAS.map((v) => (v.id === "v-1" ? { ...v, estado: "anulada" } : v)));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    ponerEnCola([]);
    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(within(venta("Mecha")).getByTestId("anulada").textContent).toBe("Anulada"));
    expect(screen.queryByTestId("aviso-sin-conexion")).toBeNull();
  });

  it("sin conexión desde el arranque muestra lo cobrado en este dispositivo, con lo que falta enviar", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await guardar("ventas", { id: "local-1", fecha: hoyA(10, 0), total: 8000, medio_pago: "efectivo", enviada: false, items: [{ descripcion: "Candado", cantidad: 1, precio_unitario: 8000 }] });
    await guardar("ventas", { id: "local-0", fecha: hoyA(8, 0), total: 3000, medio_pago: "tarjeta", enviada: true, items: [{ descripcion: "Tarugo", cantidad: 10, precio_unitario: 300 }] });
    cola.pendientes = [{ orden: 1, creado_en: "", tipo: "venta", metodo: "POST", ruta: "/ventas", cuerpo: { id: "local-1" } }];
    dibujar(<VentasDelDia />, "ventas");
    await waitFor(() => expect(screen.getAllByTestId("venta-dia")).toHaveLength(2));
    expect(screen.getByTestId("aviso-sin-conexion")).toBeTruthy();
    expect(within(venta("Candado")).getByTestId("por-enviar")).toBeTruthy();
    expect(within(venta("Tarugo")).queryByTestId("por-enviar")).toBeNull();
    expect(screen.getByTestId("total-del-dia").textContent).toBe("$11.000");

    // Anular una venta que tampoco salió: va a la cola, detrás de la venta, y la copia local queda anulada.
    enviarOEncolar.mockImplementationOnce(async (tipo, metodo, ruta, cuerpo) => {
      ponerEnCola([...cola.pendientes, { orden: 2, creado_en: "", tipo, metodo, ruta, cuerpo }]);
      return { encolado: true };
    });
    fireEvent.click(within(venta("Candado")).getByTestId("anular"));
    fireEvent.click(screen.getByTestId("confirmar-si"));
    await waitFor(() => expect(within(venta("Candado")).getByTestId("anulada").textContent).toBe("Anulada · por enviar"));
    await waitFor(async () => expect((await leerTodo<{ id: string; anulada?: boolean }>("ventas")).find((v) => v.id === "local-1")?.anulada).toBe(true));
  });

  it("sin conexión, un día que no está en el dispositivo lo dice", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    dibujar(<VentasDelDia />, `ventas?dia=${ayer()}`);
    await waitFor(() => expect(screen.getByTestId("sin-ventas").textContent).toContain("Ese día no está guardado en este dispositivo"));
  });

  it("si el servidor falla, lo dice y deja reintentar", async () => {
    apiFalsa.mockRejectedValueOnce(new ErrorApi(500, "Error interno"));
    dibujar(<VentasDelDia />, "ventas");
    await waitFor(() => expect(screen.getByTestId("error-de-carga").textContent).toContain("No se pudieron traer las ventas"));
    conVentas();
    fireEvent.click(screen.getByTestId("reintentar"));
    await waitFor(() => expect(screen.getAllByTestId("venta-dia")).toHaveLength(3));
  });

  it("si el servidor no responde aunque haya señal, muestra lo del dispositivo y deja reintentar", async () => {
    apiFalsa.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    dibujar(<VentasDelDia />, "ventas");
    await waitFor(() => expect(screen.getByTestId("aviso-sin-conexion")).toBeTruthy());
    conVentas();
    fireEvent.click(within(screen.getByTestId("aviso-sin-conexion")).getByText("Reintentar"));
    await waitFor(() => expect(screen.getAllByTestId("venta-dia")).toHaveLength(3));
    expect(screen.queryByTestId("aviso-sin-conexion")).toBeNull();
  });
});
