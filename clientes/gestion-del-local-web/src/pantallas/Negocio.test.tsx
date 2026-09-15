/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../sesion", () => ({ useSesion: () => ({ sesion: { estado: "con-sesion", usuario: { id: "u1", email: "a@b", nombre: "Ana", rol: "admin" }, sesionId: "s1" }, salir: vi.fn() }), administra: () => true }));
vi.mock("../credenciales", () => ({ hayHuella: () => false, listarCredenciales: async () => [], quitarCredencial: vi.fn(), vincularEsteDispositivo: vi.fn(), EVENTO_CREDENCIALES: "x" }));

import { Negocio } from "./Negocio";

function eventos(pagina: number) {
  return { pagina, por_pagina: 10, total: 24, eventos: Array.from({ length: pagina === 3 ? 4 : 10 }, (_, i) => ({ id: `e${pagina}-${i}`, tipo: "venta.registrada", fecha: "2026-09-14T12:00:00Z", email: null, nombre: "Ana", contenido: { detalle: "x".repeat(200) } })) };
}

describe("Negocio", () => {
  beforeEach(() => {
    apiFalsa.mockReset();
    globalThis.fetch = vi.fn(async () => ({ json: async () => ({ ok: true, db: "ok" }) })) as never;
    apiFalsa.mockImplementation(async (ruta: string) => {
      if (ruta.startsWith("/auditoria")) return eventos(Number(new URL(`http://x${ruta}`).searchParams.get("pagina")));
      if (ruta === "/usuarios") return [{ id: "d1", email: "d@b", nombre: "Dueño", rol: "dueño", activo: true }, { id: "m1", email: "m@b", nombre: "Mostrador", rol: "mostrador", activo: true }];
      if (ruta === "/sesiones") return [{ id: "s1", dispositivo: "laptop", ultimo_uso_en: "2026-09-14T12:00:00Z", email: "a@b", nombre: "Ana" }, { id: "s2", dispositivo: "celular", ultimo_uso_en: "2026-09-14T11:00:00Z", email: "m@b", nombre: "Mostrador" }];
      if (ruta === "/ventas") return { total: 10500, totales: { efectivo: 10500 }, ventas: [{ id: "v1", fecha: "2026-09-14T12:00:00Z", medio_pago: "efectivo", total: "10500", estado: "confirmada", cliente: null, items: [{ descripcion: "MECHA", cantidad: "3", precio_unitario: "3000" }] }] };
      if (ruta === "/compras/semana") return { desde: "2026-09-08", por_proveedor: [{ proveedor: "Proveedor uno", compras: "2", total: "40000" }], total: 40000 };
      return [];
    });
  });

  it("muestra quién soy, las ventas de hoy con su detalle y los gastos de la semana", async () => {
    render(<Negocio />);
    expect(await screen.findByTestId("usuario-negocio")).toHaveProperty("textContent", "Ana");
    await waitFor(() => expect(screen.getByTestId("resumen-hoy").textContent).toContain("$10.500"));
    expect(screen.getByTestId("resumen-hoy").textContent).toContain("1 ventas");
    expect(screen.getByTestId("ventas-de-hoy").textContent).toContain("3 × MECHA");
    expect(screen.getByTestId("gastos-semana").textContent).toContain("$40.000");
    expect(screen.getByText("Proveedor uno").parentElement!.textContent).toContain("2 compras");
  });

  it("'Quién hizo qué' va de a 10 por página, acorta el detalle y pagina hacia adelante y atrás", async () => {
    render(<Negocio />);
    const paginado = await screen.findByTestId("paginado");
    expect(paginado.textContent).toContain("Página 1 de 3 · 24 acciones");
    expect(screen.getAllByText("venta.registrada", { exact: false })).toHaveLength(10);
    const detalles = Array.from(document.querySelectorAll("code")).map((c) => c.textContent ?? "");
    expect(detalles.every((d) => d.length === 121 && d.endsWith("…"))).toBe(true);
    expect(screen.getByRole("button", { name: "← Anteriores" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Siguientes →" }));
    await waitFor(() => expect(screen.getByTestId("paginado").textContent).toContain("Página 2 de 3"));
    expect(apiFalsa).toHaveBeenCalledWith("/auditoria?pagina=2");
    fireEvent.click(screen.getByRole("button", { name: "Siguientes →" }));
    await waitFor(() => expect(screen.getByTestId("paginado").textContent).toContain("Página 3 de 3"));
    expect(screen.getByRole("button", { name: "Siguientes →" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "← Anteriores" }));
    await waitFor(() => expect(screen.getByTestId("paginado").textContent).toContain("Página 2 de 3"));
  });

  it("el admin no puede tocar al dueño ni darle ese rol a nadie; autoriza desde una hoja", async () => {
    render(<Negocio />);
    const filas = await screen.findAllByTestId("usuario-fila");
    const filaDueno = filas.find((f) => f.textContent?.includes("d@b"))!;
    expect(filaDueno.querySelector("select")).toHaveProperty("disabled", true);
    expect(filaDueno.textContent).toContain("solo el dueño");
    const filaMostrador = filas.find((f) => f.textContent?.includes("m@b"))!;
    const opciones = Array.from(filaMostrador.querySelectorAll("select option")).map((o) => o.textContent);
    expect(opciones).toContain("admin");
    expect(opciones).not.toContain("dueño");
    fireEvent.click(screen.getByTestId("autorizar"));
    const alta = screen.getByTestId("alta-usuario");
    expect(Array.from(alta.querySelectorAll("option")).map((o) => o.textContent)).not.toContain("dueño");
  });

  it("Sesiones: todos los botones dicen Cerrar; el de la propia es coral", async () => {
    render(<Negocio />);
    await waitFor(() => expect(screen.getAllByTestId("sesion")).toHaveLength(2));
    const botones = within(screen.getByTestId("sesiones")).getAllByRole("button", { name: "Cerrar" });
    expect(botones).toHaveLength(2);
    const propia = screen.getByText(/esta sesión/).closest("[data-testid=sesion]")!;
    expect(propia.querySelector("button.coral")).toBeTruthy();
    const otra = screen.getAllByTestId("sesion").find((s) => s.textContent?.includes("celular"))!;
    expect(otra.querySelector("button.coral")).toBeNull();
  });
});
