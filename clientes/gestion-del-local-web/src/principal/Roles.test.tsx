/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { ErrorApi } from "../api";
import { Roles } from "./Roles";

const permisos = [
  { clave: "ventas.registrar", parte: "Vender", nombre: "Vender", detalle: "Armar una venta y cobrar" },
  { clave: "deposito.ingresos", parte: "Depósito", nombre: "Registrar ingresos", detalle: "Registrar la mercadería que llega" },
  { clave: "admin.roles", parte: "Administración", nombre: "Administrar roles", detalle: "Crear roles y cambiarles los permisos" },
];
const roles = [
  { id: "r1", nombre: "Vendedor", permisos: ["ventas.registrar"], usuarios: 2 },
  { id: "r2", nombre: "Encargado", permisos: ["ventas.registrar", "deposito.ingresos"], usuarios: 0 },
];

// Roles (RF-72, RF-75): un rol es un nombre y los permisos que se le tildan.
describe("Roles", () => {
  beforeEach(() => {
    apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/permisos" ? permisos : ruta === "/roles" ? roles : {}));
    window.scrollTo = () => undefined;
  });
  const rol = (nombre: string) => screen.getAllByTestId("rol").find((r) => r.textContent?.includes(nombre))!;

  it("lista cada rol con sus permisos y cuántas personas lo tienen; solo se borra el que nadie tiene", async () => {
    render(<Roles />);
    await screen.findByTestId("lista-de-roles");
    expect(rol("Vendedor").textContent).toContain("2 personas");
    expect(rol("Vendedor").textContent).toContain("Vender");
    expect(within(rol("Vendedor")).queryByTestId("borrar-rol")).toBeNull();
    fireEvent.click(within(rol("Encargado")).getByTestId("borrar-rol"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/roles/r2", { method: "DELETE" }));
    expect((await screen.findByTestId("mensaje-roles")).textContent).toContain("Encargado");
  });

  it("un rol nuevo pide nombre y al menos un permiso; los permisos van agrupados por parte, con su explicación", async () => {
    render(<Roles />);
    fireEvent.click(await screen.findByTestId("rol-nuevo"));
    const formulario = screen.getByTestId("rol-en-edicion");
    expect(formulario.textContent).toContain("Registrar la mercadería que llega");
    fireEvent.click(screen.getByTestId("guardar-rol"));
    expect(formulario.textContent).toContain("Poné el nombre del rol");
    fireEvent.change(screen.getByTestId("nombre-rol"), { target: { value: "Cajero" } });
    fireEvent.click(screen.getByTestId("guardar-rol"));
    expect(formulario.textContent).toContain("al menos un permiso");
    fireEvent.click(screen.getByTestId("permiso-ventas.registrar"));
    fireEvent.click(screen.getByTestId("guardar-rol"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/roles", { method: "POST", body: JSON.stringify({ nombre: "Cajero", permisos: ["ventas.registrar"] }) }));
    expect((await screen.findByTestId("mensaje-roles")).textContent).toContain("Cajero");
  });

  it("cambiar un rol trae lo que tiene y, si el servidor no deja, muestra por qué", async () => {
    render(<Roles />);
    await screen.findByTestId("lista-de-roles");
    fireEvent.click(within(rol("Vendedor")).getByTestId("cambiar-rol"));
    expect((screen.getByTestId("nombre-rol") as HTMLInputElement).value).toBe("Vendedor");
    expect((screen.getByTestId("permiso-ventas.registrar") as HTMLInputElement).checked).toBe(true);
    apiFalsa.mockImplementation(async (ruta: string, o?: RequestInit) => {
      if (o?.method === "PATCH") throw new ErrorApi(409, "Tiene que quedar alguien que pueda administrar usuarios y roles");
      return ruta === "/permisos" ? permisos : roles;
    });
    fireEvent.click(screen.getByTestId("permiso-admin.roles"));
    fireEvent.click(screen.getByTestId("guardar-rol"));
    await waitFor(() => expect(screen.getByTestId("rol-en-edicion").textContent).toContain("Tiene que quedar alguien"));
  });
});
