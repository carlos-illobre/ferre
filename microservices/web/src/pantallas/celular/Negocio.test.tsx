/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../credenciales", () => ({ hayHuella: () => false, listarCredenciales: async () => [], quitarCredencial: vi.fn(), vincularEsteDispositivo: vi.fn(), EVENTO_CREDENCIALES: "x" }));

import { conPermisos } from "../../pruebas/sesion";
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
      if (ruta === "/usuarios") return [{ id: "d1", email: "d@b", nombre: "Dueño", activo: true, roles: [{ id: "r3", nombre: "Administrador" }] }, { id: "m1", email: "m@b", nombre: "Marta", activo: true, roles: [{ id: "r1", nombre: "Vendedor" }] }];
      if (ruta === "/roles") return [{ id: "r1", nombre: "Vendedor" }, { id: "r2", nombre: "Recepción" }, { id: "r3", nombre: "Administrador" }];
      if (ruta === "/sesiones") return [{ id: "s1", usuario_id: "m1", dispositivo: "computadora · Firefox", ultimo_uso_en: "2026-09-14T12:00:00Z", email: "m@b", nombre: "Marta" }, { id: "s2", usuario_id: "m1", dispositivo: "celular · Chrome", ultimo_uso_en: "2026-09-14T11:00:00Z", email: "m@b", nombre: "Marta" }];
      if (ruta === "/credenciales/de-otros") return [{ id: "c1", usuario_id: "m1", dispositivo: "Samsung de Marta", creada_en: "2026-09-01T10:00:00Z", ultimo_uso_en: null }];
      if (ruta === "/ventas") return { total: 10500, totales: { efectivo: 10500 }, ventas: [{ id: "v1", fecha: "2026-09-14T12:00:00Z", medio_pago: "efectivo", total: "10500", estado: "confirmada", cliente: null, items: [{ descripcion: "MECHA", cantidad: "3", precio_unitario: "3000" }] }] };
      if (ruta === "/compras/semana") return { desde: "2026-09-08", por_proveedor: [{ proveedor: "Proveedor uno", compras: "2", total: "40000" }], total: 40000 };
      return [];
    });
  });

  it("'Quién hizo qué' va de a 10 por página, acorta el detalle y pagina hacia adelante y atrás", async () => {
    render(<Negocio parte="actividad" />);
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

  it("cada persona muestra sus roles y se le pueden tildar varios; autorizar a alguien pide al menos uno", async () => {
    render(<Negocio parte="usuarios" />);
    const filas = await screen.findAllByTestId("usuario-fila");
    const marta = filas.find((f) => f.textContent?.includes("m@b"))!;
    expect(within(marta).getByTestId("roles-de-usuario").textContent).toContain("Vendedor");
    fireEvent.click(within(marta).getByTestId("cambiar-roles"));
    fireEvent.click(await within(marta).findByTestId("rol-Recepción"));
    fireEvent.click(within(marta).getByTestId("guardar-roles"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/usuarios/m1", { method: "PATCH", body: JSON.stringify({ roles: ["r1", "r2"] }) }));
    // Sin ningún rol no se guarda: para que no pueda nada, se la desactiva.
    fireEvent.click(await within(marta).findByTestId("cambiar-roles"));
    fireEvent.click(within(marta).getByTestId("rol-Vendedor"));
    fireEvent.click(within(marta).getByTestId("guardar-roles"));
    expect(within(marta).getByRole("alert").textContent).toContain("al menos un rol");

    fireEvent.click(screen.getByTestId("autorizar"));
    const alta = screen.getByTestId("alta-usuario");
    fireEvent.change(alta.querySelector("[name=nombre]")!, { target: { value: "Pedro" } });
    fireEvent.change(alta.querySelector("[name=email]")!, { target: { value: "p@b.com" } });
    fireEvent.submit(alta);
    expect((await within(alta).findByRole("alert")).textContent).toContain("al menos un rol");
    fireEvent.click(within(alta).getByTestId("rol-Recepción"));
    fireEvent.submit(alta);
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/usuarios", { method: "POST", body: JSON.stringify({ email: "p@b.com", nombre: "Pedro", roles: ["r2"] }) }));
  });

  it("sin permisos de administración no se ven los usuarios ni las sesiones de los demás", async () => {
    conPermisos("ventas.registrar");
    render(<Negocio parte="usuarios" />);
    await waitFor(() => expect(screen.queryByTestId("usuarios")).toBeNull());
    expect(apiFalsa).not.toHaveBeenCalledWith("/usuarios");
    expect(apiFalsa).not.toHaveBeenCalledWith("/sesiones");
    expect(apiFalsa).not.toHaveBeenCalledWith("/credenciales/de-otros");
  });

  it("007-T037 en la tarjeta de cada persona, una línea dice sus sesiones y celulares, y al abrirla se cierran y se quitan", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Negocio parte="usuarios" />);
    const marta = (await screen.findAllByTestId("usuario-fila")).find((f) => f.textContent?.includes("Marta"))!;
    const linea = await within(marta).findByTestId("acceso-de-usuario");
    expect(linea.textContent).toContain("2 sesiones · 1 celular con huella");
    // Quien no tiene nada no tiene la línea.
    const dueno = screen.getAllByTestId("usuario-fila").find((f) => f.textContent?.includes("Dueño"))!;
    expect(within(dueno).queryByTestId("acceso-de-usuario")).toBeNull();
    fireEvent.click(linea);
    expect(within(marta).getAllByTestId("sesion").map((s) => s.textContent)).toEqual([expect.stringContaining("computadora · Firefox"), expect.stringContaining("celular · Chrome")]);
    fireEvent.click(within(marta).getByRole("button", { name: "Cerrar la sesión de Marta en celular · Chrome" }));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/sesiones/s2", { method: "DELETE" }));
    fireEvent.click(within(marta).getByRole("button", { name: /Quitar el celular Samsung de Marta/ }));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/credenciales/c1", { method: "DELETE" }));
  });

  it("007-T037 al final de Usuarios, quien administra usuarios ve cuántos días dura el vínculo", async () => {
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/puestos/configuracion" ? { dias: 30 } : []));
    render(<Negocio parte="usuarios" />);
    expect(((await screen.findByTestId("dias-vinculo")) as HTMLInputElement).value).toBe("30");
  });
});
