/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../almacen", async (original) => ({ ...(await original<typeof import("../almacen")>()), leerTodo: async () => [] }));
vi.mock("../catalogo", () => ({ traerPorIds: async () => undefined }));

import { autorizar, cambiarUsuario, cerrarSesion, faltaEnAlta, useSesiones, useUsuarios } from "./usuarios";
import { anularCompra, nombreDelComprobante, useComprasRecientes, type CompraFila } from "./compras";
import { paginasDe, useActividad } from "./actividad";

// Usuarios, sesiones, compras recientes y el registro de acciones, probados una sola vez y sin pantalla (010-E05).
const veces = (ruta: string) => apiFalsa.mock.calls.filter((c) => c[0] === ruta && !c[1]).length;
beforeEach(() => { apiFalsa.mockReset().mockImplementation(async (ruta: string, opciones?: unknown) => (opciones ? {} : ruta.startsWith("/auditoria") ? { eventos: [], total: 45, pagina: 1, por_pagina: 20 } : [])); });

describe("usuarios y sesiones (010-E05)", () => {
  it("para autorizar hace falta nombre, un correo bien escrito y al menos un rol", () => {
    expect(faltaEnAlta({ nombre: " ", email: "", roles: [] }, "Falta un rol")).toEqual({ nombre: "Escribí el nombre de la persona.", email: "Escribí su correo de Google.", roles: "Falta un rol" });
    expect(faltaEnAlta({ nombre: "Ana", email: "ana@", roles: ["r1"] }, "x")?.email).toMatch(/mal escrito/);
    expect(faltaEnAlta({ nombre: "Ana", email: "ana@gmail.com", roles: ["r1"] }, "x")).toBeNull();
  });

  it("autorizar manda el correo en minúsculas y sin espacios, y refresca la lista", async () => {
    const lista = renderHook(() => useUsuarios());
    await waitFor(() => expect(lista.result.current.datos).toEqual([]));
    await autorizar({ nombre: " Ana ", email: " Ana@Gmail.com ", roles: ["r1"] });
    expect(apiFalsa).toHaveBeenCalledWith("/usuarios", { method: "POST", body: JSON.stringify({ email: "ana@gmail.com", nombre: "Ana", roles: ["r1"] }) });
    await waitFor(() => expect(veces("/usuarios")).toBe(2));
  });

  it("desactivar a alguien refresca también las sesiones, que se le cerraron", async () => {
    renderHook(() => useUsuarios()); renderHook(() => useSesiones());
    await waitFor(() => expect(veces("/sesiones")).toBe(1));
    await act(async () => { await cambiarUsuario("u1", { roles: ["r2"] }); });
    expect(veces("/sesiones")).toBe(1);
    await act(async () => { await cambiarUsuario("u1", { activo: false }); });
    expect(apiFalsa).toHaveBeenCalledWith("/usuarios/u1", { method: "PATCH", body: JSON.stringify({ activo: false }) });
    await waitFor(() => expect(veces("/sesiones")).toBe(2));
    await act(async () => { await cerrarSesion("s1"); });
    expect(apiFalsa).toHaveBeenCalledWith("/sesiones/s1", { method: "DELETE" });
    await waitFor(() => expect(veces("/sesiones")).toBe(3));
  });

  it("si no se pudo traer, el error queda y no se muestran datos viejos", async () => {
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useUsuarios());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.datos).toBeNull();
  });
});

describe("compras recientes y registro de acciones (010-E05)", () => {
  it("anular una compra manda el motivo y vuelve a traer las compras", async () => {
    renderHook(() => useComprasRecientes());
    await waitFor(() => expect(veces("/compras")).toBe(1));
    await anularCompra("c1", "  vino roto ");
    expect(apiFalsa).toHaveBeenCalledWith("/compras/c1/anular", { method: "POST", body: JSON.stringify({ motivo: "vino roto" }) });
    await waitFor(() => expect(veces("/compras")).toBe(2));
    const compra = { comprobante_tipo: "factura", comprobante_numero: null, foto: "f.jpg" } as CompraFila;
    expect(nombreDelComprobante(compra)).toBe("factura con foto");
    expect(nombreDelComprobante({ ...compra, comprobante_tipo: "sin_comprobante" })).toBe("sin comprobante");
  });

  it("el registro se pide por página y con filtros, y sabe cuántas páginas hay", async () => {
    const { result } = renderHook(() => useActividad({ pagina: 2, usuario: "u1", desde: "2026-10-01T03:00:00.000Z" }));
    await waitFor(() => expect(result.current.datos).not.toBeNull());
    expect(apiFalsa).toHaveBeenCalledWith("/auditoria?pagina=2&usuario=u1&desde=2026-10-01T03%3A00%3A00.000Z");
    expect(paginasDe(result.current.datos)).toBe(3);
    expect(paginasDe(null)).toBe(1);
  });
});
