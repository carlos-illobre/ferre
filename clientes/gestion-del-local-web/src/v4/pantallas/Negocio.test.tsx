/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: vi.fn(async () => ({ encolado: false })), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { ErrorApi } from "../../api";
import { dibujar } from "../pruebas";
import { Negocio } from "./Negocio";

const VENTAS = {
  ventas: [{ id: "v1", estado: "confirmada" }, { id: "v2", estado: "confirmada" }, { id: "v3", estado: "anulada" }],
  totales: { efectivo: 12000, mercado_pago: 223000 },
  total: 235000,
};
const COMPRAS = { desde: "2026-10-05", por_proveedor: [{ proveedor: "Tresge", compras: "1", total: "126900.00" }, { proveedor: "Comodo", compras: "2", total: "84091.20" }], total: 210991.2 };
const CONSULTAS = [
  { id: "q1", fecha: "2026-10-10T13:00:00Z", descripcion: "Amoladora 115 mm", precio_ofrecido: "89000" },
  { id: "q2", fecha: "2026-10-10T12:00:00Z", descripcion: "Bisagra vaivén", precio_ofrecido: null },
  { id: "q3", fecha: "2026-10-09T12:00:00Z", descripcion: "amoladora 115 mm ", precio_ofrecido: "86000" },
];

type Respuestas = Record<string, unknown>;
const NORMAL: Respuestas = { "/ventas": VENTAS, "/compras/semana": COMPRAS, "/consultas": CONSULTAS };

/** Cada ruta devuelve su valor; si es un `Error`, falla con él. */
function responder(respuestas: Respuestas) {
  apiFalsa.mockImplementation(async (ruta: string) => {
    const r = respuestas[ruta];
    if (r instanceof Error) throw r;
    return r;
  });
}

describe("Cómo va el negocio (v4)", () => {
  beforeEach(() => {
    apiFalsa.mockReset();
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ ok: true, db: "ok" }) })));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("muestra lo vendido hoy por medio de pago, sin contar las anuladas", async () => {
    responder(NORMAL);
    dibujar(<Negocio />, "negocio");
    await waitFor(() => expect(screen.getByTestId("vendido-hoy").textContent).toBe("$235.000"));
    expect(screen.getByTestId("cuantas-ventas").textContent).toBe("2 ventas · 1 anulada, que no suma");
    expect(screen.getByTestId("medio-efectivo").textContent).toContain("$12.000");
    expect(screen.getByTestId("medio-mercado_pago").textContent).toContain("$223.000");
    expect(screen.getByTestId("medio-tarjeta").textContent).toContain("$0");
    fireEvent.click(screen.getByTestId("ver-ventas"));
    expect(window.location.hash).toBe("#/ventas");
  });

  it("muestra las compras de la semana por proveedor, con su total", async () => {
    responder(NORMAL);
    dibujar(<Negocio />, "negocio");
    await waitFor(() => expect(screen.getByTestId("comprado").textContent).toBe("$210.991"));
    const bloque = screen.getByTestId("gastos-semana");
    expect(bloque.textContent).toContain("Desde el lunes 5 de octubre");
    const filas = within(bloque).getAllByTestId("proveedor");
    expect(filas.map((f) => f.textContent)).toEqual(["TRTresge1 compra$126.900", "COComodo2 compras$84.091"]);
  });

  it("junta lo que preguntaron varias veces y dice a cuánto se ofreció la última vez", async () => {
    responder(NORMAL);
    dibujar(<Negocio />, "negocio");
    const filas = await screen.findAllByTestId("consulta");
    expect(filas).toHaveLength(2);
    expect(filas[0]!.textContent).toBe("Amoladora 115 mmSe le ofreció a $89.0002 veces");
    expect(filas[1]!.textContent).toBe("Bisagra vaivénNo tenía precio1 vez");
  });

  it("un día sin movimiento lo dice en cada bloque, sin inventar números", async () => {
    responder({ "/ventas": { ventas: [], totales: {}, total: 0 }, "/compras/semana": { desde: "2026-10-05", por_proveedor: [], total: 0 }, "/consultas": [] });
    dibujar(<Negocio />, "negocio");
    await waitFor(() => expect(screen.getByTestId("resumen-hoy").textContent).toContain("Todavía no se registraron ventas en el día."));
    expect(screen.queryByTestId("ver-ventas")).toBeNull();
    expect(screen.getByTestId("gastos-semana").textContent).toContain("En la semana no se registraron compras.");
    expect(screen.getByTestId("consultas").textContent).toContain("Nadie preguntó por algo que después no llevó.");
  });

  it("si falla un solo bloque, los otros se ven y ese se reintenta por separado", async () => {
    responder({ ...NORMAL, "/compras/semana": new ErrorApi(500, "El servidor no pudo sumar las compras") });
    dibujar(<Negocio />, "negocio");
    const falla = await screen.findByTestId("error-de-bloque");
    expect(falla.textContent).toContain("No se pudieron cargar las compras");
    expect(falla.textContent).toContain("El servidor no pudo sumar las compras.");
    expect(screen.getByTestId("vendido-hoy").textContent).toBe("$235.000");
    expect(screen.getAllByTestId("consulta")).toHaveLength(2);

    responder(NORMAL);
    fireEvent.click(within(falla).getByTestId("reintentar"));
    await waitFor(() => expect(screen.getByTestId("comprado").textContent).toBe("$210.991"));
    expect(screen.queryByTestId("error-de-bloque")).toBeNull();
    expect(apiFalsa.mock.calls.filter(([ruta]) => ruta === "/ventas")).toHaveLength(1);
  });

  it("si se corta internet, quedan los números que había y avisa hasta cuándo son", async () => {
    responder(NORMAL);
    dibujar(<Negocio />, "negocio");
    await screen.findByTestId("vendido-hoy");
    act(() => { window.dispatchEvent(new Event("offline")); });
    const aviso = screen.getByTestId("resumen-sin-conexion");
    expect(aviso.textContent).toContain("Sin conexión: estos números pueden estar viejos");
    expect(aviso.textContent).toMatch(/Son los que llegaron hasta las \d\d:\d\d/);
    expect(screen.getByTestId("vendido-hoy").textContent).toBe("$235.000");

    // Al volver, se piden de nuevo solos.
    act(() => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(apiFalsa.mock.calls.filter(([ruta]) => ruta === "/ventas")).toHaveLength(2));
    expect(screen.queryByTestId("resumen-sin-conexion")).toBeNull();
  });

  it("sin conexión desde el arranque no muestra $0: dice que se ven cuando vuelva internet", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const sinRed = new TypeError("Failed to fetch");
    responder({ "/ventas": sinRed, "/compras/semana": sinRed, "/consultas": sinRed });
    dibujar(<Negocio />, "negocio");
    expect((await screen.findAllByTestId("error-de-bloque"))).toHaveLength(3);
    expect(screen.getByTestId("resumen-sin-conexion").textContent).toContain("Los números se ven solos cuando vuelva internet.");
    expect(screen.queryByTestId("vendido-hoy")).toBeNull();
  });

  it("al pie dice si el servidor responde", async () => {
    responder(NORMAL);
    dibujar(<Negocio />, "negocio");
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("Servidor ok · base ok"));
  });
});
