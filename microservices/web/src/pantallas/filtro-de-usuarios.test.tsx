/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../credenciales", () => ({ hayHuella: () => false, listarCredenciales: async () => [], quitarCredencial: vi.fn(), vincularEsteDispositivo: vi.fn(), EVENTO_CREDENCIALES: "x" }));

import { conTodosLosPermisos } from "../pruebas/sesion";
import { Usuarios } from "./compu/base/pantallas/Usuarios";

const VENDEDOR = { id: "r1", nombre: "Vendedor" }, RECEPCION = { id: "r2", nombre: "Recepción" };
const GENTE = [
  { id: "u1", email: "marta.bress@ferre.test", nombre: "Marta", activo: true, roles: [VENDEDOR] },
  { id: "u2", email: "lucia.fernandez@ferre.test", nombre: "Lucía Fernández", activo: false, roles: [RECEPCION] },
  { id: "u3", email: "luis@ferre.test", nombre: "Luis", activo: true, roles: [VENDEDOR, RECEPCION] },
];

// 007-T033: en la computadora, arriba de la tabla, buscar por correo o nombre y filtrar por rol (decisión 98).
describe("buscar y filtrar usuarios en la computadora", () => {
  beforeEach(() => {
    conTodosLosPermisos();
    apiFalsa.mockReset().mockImplementation(async (ruta: string) => (ruta === "/usuarios" ? GENTE : ruta === "/roles" ? [VENDEDOR, RECEPCION] : []));
  });
  const filas = () => screen.getAllByTestId("usuario-fila").map((f) => f.querySelector(".nombre")!.textContent);
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

  it("la lista «Rol» deja solo a quienes lo tienen, y se combina con lo escrito", async () => {
    render(<Usuarios />);
    await screen.findAllByTestId("usuario-fila");
    await screen.findByRole("option", { name: "Recepción" });
    fireEvent.change(screen.getByTestId("filtro-rol"), { target: { value: "r2" } });
    expect(filas()).toEqual(["Lucía Fernández", "Luis"]);
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("2 de 3 usuarios con el rol Recepción");
    fireEvent.change(buscador(), { target: { value: "marta" } });
    expect(screen.queryAllByTestId("usuario-fila")).toHaveLength(0);
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("Nadie coincide con la búsqueda.");
  });
});
