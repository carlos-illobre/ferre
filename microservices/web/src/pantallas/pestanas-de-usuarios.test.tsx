/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../datos/conexion", async (original) => ({ ...(await original<typeof import("../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../datos/credenciales", async (original) => ({ ...(await original<typeof import("../datos/credenciales")>()), ...(({ hayHuella: () => false, listarCredenciales: async () => [], quitarCredencial: vi.fn(), vincularEsteDispositivo: vi.fn(), EVENTO_CREDENCIALES: "x" })) }));

import { conPermisos, conTodosLosPermisos } from "../pruebas/sesion";
import { PESTANAS_DE_USUARIOS } from "./pestanas-de-usuarios";
import { DE_MAS as DE_MAS_COMPU } from "./compu/marco/Mas";
import { DE_MAS as DE_MAS_CELULAR } from "./celular/App";
import { CabezaDeNegocio } from "./celular/negocio/CabezaDeNegocio";
import { irA } from "./celular/rutas";
import { Usuarios } from "./compu/negocio/Usuarios";

// Más → Usuarios (decisión 88): una sola opción con cuatro pestañas, igual en las dos interfaces.
describe("Más → Usuarios", () => {
  beforeEach(() => {
    conTodosLosPermisos();
    location.hash = "";
    apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string) => {
      if (ruta === "/usuarios") return [{ id: "m1", email: "m@b", nombre: "Marta", activo: true, creado_en: "2026-08-01T12:00:00Z", roles: [{ id: "r1", nombre: "Vendedor" }] }];
      if (ruta === "/sesiones") return [{ id: "s1", dispositivo: "laptop", ultimo_uso_en: "2026-09-14T12:00:00Z", email: "a@b", nombre: "Ana" }];
      return [];
    });
  });

  it("007-T037 las pestañas son Usuarios, Roles y Quién hizo qué, en ese orden, sin Sesiones; en el celular la última dice Actividad", () => {
    expect(PESTANAS_DE_USUARIOS.map((p) => p.nombre)).toEqual(["Usuarios", "Roles", "Quién hizo qué"]);
    expect(PESTANAS_DE_USUARIOS.map((p) => p.corto)).toEqual(["Usuarios", "Roles", "Actividad"]);
    expect(PESTANAS_DE_USUARIOS.every((p) => p.pide?.length)).toBe(true);
  });

  it("021-E01 Usuarios, Roles y Quién hizo qué están en la parte Negocio, no en Más (decisión 149)", () => {
    const nombres = DE_MAS_COMPU.map((d) => d.nombre);
    for (const n of ["Usuarios", "Roles", "Quién hizo qué"]) expect(nombres).not.toContain(n);
    // La opción del celular sigue con lo que pide cualquiera de sus pantallas, para reconocer adónde se llegó.
    expect(DE_MAS_CELULAR.find((d) => d.parte === "usuarios")!.pide).toEqual(["admin.usuarios", "admin.roles", "negocio.actividad"]);
  });

  it("en el celular, Negocio muestra solo las pestañas que el rol permite; con solo «Administrar roles», Usuarios lleva a los roles", () => {
    conPermisos("admin.roles", "negocio.actividad");
    render(<CabezaDeNegocio actual="actividad" />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Usuarios", "Actividad"]);
    fireEvent.click(screen.getByRole("tab", { name: "Usuarios" }));
    expect(location.hash).toBe("#/mas/roles");
  });

  it("en el celular, con una sola pestaña a la vista no se dibujan pestañas, y el título es Negocio", () => {
    conPermisos("admin.roles");
    render(<CabezaDeNegocio actual="roles" />);
    expect(screen.getByRole("heading", { name: "Negocio" })).toBeTruthy();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("en el celular, con los dos permisos, «Roles y permisos» es un botón dentro de Usuarios", () => {
    conTodosLosPermisos();
    irA("mas/usuarios"); // el enrutador recuerda la dirección de la prueba anterior
    render(<CabezaDeNegocio actual="usuarios" />);
    fireEvent.click(screen.getByTestId("roles-y-permisos"));
    expect(location.hash).toBe("#/mas/roles");
  });

  it("007-T037 en la computadora, la pestaña Usuarios tiene la columna «Acceso» con lo de cada persona, y no hay sección de sesiones", async () => {
    render(<Usuarios />);
    expect((await screen.findAllByText("Marta")).length).toBeGreaterThan(0);
    expect(document.querySelector("[data-testid=cabeza-de-usuarios]")!.textContent).toContain("Acceso");
    expect(screen.getByLabelText(/sesi/i)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Sesiones abiertas" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Mis celulares con huella" })).toBeNull();
  });
});
