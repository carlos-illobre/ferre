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
  it("017-E01 017-E02 017-E05 017-E07 017-E08 017-E09: el resumen oscuro y los tres números", async () => {
    await abrir();
    expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Hoy, sábado 17/10");
    expect(screen.getByTestId("total-de-hoy").textContent).toBe("$293.000");
    expect(screen.getByTestId("comparacion").textContent).toBe("+17 %vs. ayer a esta hora ($250.000)");
    expect(screen.getByTestId("medio-cuenta_corriente").textContent).toBe("Cuenta corriente1 venta$58.000");
    expect(screen.getByTestId("numeros").textContent).toBe("3ventas6productos$97.667ticket promedio");
    expect(within(screen.getByTestId("grafico")).getAllByTestId("barra")).toHaveLength(4);
  });

  it("017-E11 017-E13: la tabla con el medio en su color; ↑ ↓ eligen y Enter abre o cierra el detalle", async () => {
    await abrir();
    const filas = screen.getAllByTestId("venta-dia");
    expect(filas[1]!.textContent).toContain("11:053 productosCuenta corrienteConstructora Martínez$58.000");
    expect(filas[1]!.querySelector(".hoy-medio.medio-cuenta_corriente")).not.toBeNull();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(within(filas[1]!).getAllByTestId("detalle-venta").map((f) => f.textContent)).toEqual(["2,5 × Clavo punta París 2 pulgadas · $10.000 c/u$25.000", "1 × Electrodo 2,5 mm · $18.000 c/u$18.000", "3 × Disco de corte 115 mm · $5.000 c/u$15.000"]);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(within(filas[1]!).queryAllByTestId("detalle-venta")).toHaveLength(0);
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
