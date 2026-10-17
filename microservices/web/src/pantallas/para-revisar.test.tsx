/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));

import { ErrorApi } from "../api";
import { conPermisos, conTodosLosPermisos } from "../pruebas/sesion";
import { consultas } from "../consultas";
import { PESTANAS_DE_ANOMALIAS, PIDE_LAS_ANOMALIAS } from "./pestanas-de-anomalias";
import { DE_MAS as DE_MAS_COMPU } from "./compu/Mas";
import { DE_MAS as DE_MAS_CELULAR } from "./celular/App";
import { CabezaDeAnomalias } from "./celular/CabezaDeAnomalias";
import { ParaRevisar } from "./ParaRevisar";
import { describir } from "../negocio/apartados";

// Más → Anomalías → Para revisar (specs/014-cambios-apartados).
const de = { usuario_id: "u-ana", usuario: "Ana López", desactivado_en: "2026-10-17T09:12:00", dispositivo: "celular del mostrador", llegado_en: "2026-10-17T10:05:00", producto: null };
const VENTA = { id: "apa-1", tipo: "venta", metodo: "POST", ruta: "/ventas", hecho_en: "2026-10-17T08:47:00", error: null, ...de,
  cuerpo: { medio_pago: "efectivo", items: [{ descripcion: "Candado bronce 40 mm", cantidad: 2, precio_unitario: 11000 }, { descripcion: "Disco de corte 115 mm", cantidad: 1, precio_unitario: 5000 }] } };
const AJUSTE = { id: "apa-2", tipo: "stock.ajuste", metodo: "POST", ruta: "/stock/p1/ajustes", hecho_en: "2026-10-17T08:52:00", error: null, ...de, producto: "Thinner sello de oro", cuerpo: { cantidad_real: 6, motivo: "conté la estantería" } };
const DE_BETO = { ...VENTA, id: "apa-3", usuario_id: "u-beto", usuario: "Beto", error: "el producto se unió con otro" };
let lista: unknown[] = [];

describe("Para revisar", () => {
  beforeEach(() => {
    conTodosLosPermisos();
    consultas.clear();
    lista = [VENTA, AJUSTE, DE_BETO];
    apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string, opciones?: { method?: string }) => {
      if (ruta === "/apartados") return { apartados: lista };
      if (opciones?.method === "POST") { lista = lista.filter((c) => !ruta.includes(`/${(c as { id: string }).id}/`)); return {}; }
      return {};
    });
  });
  afterEach(() => { Object.defineProperty(navigator, "onLine", { value: true, configurable: true }); });

  it("014-E05 muestra cada cambio agrupado por persona, con qué es, cuándo lo hizo, cuándo llegó y desde qué dispositivo", async () => {
    render(<ParaRevisar />);
    const ana = await screen.findByRole("region", { name: "Ana López" });
    expect(ana.textContent).toContain("desactivada el 17/10 a las 09:12 · desde «celular del mostrador»");
    const [venta, ajuste] = within(ana).getAllByTestId("apartado");
    expect(venta!.textContent).toContain("Venta · $27.000 · Efectivo");
    expect(venta!.textContent).toContain("2 × Candado bronce 40 mm — $22.000");
    expect(venta!.textContent).toContain("Cobrada el 17/10 a las 08:47 · llegó a las 10:05");
    expect(ajuste!.textContent).toContain("Ajuste de stock · Thinner sello de oro");
    expect(ajuste!.textContent).toContain("Hay 6 · «conté la estantería»");
    expect(screen.getByRole("region", { name: "Beto" })).toBeTruthy();
  });

  it("014-E06 014-E09 «Aceptar» acepta ese cambio y solo ese; la lista se vuelve a pedir", async () => {
    render(<ParaRevisar />);
    const ana = await screen.findByRole("region", { name: "Ana López" });
    fireEvent.click(within(ana).getAllByTestId("aceptar-apartado")[0]!);
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/apartados/apa-1/aceptar", { method: "POST" }));
    await waitFor(() => expect(screen.getAllByTestId("apartado")).toHaveLength(2));
    expect(apiFalsa.mock.calls.filter(([r]) => String(r).endsWith("/aceptar"))).toHaveLength(1);
  });

  it("014-E07 «Descartar» lo saca de la lista", async () => {
    render(<ParaRevisar />);
    const ana = await screen.findByRole("region", { name: "Ana López" });
    fireEvent.click(within(ana).getAllByTestId("descartar-apartado")[1]!);
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/apartados/apa-2/descartar", { method: "POST" }));
    await waitFor(() => expect(screen.getAllByTestId("apartado")).toHaveLength(2));
  });

  it("014-E08 014-E18 si no se pudo aceptar, la tarjeta dice por qué y el cambio sigue ahí", async () => {
    render(<ParaRevisar />);
    // El motivo de la última vez, que guardó el servidor.
    const beto = await screen.findByRole("region", { name: "Beto" });
    expect(within(beto).getByTestId("error-de-apartado").textContent).toBe("No se pudo aceptar: el producto se unió con otro");
    // Y lo que dice el servidor ahora (por ejemplo, que otra persona ya lo decidió).
    apiFalsa.mockImplementation(async (ruta: string, opciones?: { method?: string }) => {
      if (opciones?.method === "POST") throw new ErrorApi(409, "Ya se decidió: lo aceptó Marta");
      return ruta === "/apartados" ? { apartados: lista } : {};
    });
    const ana = screen.getByRole("region", { name: "Ana López" });
    fireEvent.click(within(ana).getAllByTestId("aceptar-apartado")[0]!);
    expect((await within(ana).findByTestId("error-de-apartado")).textContent).toBe("Ya se decidió: lo aceptó Marta");
  });

  it("014-E10 sin nada para revisar, lo dice", async () => {
    lista = [];
    render(<ParaRevisar />);
    expect((await screen.findByTestId("nada-para-revisar")).textContent).toBe("No hay nada para revisar.");
  });

  it("sin conexión no deja aceptar ni descartar, y lo dice", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    render(<ParaRevisar />);
    await screen.findByRole("region", { name: "Ana López" });
    expect(screen.getByText("Sin conexión: para aceptar o descartar hace falta internet.")).toBeTruthy();
    for (const b of [...screen.getAllByTestId("aceptar-apartado"), ...screen.getAllByTestId("descartar-apartado")]) expect((b as HTMLButtonElement).disabled).toBe(true);
  });

  it("cada tipo de cambio se cuenta con las palabras del negocio", () => {
    const base = { ...de, id: "x", hecho_en: "2026-10-17T08:00:00", error: null };
    expect(describir({ ...base, tipo: "producto.cambio", metodo: "PATCH", ruta: "/productos/p1", producto: "Mecha 6 mm", cuerpo: { margen_elegido: 50 } } as never)).toMatchObject({ titulo: "Cambio de producto", resumen: "Mecha 6 mm", renglones: ["Margen 50 %"] });
    expect(describir({ ...base, tipo: "conteo.renglon", metodo: "PUT", ruta: "/conteos/c/renglones/p1", producto: "Mecha 6 mm", cuerpo: { cantidad: 4 } } as never)).toMatchObject({ titulo: "Conteo", renglones: ["Contó 4"] });
    expect(describir({ ...base, tipo: "consulta", metodo: "POST", ruta: "/consultas", cuerpo: { items: [{ descripcion: "Disco 115", precio_ofrecido: 3200 }] } } as never)).toMatchObject({ titulo: "No llevó", renglones: ["Disco 115 · ofrecido a $3.200"] });
  });
});

describe("Las pestañas de Anomalías", () => {
  beforeEach(() => { conTodosLosPermisos(); consultas.clear(); apiFalsa.mockReset(); apiFalsa.mockImplementation(async () => ({ apartados: [VENTA, AJUSTE] })); });

  it("014-E11 014-E12 primero «Para revisar» con «Administrar usuarios», después «Anotadas» con el de las anomalías; la opción de Más, con cualquiera", () => {
    expect(PESTANAS_DE_ANOMALIAS.map((p) => [p.valor, p.nombre, p.pide])).toEqual([["para-revisar", "Para revisar", ["admin.usuarios"]], ["anomalias", "Anotadas", ["negocio.anomalias"]]]);
    expect(DE_MAS_COMPU.find((d) => d.ruta === "anomalias")!.pide).toEqual(PIDE_LAS_ANOMALIAS);
    expect(DE_MAS_CELULAR.find((d) => d.parte === "anomalias")!.pide).toEqual(PIDE_LAS_ANOMALIAS);
  });

  it("014-E05 en el celular, la cantidad pendiente va a la derecha del nombre de «Para revisar»", async () => {
    render(<CabezaDeAnomalias actual="para-revisar" />);
    const cuenta = await screen.findByTestId("cuenta-para-revisar");
    expect(cuenta.textContent).toBe("2");
    const pestana = cuenta.closest("button")!;
    expect(pestana.textContent).toBe("Para revisar2");
    expect([...pestana.childNodes].indexOf(cuenta)).toBe(pestana.childNodes.length - 1);
  });

  it("014-E11 con solo «Administrar usuarios», no hay pestañas: solo se ve «Para revisar»", async () => {
    conPermisos("admin.usuarios");
    render(<CabezaDeAnomalias actual="para-revisar" />);
    await act(async () => undefined);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("heading").textContent).toBe("Anomalías");
  });

  it("014-E12 sin «Administrar usuarios» no pide lo apartado ni muestra la pestaña", async () => {
    conPermisos("negocio.anomalias");
    render(<CabezaDeAnomalias actual="anomalias" />);
    await act(async () => undefined);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(apiFalsa).not.toHaveBeenCalled();
  });
});
