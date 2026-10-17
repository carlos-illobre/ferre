/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../almacen", async (original) => ({ ...(await original<typeof import("../almacen")>()), leerTodo: async () => [] }));
vi.mock("../catalogo", () => ({ traerPorIds: async () => undefined }));

import { autorizar, cambiarUsuario, cerrarSesion, cuantosQuedan, faltaEnAlta, filtrarUsuarios, partesResaltadas, sugerenciasDeUsuarios, useSesiones, useUsuarios } from "./usuarios";
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

// 007-T033: buscar por correo o nombre y filtrar por rol (decisión 98).
describe("buscar usuarios y filtrarlos por rol (007-T033)", () => {
  const RECEPCION = { id: "r4", nombre: "Recepción" }, VENDEDOR = { id: "r2", nombre: "Vendedor" };
  const GENTE = [
    { id: "u1", nombre: "Carlos", email: "carlos@ferre.test", roles: [VENDEDOR, RECEPCION] },
    { id: "u2", nombre: "Marta", email: "marta.bress@ferre.test", roles: [VENDEDOR] },
    { id: "u3", nombre: "Lucía Fernández", email: "lucia.fernandez.deposito@ferre.test", roles: [RECEPCION] },
  ];
  const ids = (l: { id: string }[]) => l.map((u) => u.id);

  it("encuentra lo escrito en cualquier parte del correo o del nombre, sin importar mayúsculas ni tildes", () => {
    expect(ids(filtrarUsuarios(GENTE, { texto: "LUCIA", rol: null }))).toEqual(["u3"]);
    expect(ids(filtrarUsuarios(GENTE, { texto: "fernández", rol: null }))).toEqual(["u3"]);
    expect(ids(filtrarUsuarios(GENTE, { texto: "bress", rol: null }))).toEqual(["u2"]);
    expect(ids(filtrarUsuarios(GENTE, { texto: "  ", rol: null }))).toEqual(["u1", "u2", "u3"]);
  });

  it("con un rol quedan solo quienes lo tienen, y se combina con lo escrito", () => {
    expect(ids(filtrarUsuarios(GENTE, { texto: "", rol: "r4" }))).toEqual(["u1", "u3"]);
    expect(ids(filtrarUsuarios(GENTE, { texto: "carlos", rol: "r4" }))).toEqual(["u1"]);
    expect(filtrarUsuarios(GENTE, { texto: "marta", rol: "r4" })).toEqual([]);
  });

  it("sugiere hasta cinco, y nada con el buscador vacío o con un correo ya elegido", () => {
    const muchos = Array.from({ length: 8 }, (_, i) => ({ nombre: `Ana ${i}`, email: `ana${i}@ferre.test` }));
    expect(sugerenciasDeUsuarios(muchos, "ana")).toHaveLength(5);
    expect(sugerenciasDeUsuarios(GENTE, "")).toEqual([]);
    expect(sugerenciasDeUsuarios(GENTE, "lucia.fernandez.deposito@ferre.test")).toEqual([]);
    expect(ids(sugerenciasDeUsuarios(GENTE, "lu"))).toEqual(["u3"]);
  });

  it("resalta en el correo la parte que coincide", () => {
    expect(partesResaltadas("lucia.fernandez@ferre.test", "FERN")).toEqual(["lucia.", "fern", "andez@ferre.test"]);
    expect(partesResaltadas("marta@ferre.test", "zz")).toEqual(["marta@ferre.test", "", ""]);
  });

  it("dice cuántos quedan solo si se filtra, y avisa si no queda nadie", () => {
    expect(cuantosQuedan(4, 4, { texto: "", rol: null })).toBeNull();
    expect(cuantosQuedan(1, 4, { texto: "lu", rol: null })).toBe("1 de 4 usuarios");
    expect(cuantosQuedan(2, 4, { texto: "", rol: "r4" }, "Recepción")).toBe("2 de 4 usuarios con el rol Recepción");
    expect(cuantosQuedan(0, 4, { texto: "zz", rol: null })).toBe("Nadie coincide con la búsqueda.");
  });
});
