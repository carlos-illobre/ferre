/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../credenciales", () => ({ hayHuella: () => false, listarCredenciales: async () => [], quitarCredencial: vi.fn(), vincularEsteDispositivo: vi.fn(), EVENTO_CREDENCIALES: "x" }));

import { conPermisos, conTodosLosPermisos } from "../pruebas/sesion";
import { PESTANAS_DE_USUARIOS } from "./pestanas-de-usuarios";
import { DE_MAS as DE_MAS_COMPU, Mas } from "./compu/Mas";
import { DE_MAS as DE_MAS_CELULAR } from "./celular/App";
import { CabezaDeUsuarios } from "./celular/Usuarios";
import { SesionesYDispositivos, Usuarios } from "./compu/base/pantallas/Usuarios";

// Más → Usuarios (decisión 88): una sola opción con cuatro pestañas, igual en las dos interfaces.
describe("Más → Usuarios", () => {
  beforeEach(() => {
    conTodosLosPermisos();
    location.hash = "";
    apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string) => {
      if (ruta === "/usuarios") return [{ id: "m1", email: "m@b", nombre: "Marta", activo: true, roles: [{ id: "r1", nombre: "Vendedor" }] }];
      if (ruta === "/sesiones") return [{ id: "s1", dispositivo: "laptop", ultimo_uso_en: "2026-09-14T12:00:00Z", email: "a@b", nombre: "Ana" }];
      return [];
    });
  });

  it("las pestañas son Usuarios, Sesiones, Roles y Quién hizo qué, en ese orden; en el celular la última dice Actividad", () => {
    expect(PESTANAS_DE_USUARIOS.map((p) => p.nombre)).toEqual(["Usuarios", "Sesiones", "Roles", "Quién hizo qué"]);
    expect(PESTANAS_DE_USUARIOS.map((p) => p.corto)).toEqual(["Usuarios", "Sesiones", "Roles", "Actividad"]);
    // Sesiones la ve cualquiera: ahí está la huella de cada uno.
    expect(PESTANAS_DE_USUARIOS.find((p) => p.valor === "sesiones")!.pide).toBeUndefined();
  });

  it("en Más hay una sola opción «Usuarios», sin Roles ni Quién hizo qué sueltos, en las dos interfaces", () => {
    for (const nombres of [DE_MAS_COMPU.map((d) => d.nombre), DE_MAS_CELULAR.map((d) => d.nombre)]) {
      expect(nombres).toContain("Usuarios");
      expect(nombres).not.toContain("Roles");
      expect(nombres).not.toContain("Quién hizo qué");
      expect(nombres).not.toContain("Usuarios y sesiones");
    }
    expect(DE_MAS_COMPU.find((d) => d.ruta === "usuarios")!.pide).toBeUndefined();
    expect(DE_MAS_CELULAR.find((d) => d.parte === "usuarios")!.pide).toBeUndefined();
  });

  it("en la computadora, la opción de Más lleva a la pestaña que se le indique", () => {
    render(<Mas atajoDe={() => null} opciones={DE_MAS_COMPU.filter((d) => d.ruta === "usuarios").map((d) => ({ ...d, destino: "sesiones" }))} />);
    fireEvent.click(screen.getByTestId("mas-usuarios"));
    expect(location.hash).toBe("#/sesiones");
  });

  it("en el celular se ven solo las pestañas que el rol permite, y tocar una lleva a su dirección", () => {
    conPermisos("admin.roles");
    render(<CabezaDeUsuarios actual="sesiones" />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Sesiones", "Roles"]);
    fireEvent.click(screen.getByRole("tab", { name: "Roles" }));
    expect(location.hash).toBe("#/mas/roles");
  });

  it("en el celular, con una sola pestaña a la vista no se dibujan pestañas", () => {
    conPermisos();
    render(<CabezaDeUsuarios actual="sesiones" />);
    expect(screen.getByRole("heading", { name: "Usuarios" })).toBeTruthy();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("en la computadora, la pestaña Usuarios tiene los autorizados y no las sesiones; la de Sesiones, las sesiones, la huella y el vínculo", async () => {
    const { unmount } = render(<Usuarios />);
    expect(await screen.findByText("Marta")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Sesiones abiertas" })).toBeNull();
    unmount();
    render(<SesionesYDispositivos />);
    expect(await screen.findByRole("heading", { name: "Sesiones abiertas" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mis celulares con huella" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Usuarios autorizados" })).toBeNull();
  });

  it("en la computadora, sin «Administrar sesiones» la pestaña Sesiones muestra solo la huella", async () => {
    conPermisos();
    render(<SesionesYDispositivos />);
    expect(await screen.findByRole("heading", { name: "Mis celulares con huella" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Sesiones abiertas" })).toBeNull();
  });
});
