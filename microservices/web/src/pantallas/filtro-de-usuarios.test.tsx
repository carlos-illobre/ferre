/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../credenciales", () => ({ hayHuella: () => false, listarCredenciales: async () => [], quitarCredencial: vi.fn(), vincularEsteDispositivo: vi.fn(), EVENTO_CREDENCIALES: "x" }));

import { conTodosLosPermisos } from "../pruebas/sesion";
import { Usuarios } from "./compu/base/pantallas/Usuarios";

const VENDEDOR = { id: "r1", nombre: "Vendedor" }, RECEPCION = { id: "r2", nombre: "Recepción" };
const GENTE = [
  { id: "u1", email: "marta.bress@ferre.test", nombre: "Marta", activo: true, creado_en: "2026-08-01T12:00:00Z", roles: [VENDEDOR] },
  { id: "u2", email: "lucia.fernandez@ferre.test", nombre: "Lucía Fernández", activo: false, creado_en: "2026-08-01T12:00:00Z", roles: [RECEPCION] },
  { id: "u3", email: "luis@ferre.test", nombre: "Luis", activo: true, creado_en: "2026-08-01T12:00:00Z", roles: [VENDEDOR, RECEPCION] },
];

// 007-T033 y 007-T044: en la computadora, arriba de la tabla, buscar, filtrar por roles y estado, y ordenar (decisiones 98 y 102).
describe("buscar y filtrar usuarios en la computadora", () => {
  beforeEach(() => {
    conTodosLosPermisos();
    apiFalsa.mockReset().mockImplementation(async (ruta: string) => (ruta === "/usuarios" ? GENTE : ruta === "/roles" ? [VENDEDOR, RECEPCION] : []));
  });
  const filas = () => screen.getAllByTestId("usuario-fila").map((f) => f.querySelector(".uv-nom")!.firstChild!.textContent);
  const buscador = () => screen.getByTestId("buscar-usuario") as HTMLInputElement;

  it("al escribir sugiere; con las flechas y Enter se elige una y quedan solo esa persona", async () => {
    render(<Usuarios />);
    await screen.findAllByTestId("usuario-fila");
    fireEvent.change(buscador(), { target: { value: "lu" } });
    expect(screen.getAllByTestId("sugerencia-usuario").map((s) => s.textContent)).toEqual(["lucia.fernandez@ferre.testLucía Fernández", "luis@ferre.testLuis"]);
    expect(filas()).toEqual(["Lucía Fernández", "Luis"]);
    fireEvent.keyDown(buscador(), { key: "ArrowDown" });
    fireEvent.keyDown(buscador(), { key: "ArrowDown" });
    expect(buscador().getAttribute("aria-activedescendant")).toBe(screen.getAllByTestId("sugerencia-usuario")[1]!.id);
    fireEvent.keyDown(buscador(), { key: "Enter" });
    expect(buscador().value).toBe("luis@ferre.test");
    expect(screen.queryByTestId("sugerencia-usuario")).toBeNull();
    expect(filas()).toEqual(["Luis"]);
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("1 de 3 usuarios");
  });

  it("Escape cierra las sugerencias sin elegir ninguna", async () => {
    render(<Usuarios />);
    await screen.findAllByTestId("usuario-fila");
    fireEvent.change(buscador(), { target: { value: "lu" } });
    fireEvent.keyDown(buscador(), { key: "Escape" });
    expect(screen.queryByTestId("sugerencia-usuario")).toBeNull();
    expect(buscador().value).toBe("lu");
  });

  it("«Filtros» deja a quienes tienen cualquiera de los roles elegidos y el estado; se combina con lo escrito", async () => {
    render(<Usuarios />);
    await screen.findAllByTestId("usuario-fila");
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("3 usuarios");
    fireEvent.click(screen.getByTestId("abrir-filtros"));
    const roles = within(within(screen.getByTestId("panel-filtros")).getByRole("group", { name: "Roles" }));
    fireEvent.click(await roles.findByRole("button", { name: "Recepción" }));
    expect(filas()).toEqual(["Lucía Fernández", "Luis"]);
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("2 de 3 usuarios");
    fireEvent.click(within(within(screen.getByTestId("panel-filtros")).getByRole("group", { name: "Estado" })).getByRole("button", { name: "Activos" }));
    expect(filas()).toEqual(["Luis"]);
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));
    fireEvent.click(roles.getByRole("button", { name: "Vendedor" }));
    fireEvent.click(roles.getByRole("button", { name: "Recepción" }));
    expect(filas()).toEqual(["Lucía Fernández", "Luis", "Marta"]);
    fireEvent.change(buscador(), { target: { value: "marta" } });
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));
    fireEvent.change(buscador(), { target: { value: "zz" } });
    expect(screen.queryAllByTestId("usuario-fila")).toHaveLength(0);
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("Nadie coincide con la búsqueda.");
  });

  it("se ordena por correo o por estado, primero los activos", async () => {
    render(<Usuarios />);
    await screen.findAllByTestId("usuario-fila");
    expect(filas()).toEqual(["Lucía Fernández", "Luis", "Marta"]);
    fireEvent.click(screen.getByTestId("abrir-filtros"));
    fireEvent.click(screen.getByTestId("ordenar-estado"));
    expect(filas()).toEqual(["Luis", "Marta", "Lucía Fernández"]);
  });
});
