/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../sesion", () => ({ useSesion: () => ({ sesion: { estado: "con-sesion", usuario: { id: "u1", email: "a@b", nombre: "Ana", rol: "admin" }, sesionId: "s1" }, salir: vi.fn() }) }));

import { Administracion } from "./Administracion";

function eventos(pagina: number) {
  return { pagina, por_pagina: 50, total: 120, eventos: Array.from({ length: pagina === 3 ? 20 : 50 }, (_, i) => ({ id: `e${pagina}-${i}`, tipo: "venta.registrada", fecha: "2026-09-14T12:00:00Z", email: null, nombre: "Ana", contenido: { detalle: "x".repeat(200) } })) };
}

describe("Administración", () => {
  beforeEach(() => {
    apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string) => {
      if (ruta.startsWith("/auditoria")) return eventos(Number(new URL(`http://x${ruta}`).searchParams.get("pagina")));
      if (ruta === "/usuarios") return [{ id: "d1", email: "d@b", nombre: "Dueño", rol: "dueño", activo: true }, { id: "m1", email: "m@b", nombre: "Mostrador", rol: "mostrador", activo: true }];
      if (ruta === "/sesiones") return [{ id: "s1", dispositivo: "laptop", ultimo_uso_en: "2026-09-14T12:00:00Z", email: "a@b", nombre: "Ana" }, { id: "s2", dispositivo: "celular", ultimo_uso_en: "2026-09-14T11:00:00Z", email: "m@b", nombre: "Mostrador" }];
      return [];
    });
  });

  it("'Quién hizo qué' va de a 50 por página, acorta el detalle y pagina hacia adelante y atrás", async () => {
    render(<Administracion />);
    const paginado = await screen.findByTestId("paginado");
    expect(paginado.textContent).toContain("Página 1 de 3 · 120 acciones");
    expect(screen.getAllByText("venta.registrada")).toHaveLength(50);
    const detalles = Array.from(document.querySelectorAll("td code")).map((c) => c.textContent ?? "");
    expect(detalles).toHaveLength(50);
    expect(detalles.every((d) => d.length === 121 && d.endsWith("…"))).toBe(true); // 120 caracteres y puntos suspensivos
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

  it("el admin no puede tocar al dueño ni darle ese rol a nadie", async () => {
    render(<Administracion />);
    await screen.findByText("d@b");
    const filaDueno = screen.getByText("d@b").closest("tr")!;
    expect(filaDueno.querySelector("select")).toHaveProperty("disabled", true);
    const filaMostrador = screen.getByText("m@b").closest("tr")!;
    const opciones = Array.from(filaMostrador.querySelectorAll("select option")).map((o) => o.textContent);
    expect(opciones).toContain("admin");
    expect(opciones).not.toContain("dueño");
  });

  it("Sesiones: todos los botones dicen Cerrar; el de la propia es rojo, los demás azules", async () => {
    render(<Administracion />);
    await screen.findByText("celular");
    const botones = screen.getAllByRole("button", { name: "Cerrar" });
    expect(botones).toHaveLength(2);
    const propia = screen.getByText(/esta sesión/).closest("tr")!;
    expect(propia.querySelector("button.peligro")).toBeTruthy();
    expect(screen.getByText("celular").closest("tr")!.querySelector("button.primario")).toBeTruthy();
  });
});
