/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../../pruebas/sesion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// «Hoy» renovada en el celular (specs/017, maqueta C). El dispositivo cree que es el sábado
// 17/10/2026 a las 12:00; el servidor de mentira contesta las ventas de cada día.
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../../datos/conexion", async (original) => ({ ...(await original<typeof import("../../../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { VentasDelDia } from "./VentasDelDia";
import { consultas } from "../../../datos/conexion";
import { ErrorApi } from "../../../datos/conexion";

const a = (dia: string, h: number, m = 0) => new Date(`${dia}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`).toISOString();
const renglon = (descripcion: string, cantidad: string, precio: number) => ({ descripcion, cantidad, precio_unitario: String(precio), subtotal: Number(cantidad) * precio, margen_aplicado: null, explicacion: null });
const venta = (id: string, fecha: string, medio: string, total: number, items: any[], extra: any = {}) => ({ id, fecha, medio_pago: medio, total: String(total), estado: "confirmada", pagada_en: null, cliente: null, items, ...extra });
const HOY = [
  venta("v1", a("2026-10-17", 9, 12), "efectivo", 12000, [renglon("Mecha 6 mm madera", "2", 4000), renglon("Cinta aisladora negra 20 m", "2", 2000)]),
  venta("v2", a("2026-10-17", 10, 40), "mercado_pago", 223000, [renglon("Taladro inalámbrico 18 V", "1", 223000)]),
  venta("v3", a("2026-10-17", 11, 5), "cuenta_corriente", 58000, [{ ...renglon("Clavo punta París 2 pulgadas", "2.5", 10000), unidad: "kg" }, renglon("Electrodo 2,5 mm", "1", 18000), renglon("Disco de corte 115 mm", "3", 5000)], { cliente: "Constructora Martínez" }),
  venta("v4", a("2026-10-17", 11, 48), "tarjeta", 6000, [renglon("Lija al agua grano 220", "3", 2000)], { estado: "anulada" }),
];
const AYER = [venta("y1", a("2026-10-16", 9), "efectivo", 50000, [renglon("x", "1", 50000)]), venta("y2", a("2026-10-16", 11, 30), "efectivo", 200000, [renglon("y", "1", 200000)]), venta("y3", a("2026-10-16", 17), "efectivo", 900000, [renglon("z", "1", 900000)])];
let dias: Record<string, any[]>;
const dia = (d: string, ventas: any[]) => ({ dia: d, ventas, totales: {}, total: 0 });

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-17T12:00:00"), toFake: ["Date"] });
  consultas.clear(); apiFalsa.mockReset(); conPermisos("ventas.ver");
  dias = { "2026-10-17": HOY, "2026-10-16": AYER, "2026-10-15": [venta("j1", a("2026-10-15", 10), "tarjeta", 30000, [renglon("w", "1", 30000)])], "2026-10-14": [] };
  apiFalsa.mockImplementation(async (ruta: string) => { if (ruta === "/clientes") return []; const d = ruta.match(/dia=(.*)$/)?.[1] ?? "2026-10-17"; return dia(d, dias[d] ?? []); });
});
afterEach(() => { vi.useRealTimers(); });
const abrir = async () => { render(<VentasDelDia />); await screen.findByTestId("total-de-hoy"); await screen.findByTestId("comparacion"); };
// «Otro día» abre el panel con los últimos siete días; uno más viejo, con el calendario (decisión 141).
const elegirDia = (d: string) => {
  fireEvent.click(screen.getByTestId("cambiar-fecha"));
  const enLaLista = screen.queryByTestId(`otro-dia-${d}`);
  if (enLaLista) { fireEvent.click(enLaLista); return; }
  fireEvent.click(screen.getByTestId("elegir-en-calendario"));
  fireEvent.click(screen.getByTestId(`dia-${d}`));
};

describe("«Hoy» · celular", () => {
  it("017-E01 017-E02: el total sin las anuladas y la comparación con ayer hasta la misma hora", async () => {
    await abrir();
    expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Hoy, sábado 17/10 · 12:00");
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
    expect(screen.getByTestId("globo").textContent).toBe("10 h · $223.000");
    // Como la v2 (017-T012): la elegida queda y las demás bajan; lo de ayer a cada hora, marcado.
    expect(screen.getByTestId("grafico").firstElementChild!.className).toContain("con-elegida");
    expect(barras[1]!.parentElement!.className).toContain("elegida");
    expect(within(screen.getByTestId("grafico")).getAllByTestId("marca-ayer")).toHaveLength(2);
    fireEvent.click(barras[1]!);
    expect(screen.queryByTestId("globo")).toBeNull();
  });

  it("017-E05: cada medio con su ícono, su color, el importe y cuántas ventas", async () => {
    await abrir();
    expect(screen.getByTestId("medio-tarjeta").textContent).toBe("$0Tarjeta · 0 ventas");
    expect(screen.getByTestId("medio-mercado_pago").textContent).toBe("$223.000M. Pago · 1 venta");
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

  it("017-E11 017-E12 017-E13 017-E14 017-E15: renglones cortos, de la más nueva a la más vieja; tocar abre su hoja", async () => {
    await abrir();
    const ventas = screen.getAllByTestId("venta-dia");
    expect(ventas.map((v) => v.querySelector("b")!.textContent)).toEqual(["3 un. Lija al agua grano 220anulada", "3 productos", "1 un. Taladro inalámbrico 18 V", "2 productos"]);
    expect(ventas[0]!.className).toContain("anulada");
    expect(ventas[1]!.textContent).toContain("11:05 · Cuenta corriente · Constructora Martínez");
    expect(within(ventas[1]!).getByRole("button").querySelector(".medio-cuenta_corriente")).not.toBeNull();
    fireEvent.click(within(ventas[1]!).getByRole("button"));
    expect(screen.getByTestId("detalle-venta").textContent).toBe("2,5 kg Clavo punta París 2 pulgadas$10.000 c/u$25.0001 un. Electrodo 2,5 mm$18.000 c/u$18.0003 un. Disco de corte 115 mm$5.000 c/u$15.000");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("detalle-venta")).toBeNull();
  });

  it("017-E16 017-E17 017-E18 017-E19: otro día, comparado entero con el suyo; «Volver a hoy»; hasta hoy", async () => {
    await abrir();
    elegirDia("2026-10-16");
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Viernes 16/10"));
    expect(screen.getByTestId("total-de-hoy").textContent).toBe("$1.150.000");
    await waitFor(() => expect(screen.getByTestId("comparacion").textContent).toBe("+3733 %vs. el jueves 15/10 ($30.000)"));
    fireEvent.click(screen.getByTestId("volver-a-hoy"));
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Hoy, sábado 17/10 · 12:00"));
  });

  it("017-E21: sin conexión, otro día dice que hace falta internet", async () => {
    await abrir();
    apiFalsa.mockImplementation(async (ruta: string) => { if (ruta.includes("2026-10-14") || ruta.includes("2026-10-13")) throw new TypeError("Failed to fetch"); return dia("x", []); });
    elegirDia("2026-10-14");
    expect((await screen.findByTestId("sin-conexion")).textContent).toBe("Sin conexión: para ver otro día hace falta internet.");
  });

  it("017-E19: el calendario llega hasta hoy: los días que vienen no se pueden elegir", async () => {
    await abrir();
    fireEvent.click(screen.getByTestId("cambiar-fecha"));
    fireEvent.click(screen.getByTestId("elegir-en-calendario"));
    expect(screen.getByTestId("mes").textContent).toBe("octubre 2026");
    expect((screen.getByTestId("dia-2026-10-20") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("mes-siguiente") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("dia-2026-10-17").getAttribute("aria-current")).toBe("date");
    fireEvent.click(screen.getByTestId("mes-anterior"));
    fireEvent.click(screen.getByTestId("dia-2026-09-30"));
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Miércoles 30/09"));
  });

  it("017-T014: tocando el mes se elige otro año y otro mes; los que vienen, apagados", async () => {
    await abrir();
    fireEvent.click(screen.getByTestId("cambiar-fecha"));
    fireEvent.click(screen.getByTestId("elegir-en-calendario"));
    fireEvent.click(screen.getByTestId("mes"));
    expect(screen.getByTestId("mes").textContent).toBe("2026");
    expect((screen.getByTestId("mes-11") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("mes-siguiente") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("mes-anterior"));
    expect(screen.getByTestId("mes").textContent).toBe("2025");
    fireEvent.click(screen.getByTestId("mes-3"));
    expect(screen.getByTestId("mes").textContent).toBe("marzo 2025");
    fireEvent.click(screen.getByTestId("dia-2025-03-14"));
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Viernes 14/03"));
  });

  it("017-T013: «Otro día» muestra hoy y los seis días anteriores, con lo vendido y cuántas ventas, y el que se mira con su tilde", async () => {
    await abrir();
    fireEvent.click(screen.getByTestId("cambiar-fecha"));
    const panel = screen.getByTestId("hoja-otro-dia");
    expect(within(panel).getAllByRole("button", { pressed: false }).length + within(panel).getAllByRole("button", { pressed: true }).length).toBeGreaterThanOrEqual(7);
    await waitFor(() => expect(screen.getByTestId("otro-dia-2026-10-16").textContent).toBe("Ayer, viernes 16/10$1.150.000 · 3 ventas"));
    expect(screen.getByTestId("otro-dia-2026-10-17").getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(screen.getByTestId("otro-dia-2026-10-14").textContent).toBe("Miércoles 14/10Sin ventas"));
    expect(screen.getByTestId("otro-dia-2026-10-11")).toBeTruthy();
  });

  it("017-E20: otro día sin ventas lo dice", async () => {
    await abrir();
    elegirDia("2026-10-14");
    expect((await screen.findByTestId("sin-ventas")).textContent).toBe("No hubo ventas ese día.");
  });

  it("017-E21: sin conexión y sin nada bajado, hoy dice que se ve cuando vuelva internet", async () => {
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<VentasDelDia />);
    expect((await screen.findByTestId("sin-conexion")).textContent).toBe("Sin conexión: las ventas de hoy se ven cuando vuelva internet.");
  });

  it("017-E02: igual que ayer dice 0 %, sin flecha", async () => {
    dias["2026-10-16"] = [venta("y", a("2026-10-16", 9), "efectivo", 293000, [renglon("x", "1", 293000)])];
    await abrir();
    const pastilla = screen.getByTestId("comparacion").firstElementChild!;
    expect(pastilla.className).toContain("igual");
    expect(pastilla.textContent).toBe("0 %");
    expect(pastilla.querySelector("svg")).toBeNull();
  });

  it("017-E22 017-E25: «Buscar» abre un panel (decisión 141) con las ventas de ese producto resaltado y cuántas y cuánto suman; «Listo» lo cierra", async () => {
    await abrir();
    fireEvent.click(screen.getByTestId("abrir-buscar"));
    expect(screen.getByTestId("hoja-buscar-venta")).toBeTruthy();
    expect(screen.getByTestId("cuantas-halladas").textContent).toContain("Escribí un producto");
    fireEvent.change(screen.getByTestId("buscar-venta"), { target: { value: "electrodo" } });
    const ventas = within(screen.getByTestId("hoja-buscar-venta")).getAllByTestId("venta-dia");
    expect(ventas).toHaveLength(1);
    expect(ventas[0]!.querySelector("b")!.textContent).toBe("1 un. Electrodo 2,5 mm y 2 más");
    expect(ventas[0]!.querySelector("mark")!.textContent).toBe("Electrodo");
    expect(screen.getByTestId("cuantas-halladas").textContent).toBe("1 de 4 ventassuman $58.000");
    fireEvent.click(screen.getByTestId("salir-de-buscar"));
    expect(screen.queryByTestId("hoja-buscar-venta")).toBeNull();
    expect(screen.getAllByTestId("venta-dia")).toHaveLength(4);
  });

  it("017-E22 017-E23: busca sin tildes, por el importe y por el cliente", async () => {
    await abrir();
    fireEvent.click(screen.getByTestId("abrir-buscar"));
    const campo = screen.getByTestId("buscar-venta");
    const halladas = () => within(screen.getByTestId("hoja-buscar-venta")).getAllByTestId("venta-dia");
    fireEvent.change(campo, { target: { value: "inalambrico" } });
    expect(halladas().map((v) => v.textContent)).toEqual([expect.stringContaining("Taladro")]);
    fireEvent.change(campo, { target: { value: "$223.000" } });
    expect(halladas()).toHaveLength(1);
    fireEvent.change(campo, { target: { value: "martinez" } });
    expect(halladas().map((v) => v.textContent)).toEqual([expect.stringContaining("Constructora Martínez")]);
  });

  it("017-E24: sin resultados lo dice, y deja borrar la búsqueda o cerrar el panel", async () => {
    await abrir();
    fireEvent.click(screen.getByTestId("abrir-buscar"));
    fireEvent.change(screen.getByTestId("buscar-venta"), { target: { value: "destornillador" } });
    expect(screen.getByTestId("sin-resultados").textContent).toContain("Ninguna venta con «destornillador»");
    fireEvent.click(screen.getByRole("button", { name: /Borrar la búsqueda/ }));
    expect((screen.getByTestId("buscar-venta") as HTMLInputElement).value).toBe("");
    fireEvent.click(screen.getByTestId("salir-de-buscar"));
    expect(screen.queryByTestId("hoja-buscar-venta")).toBeNull();
    expect(screen.getByTestId("resumen-hoy")).toBeTruthy();
  });

  it("017-E29: en otro día, solo quien anula ventas de cualquier día ve «Anular»", async () => {
    render(<VentasDelDia anulaHoy anulaCualquierDia={false} />);
    await screen.findByTestId("total-de-hoy");
    fireEvent.click(within(screen.getAllByTestId("venta-dia")[1]!).getByRole("button"));
    expect(screen.getByTestId("anular")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    elegirDia("2026-10-16");
    await waitFor(() => expect(screen.getByTestId("dia-que-se-mira").textContent).toBe("Viernes 16/10"));
    fireEvent.click(within(screen.getAllByTestId("venta-dia")[0]!).getByRole("button"));
    expect(screen.queryByTestId("anular")).toBeNull();
  });

  it("sin permiso de ver ventas el servidor lo dice y no hay resumen", async () => {
    apiFalsa.mockRejectedValue(new ErrorApi(403, "No tenés permiso para esto"));
    render(<VentasDelDia />);
    expect((await screen.findByText("No tenés permiso para esto")).textContent).toBeTruthy();
    expect(screen.queryByTestId("resumen-hoy")).toBeNull();
  });
});

describe("corregir y cambio en el celular (019, T007 y T010)", () => {
  // Los renglones con su id y lo que ya volvió, como los manda el servidor.
  const conIds = () => HOY.forEach((v: any) => v.items.forEach((i: any, n: number) => { i.id ??= `${v.id}-${n}`; i.producto_id ??= `p-${v.id}-${n}`; i.devuelto ??= "0"; v.version ??= v.fecha; }));
  const abrirVenta = async (n: number) => {
    conIds();
    render(<VentasDelDia anulaHoy />);
    await screen.findByTestId("total-de-hoy");
    fireEvent.click(within(screen.getAllByTestId("venta-dia")[n]!).getByRole("button"));
    return screen.getByTestId("hoja-venta");
  };

  it("019-E01 019-E02 019-E03: la hoja de la venta tiene Corregir · Cambio · Anular; corregir una más dice la diferencia y se cobra con el medio elegido", async () => {
    const hoja = await abrirVenta(3); // la de efectivo: 2 mechas y 2 cintas
    expect(within(hoja).getAllByRole("button").map((b) => b.textContent).filter((x) => ["Corregir", "Cambio", "Anular"].includes(x!))).toEqual(["Corregir", "Cambio", "Anular"]);
    fireEvent.click(within(hoja).getByTestId("corregir"));
    fireEvent.click(within(hoja).getAllByTestId("mas")[0]!);
    expect(within(hoja).getByTestId("total-corregido").textContent).toBe("$16.000");
    expect(within(hoja).getByTestId("diferencia").textContent).toBe("+$4.000");
    fireEvent.click(within(hoja).getByTestId("dif-tarjeta"));
    apiFalsa.mockResolvedValueOnce({ id: "v1", total: 16000, diferencia: 4000, resuelta: "cobrada", version: "x" });
    fireEvent.click(within(hoja).getByTestId("guardar-correccion"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toBe("Corrección guardada · +$4.000"));
    const cuerpo = JSON.parse(String(apiFalsa.mock.calls.find((c) => String(c[0]).endsWith("/corregir"))![1].body));
    expect(cuerpo).toMatchObject({ medio_pago: "efectivo", medio_diferencia: "tarjeta", items: [{ cantidad: 3 }, { cantidad: 2 }] });
  });

  it("019-E12 019-E13 019-E18: «Cambio» desde la venta: lo que vuelve al precio pagado, fallado; sin nada que se lleve es una devolución", async () => {
    const hoja = await abrirVenta(3);
    fireEvent.click(within(hoja).getByTestId("cambio"));
    const cambio = screen.getByTestId("hoja-cambio");
    fireEvent.click(within(cambio).getAllByTestId("marcar-vuelve")[0]!);
    fireEvent.click(within(cambio).getByTestId("fallado"));
    expect(within(cambio).getByTestId("diferencia-cambio").textContent).toContain("$4.000");
    expect(within(cambio).getByTestId("confirmar-cambio").textContent).toBe("Devolver $4.000");
    apiFalsa.mockResolvedValueOnce({ id: "c1", venta_id: "v1", vuelve: 4000, se_lleva: 0, diferencia: -4000, resuelto: "devuelto" });
    fireEvent.click(within(cambio).getByTestId("confirmar-cambio"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toBe("Devolución registrada · $4.000 devueltos"));
    const llamada = apiFalsa.mock.calls.find((c) => String(c[0]).endsWith("/cambio"))!;
    expect(llamada[0]).toBe("/ventas/v1/cambio");
    expect(JSON.parse(String(llamada[1].body))).toEqual({ vuelve: [{ item_id: "v1-0", cantidad: 1, fallado: true }], se_lleva: [] });
  });

  it("019-E11: «Cambio» arriba de la lista busca la venta por el producto que vuelve", async () => {
    conIds();
    render(<VentasDelDia anulaHoy />);
    await screen.findByTestId("total-de-hoy");
    apiFalsa.mockImplementation(async (ruta: string) => ruta.startsWith("/ventas/para-cambio")
      ? [{ id: "v2", fecha: a("2026-10-17", 10, 40), medio_pago: "mercado_pago", cliente: null, total: "223000", items: [{ id: "v2-0", producto_id: "p", descripcion: "Taladro inalámbrico 18 V", cantidad: "1", foto_url: null, por_devolver: 1, pagado: 223000 }] }]
      : dia("2026-10-17", HOY));
    fireEvent.click(screen.getByTestId("registrar-cambio"));
    fireEvent.change(screen.getByTestId("buscar-venta-cambio"), { target: { value: "taladro" } });
    fireEvent.click(await screen.findByTestId("venta-para-cambio"));
    expect(within(screen.getByTestId("hoja-cambio")).getByTestId("renglon-que-vuelve").textContent).toContain("Se pagó $223.000 c/u");
  });

  it("019-E24: sin permiso no hay Corregir ni Cambio", async () => {
    conIds();
    render(<VentasDelDia />);
    await screen.findByTestId("total-de-hoy");
    expect(screen.queryByTestId("registrar-cambio")).toBeNull();
    fireEvent.click(within(screen.getAllByTestId("venta-dia")[0]!).getByRole("button"));
    expect(screen.queryByTestId("corregir")).toBeNull();
    expect(screen.queryByTestId("cambio")).toBeNull();
  });
});
