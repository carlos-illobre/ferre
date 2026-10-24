/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../datos/conexion", async (original) => ({ ...(await original<typeof import("../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../datos/almacenamiento", async (original) => ({ ...(await original<typeof import("../datos/almacenamiento")>()), leerTodo: async () => [] }));
vi.mock("./catalogo", async (original) => ({ ...(await original<typeof import("./catalogo")>()), ...(({ traerPorIds: async () => undefined })) }));

import { autorizar, cambiarUsuario, cerrarSesion, cuantosQuedan, faltaEnAlta, filtrarUsuarios, ordenarUsuarios, partesResaltadas, SIN_FILTRO, sugerenciasDeUsuarios, useSesiones, useUsuarios } from "./usuarios";
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

// 007-T033 y 007-T044: buscar por correo o nombre, filtrar por roles y estado, y ordenar (decisiones 98 y 102).
describe("buscar, filtrar y ordenar usuarios (007-T033, 007-T044)", () => {
  const RECEPCION = { id: "r4", nombre: "Recepción" }, VENDEDOR = { id: "r2", nombre: "Vendedor" }, GERENTE = { id: "r5", nombre: "Gerente" };
  const GENTE = [
    { id: "u1", nombre: "Carlos", email: "carlos@ferre.test", activo: true, roles: [VENDEDOR, RECEPCION] },
    { id: "u2", nombre: "Marta", email: "marta.bress@ferre.test", activo: true, roles: [VENDEDOR] },
    { id: "u3", nombre: "Lucía Fernández", email: "lucia.fernandez.deposito@ferre.test", activo: false, roles: [RECEPCION] },
    { id: "u4", nombre: "Ana", email: "ana@ferre.test", activo: false, roles: [GERENTE] },
  ];
  const ids = (l: { id: string }[]) => l.map((u) => u.id);
  const con = (f: Partial<typeof SIN_FILTRO>) => ({ ...SIN_FILTRO, ...f });

  it("encuentra lo escrito en cualquier parte del correo o del nombre, sin importar mayúsculas ni tildes", () => {
    expect(ids(filtrarUsuarios(GENTE, con({ texto: "LUCIA" })))).toEqual(["u3"]);
    expect(ids(filtrarUsuarios(GENTE, con({ texto: "fernández" })))).toEqual(["u3"]);
    expect(ids(filtrarUsuarios(GENTE, con({ texto: "bress" })))).toEqual(["u2"]);
    expect(ids(filtrarUsuarios(GENTE, con({ texto: "  " })))).toEqual(["u1", "u2", "u3", "u4"]);
  });

  it("con varios roles queda quien tiene cualquiera de ellos, y se combina con lo escrito", () => {
    expect(ids(filtrarUsuarios(GENTE, con({ roles: ["r4"] })))).toEqual(["u1", "u3"]);
    expect(ids(filtrarUsuarios(GENTE, con({ roles: ["r4", "r5"] })))).toEqual(["u1", "u3", "u4"]);
    expect(ids(filtrarUsuarios(GENTE, con({ texto: "carlos", roles: ["r4"] })))).toEqual(["u1"]);
    expect(filtrarUsuarios(GENTE, con({ texto: "marta", roles: ["r4"] }))).toEqual([]);
  });

  it("por estado quedan los activos o los inactivos, y se combina con los roles", () => {
    expect(ids(filtrarUsuarios(GENTE, con({ estado: "activos" })))).toEqual(["u1", "u2"]);
    expect(ids(filtrarUsuarios(GENTE, con({ estado: "inactivos" })))).toEqual(["u3", "u4"]);
    expect(ids(filtrarUsuarios(GENTE, con({ estado: "inactivos", roles: ["r4"] })))).toEqual(["u3"]);
  });

  it("ordena por correo, o por estado: primero los activos y, entre iguales, por correo", () => {
    expect(ids(ordenarUsuarios(GENTE, "correo"))).toEqual(["u4", "u1", "u3", "u2"]);
    expect(ids(ordenarUsuarios(GENTE, "estado"))).toEqual(["u1", "u2", "u4", "u3"]);
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

  it("dice siempre cuántos son; con búsqueda o filtros, cuántos quedan; y avisa si no queda nadie", () => {
    expect(cuantosQuedan(4, 4, SIN_FILTRO)).toBe("4 usuarios");
    expect(cuantosQuedan(1, 1, SIN_FILTRO)).toBe("1 usuario");
    expect(cuantosQuedan(1, 4, con({ texto: "lu" }))).toBe("1 de 4 usuarios");
    expect(cuantosQuedan(2, 4, con({ roles: ["r4"] }))).toBe("2 de 4 usuarios");
    expect(cuantosQuedan(2, 4, con({ estado: "activos" }))).toBe("2 de 4 usuarios");
    expect(cuantosQuedan(0, 4, con({ texto: "zz" }))).toBe("Nadie coincide con la búsqueda.");
  });
});
