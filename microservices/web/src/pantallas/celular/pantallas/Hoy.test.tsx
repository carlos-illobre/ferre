/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../../pruebas/sesion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// «Hoy» renovada en el celular (specs/017, maqueta C). El dispositivo cree que es el sábado
// 17/10/2026 a las 12:00; el servidor de mentira contesta las ventas de cada día.
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../../api", async (original) => ({ ...(await original<typeof import("../../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { VentasDeHoy } from "./VentasDeHoy";
import { consultas } from "../../../consultas";
import { ErrorApi } from "../../../api";

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
const abrir = async () => { render(<VentasDeHoy />); await screen.findByTestId("total-de-hoy"); await screen.findByTestId("comparacion"); };

describe("«Hoy» · celular", () => {
  it("017-E01 017-E02: el total sin las anuladas y la comparación con ayer hasta la misma hora", async () => {
    await abrir();
    expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Hoy, sábado 17/10");
    expect(screen.getByTestId("total-de-hoy").textContent).toBe("$293.000");
    expect(screen.getByTestId("comparacion").textContent).toBe("+17 %vs. ayer a esta hora ($250.000)"); // ayer hasta las 12: 50.000 + 200.000
  });

  it("017-E03: ayer a esta hora sin ventas", async () => {
    dias["2026-10-16"] = [venta("y3", a("2026-10-16", 17), "efectivo", 900000, [renglon("z", "1", 900000)])];
    await abrir();
    expect(screen.getByTestId("comparacion").textContent).toBe("Ayer a esta hora no había ventas");
  });

  it("017-E04: una barra por hora hasta la actual; tocarla dice su importe", async () => {
    await abrir();
    const barras = within(screen.getByTestId("grafico")).getAllByTestId("barra");
    expect(barras.map((b) => b.getAttribute("aria-label"))).toEqual(["9 h: $12.000", "10 h: $223.000", "11 h: $58.000", "12 h: $0"]);
    fireEvent.click(barras[1]!);
    expect(screen.getByTestId("grafico").textContent).toContain("10 h · $223.000");
  });

  it("017-E05: cada medio con su ícono, su color, el importe y cuántas ventas", async () => {
    await abrir();
    expect(screen.getByTestId("medio-tarjeta").textContent).toBe("Tarjeta0 ventas$0");
    expect(screen.getByTestId("medio-mercado_pago").textContent).toBe("Mercado Pago1 venta$223.000");
    expect(screen.getByTestId("medio-efectivo").querySelector(".medio-icono.medio-efectivo")).not.toBeNull();
  });

  it("017-E07 017-E08 017-E09: ventas, productos y ticket promedio", async () => {
    await abrir();
    expect(screen.getByTestId("numeros").textContent).toBe("3ventas6productos$97.667ticket promedio");
  });

  it("017-E10 017-E20: un día sin ventas lo dice, con los números en cero", async () => {
    dias["2026-10-17"] = [];
    await abrir();
    expect(screen.getByTestId("numeros").textContent).toBe("0ventas0productos—ticket promedio");
    expect(screen.getByTestId("sin-ventas").textContent).toBe("Todavía no hay ventas hoy.");
  });

  it("017-E11 017-E12 017-E13 017-E14 017-E15: renglones cortos, de la más nueva a la más vieja; tocar abre el detalle", async () => {
    await abrir();
    const ventas = screen.getAllByTestId("venta-dia");
    expect(ventas.map((v) => v.querySelector("b")!.textContent)).toEqual(["3 × Lija al agua grano 220anulada", "3 productos", "1 × Taladro inalámbrico 18 V", "2 productos"]);
    expect(ventas[0]!.className).toContain("anulada");
    expect(ventas[1]!.textContent).toContain("11:05 · Cuenta corriente · Constructora Martínez");
    expect(within(ventas[1]!).getByRole("button").querySelector(".medio-cuenta_corriente")).not.toBeNull();
    fireEvent.click(within(ventas[1]!).getByRole("button"));
    expect(within(ventas[1]!).getByTestId("detalle-venta").textContent).toBe("2,5 × Clavo punta París 2 pulgadas$25.0001 × Electrodo 2,5 mm$18.0003 × Disco de corte 115 mm$15.000");
    fireEvent.click(within(ventas[1]!).getAllByRole("button")[0]!);
    expect(within(ventas[1]!).queryByTestId("detalle-venta")).toBeNull();
  });

  it("017-E16 017-E17 017-E18 017-E19: otro día, comparado entero con el suyo; «Volver a hoy»; hasta hoy", async () => {
    await abrir();
    const calendario = screen.getByTestId("dia") as HTMLInputElement;
    expect(calendario.max).toBe("2026-10-17");
    fireEvent.change(calendario, { target: { value: "2026-10-16" } });
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Viernes 16/10"));
    expect(screen.getByTestId("total-de-hoy").textContent).toBe("$1.150.000");
    await waitFor(() => expect(screen.getByTestId("comparacion").textContent).toBe("+3733 %vs. el jueves 15/10 ($30.000)"));
    fireEvent.click(screen.getByTestId("volver-a-hoy"));
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Hoy, sábado 17/10"));
  });

  it("017-E21: sin conexión, otro día dice que hace falta internet", async () => {
    await abrir();
    apiFalsa.mockImplementation(async (ruta: string) => { if (ruta.includes("2026-10-14") || ruta.includes("2026-10-13")) throw new TypeError("Failed to fetch"); return dia("x", []); });
    fireEvent.change(screen.getByTestId("dia"), { target: { value: "2026-10-14" } });
    expect((await screen.findByTestId("sin-conexion")).textContent).toBe("Sin conexión: para ver otro día hace falta internet.");
  });

  it("017-E19: una fecha futura escrita a mano no se toma", async () => {
    await abrir();
    fireEvent.change(screen.getByTestId("dia"), { target: { value: "2026-10-20" } });
    expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Hoy, sábado 17/10");
  });

  it("017-E20: otro día sin ventas lo dice", async () => {
    await abrir();
    fireEvent.change(screen.getByTestId("dia"), { target: { value: "2026-10-14" } });
    expect((await screen.findByTestId("sin-ventas")).textContent).toBe("No hubo ventas ese día.");
  });

  it("017-E21: sin conexión y sin nada bajado, hoy dice que se ve cuando vuelva internet", async () => {
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<VentasDeHoy />);
    expect((await screen.findByTestId("sin-conexion")).textContent).toBe("Sin conexión: las ventas de hoy se ven cuando vuelva internet.");
  });

  it("017-E02: igual que ayer dice 0 %, sin flecha", async () => {
    dias["2026-10-16"] = [venta("y", a("2026-10-16", 9), "efectivo", 293000, [renglon("x", "1", 293000)])];
    await abrir();
    const pastilla = screen.getByTestId("comparacion").querySelector(".hoy-pastilla")!;
    expect(pastilla.className).toContain("igual");
    expect(pastilla.textContent).toBe("0 %");
    expect(pastilla.querySelector("svg")).toBeNull();
  });

  it("017-E13: se abren de a varias, como en la computadora", async () => {
    await abrir();
    const ventas = screen.getAllByTestId("venta-dia");
    fireEvent.click(within(ventas[1]!).getByRole("button"));
    fireEvent.click(within(ventas[3]!).getByRole("button"));
    expect(screen.getAllByTestId("detalle-venta")).toHaveLength(2);
  });

  it("sin permiso de ver ventas el servidor lo dice y no hay resumen", async () => {
    apiFalsa.mockRejectedValue(new ErrorApi(403, "No tenés permiso para esto"));
    render(<VentasDeHoy />);
    expect((await screen.findByText("No tenés permiso para esto")).textContent).toBeTruthy();
    expect(screen.queryByTestId("resumen-hoy")).toBeNull();
  });
});
