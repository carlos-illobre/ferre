/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../../../pruebas/sesion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// «Hoy» renovada en la computadora (specs/017, la maqueta C en dos columnas). El dispositivo cree que es el sábado
// 17/10/2026 a las 12:00; el servidor de mentira contesta las ventas de cada día.
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../../../api", async (original) => ({ ...(await original<typeof import("../../../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { Hoy } from "./Hoy";
import { consultas } from "../../../../consultas";

const a = (dia: string, h: number, m = 0) => new Date(`${dia}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`).toISOString();
const renglon = (descripcion: string, cantidad: string, precio: number) => ({ descripcion, cantidad, precio_unitario: String(precio), subtotal: Number(cantidad) * precio, margen_aplicado: null, explicacion: null });
const venta = (id: string, fecha: string, medio: string, total: number, items: any[], extra: any = {}) => ({ id, fecha, medio_pago: medio, total: String(total), estado: "confirmada", pagada_en: null, cliente: null, items, ...extra });
const HOY = [
  venta("v1", a("2026-10-17", 9, 12), "efectivo", 12000, [renglon("Mecha 6 mm madera", "2", 4000), renglon("Cinta aisladora negra 20 m", "2", 2000)]),
  venta("v2", a("2026-10-17", 10, 40), "mercado_pago", 223000, [renglon("Taladro inalámbrico 18 V", "1", 223000)]),
  venta("v3", a("2026-10-17", 11, 5), "cuenta_corriente", 58000, [renglon("Clavo punta París 2 pulgadas", "2.5", 10000), renglon("Electrodo 2,5 mm", "1", 18000), renglon("Disco de corte 115 mm", "3", 5000)], { cliente: "Constructora Martínez" }),
  venta("v4", a("2026-10-17", 11, 48), "tarjeta", 6000, [renglon("Lija al agua grano 220", "3", 2000)], { estado: "anulada" }),
];
const AYER = [venta("y1", a("2026-10-16", 9), "efectivo", 50000, [renglon("x", "1", 50000)]), venta("y2", a("2026-10-16", 11, 30), "efectivo", 200000, [renglon("y", "1", 200000)]), venta("y3", a("2026-10-16", 17), "efectivo", 900000, [renglon("z", "1", 900000)])];
let dias: Record<string, any[]>;
const dia = (d: string, ventas: any[]) => ({ dia: d, ventas, totales: {}, total: 0 });

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-17T12:00:00"), toFake: ["Date"] });
  consultas.clear(); apiFalsa.mockReset(); conPermisos("ventas.ver");
  dias = { "2026-10-17": HOY, "2026-10-16": AYER, "2026-10-15": [venta("j1", a("2026-10-15", 10), "tarjeta", 30000, [renglon("w", "1", 30000)])], "2026-10-14": [] };
  apiFalsa.mockImplementation(async (ruta: string) => { const d = ruta.match(/dia=(.*)$/)?.[1] ?? "2026-10-17"; return dia(d, dias[d] ?? []); });
});
afterEach(() => { vi.useRealTimers(); });
const abrir = async () => { render(<Hoy />); await screen.findByTestId("total-de-hoy"); await screen.findByTestId("comparacion"); };

describe("«Hoy» · computadora", () => {
  it("017-E01 017-E02 017-E05 017-E07 017-E08 017-E09: la franja con el total, la comparación y los tres números", async () => {
    await abrir();
    expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Hoy, sábado 17/10");
    expect(screen.getByTestId("total-de-hoy").textContent).toBe("$293.000");
    expect(screen.getByTestId("comparacion").textContent).toBe("+17 %vs. ayer a esta hora ($250.000)");
    expect(screen.getByTestId("numeros").textContent).toBe("3 ventas6 productos$97.667 ticket promedio");
    expect(within(screen.getByTestId("grafico")).getAllByTestId("barra")).toHaveLength(4);
  });

  it("017-E11: un cajón por medio, con cuántas y cuánto; la anulada no suma", async () => {
    await abrir();
    const cc = screen.getByTestId("cajon-cuenta_corriente");
    expect(cc.textContent).toContain("1 venta · a cobrar");
    expect(cc.textContent).toContain("$58.000");
    expect(within(cc).getByTestId("venta-dia").textContent).toContain("Constructora Martínez");
    const tarjeta = screen.getByTestId("cajon-tarjeta");
    expect(tarjeta.textContent).toContain("0 ventas");
    expect(within(tarjeta).getByTestId("venta-dia").className).toContain("anulada");
  });

  it("017-E13: ← → cambian de cajón, ↑ ↓ de venta y la elegida se abre", async () => {
    await abrir();
    const lista = screen.getByTestId("ventas-de-hoy-lista");
    fireEvent.keyDown(lista, { key: "ArrowRight" });
    fireEvent.keyDown(lista, { key: "ArrowRight" });
    fireEvent.keyDown(lista, { key: "ArrowRight" });
    const elegida = () => lista.querySelector<HTMLButtonElement>("[data-elegida='si']")!;
    expect(elegida().textContent).toContain("Constructora Martínez");
    fireEvent.click(elegida());
    const abierta = screen.getByTestId("venta-abierta");
    expect(within(abierta).getByTestId("detalle-venta").textContent).toContain("2,5 × Clavo punta París 2 pulgadas");
  });

  it("017-E26 017-E27: A anula la venta elegida con motivo y comentario", async () => {
    conPermisos("ventas.ver", "ventas.anular");
    await abrir();
    fireEvent.keyDown(window, { key: "a" });
    const hoja = screen.getByTestId("hoja-anular");
    expect(within(hoja).getByTestId("confirmar-anular").textContent).toContain("−$12.000");
    fireEvent.change(within(hoja).getByTestId("comentario-anular"), { target: { value: "vino fallada" } });
    apiFalsa.mockResolvedValueOnce({});
    fireEvent.click(within(hoja).getByTestId("confirmar-anular"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/ventas/v1/anular", expect.objectContaining({ method: "POST" })));
    expect(String(apiFalsa.mock.calls.find((c) => c[0] === "/ventas/v1/anular")![1].body)).toContain("vino fallada");
  });

  it("017-E26: sin permiso de anular, la venta abierta no ofrece «Anular»", async () => {
    await abrir();
    fireEvent.click(screen.getAllByTestId("venta-dia")[0]!);
    expect(screen.getByTestId("venta-abierta")).toBeTruthy();
    expect(screen.queryByTestId("anular")).toBeNull();
  });

  it("017-E22 017-E23 017-E25: Ctrl+K busca por producto o cliente y dice cuántas halló", async () => {
    await abrir();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.change(await screen.findByTestId("buscar-venta"), { target: { value: "constructora" } });
    expect(screen.getByTestId("cuantas-halladas").textContent).toBe("1 de 4 ventas · suman $58.000");
    expect(screen.getAllByTestId("venta-dia")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("salir-de-buscar"));
    expect(screen.getAllByTestId("venta-dia")).toHaveLength(4);
  });

  it("017-E16 017-E18: F abre el calendario; otro día, y «Volver a hoy»", async () => {
    await abrir();
    const calendario = screen.getByTestId("dia") as HTMLInputElement;
    const abrirCalendario = vi.fn();
    (calendario as any).showPicker = abrirCalendario;
    fireEvent.keyDown(window, { key: "f" });
    expect(abrirCalendario).toHaveBeenCalled();
    fireEvent.change(calendario, { target: { value: "2026-10-15" } });
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Jueves 15/10"));
    await waitFor(() => expect(screen.getByTestId("comparacion").textContent).toBe("El día anterior no hubo ventas"));
    fireEvent.click(screen.getByTestId("volver-a-hoy"));
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Hoy, sábado 17/10"));
  });

  it("017-E20: un día sin ventas lo dice", async () => {
    dias["2026-10-17"] = [];
    await abrir();
    expect(screen.getByTestId("sin-ventas").textContent).toContain("Todavía no hay ventas hoy.");
  });

  it("017-E13: Enter con el foco en un botón es de ese botón, no abre la venta", async () => {
    await abrir();
    const boton = screen.getByTestId("cambiar-fecha");
    boton.focus();
    fireEvent.keyDown(boton, { key: "Enter" });
    expect(screen.queryAllByTestId("detalle-venta")).toHaveLength(0);
  });

  it("017-E21: sin conexión con lo último bajado a la vista, no avisa nada: se ve eso", async () => {
    await abrir();
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    await consultas.refetchQueries();
    expect(screen.getByTestId("total-de-hoy").textContent).toBe("$293.000");
    expect(screen.queryByText(/Sin conexión/)).toBeNull();
  });
});
