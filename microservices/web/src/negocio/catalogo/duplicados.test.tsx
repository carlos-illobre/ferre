/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../datos/conexion", async (original) => ({ ...(await original<typeof import("../../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));

import { buscarUniones, buscarDuplicados, resolverSugerencia, separar, unir, useDuplicados, type Resumen, type Sugerencia } from "./duplicados";

// Los duplicados, probados una sola vez y sin pantalla (010-E05).
const resumen = (id: string, proveedor: string): Resumen => ({ id, descripcion: `MECHA ${id}`, marca: null, codigo_barras: "779", proveedor, costo_neto: "100", fecha_lista: null });
const sugerencia = (id: string): Sugerencia => ({ id, motivo: "codigo_barras", creado_en: "2026-10-13", a: resumen(`${id}a`, "Tresge"), b: resumen(`${id}b`, "Comodo") });
const unidos = [{ absorbido_id: "x", absorbido: "X", conservado_id: "y", conservado: "Y", unido_en: "2026-10-01", proveedores: null }];
let pendientes: Sugerencia[] = [];
const pedidos = (ruta: string) => apiFalsa.mock.calls.filter((c) => c[0] === ruta && !c[1]).length;

beforeEach(() => {
  pendientes = [sugerencia("s1"), sugerencia("s2")];
  apiFalsa.mockReset().mockImplementation(async (ruta: string, opciones?: unknown) => {
    if (opciones) return ruta === "/equivalencias/buscar" ? { nuevas: 3 } : { ok: true };
    return ruta === "/equivalencias" ? pendientes : unidos;
  });
});

describe("los duplicados (010-E05)", () => {
  it("trae las sugerencias pendientes y lo ya unido", async () => {
    const { result } = renderHook(() => useDuplicados());
    expect(result.current.sugerencias).toBeNull();
    await waitFor(() => expect(result.current.sugerencias).toHaveLength(2));
    await waitFor(() => expect(result.current.uniones).toEqual(unidos));
  });

  it("«es el mismo» conserva el lado elegido, saca la sugerencia y refresca lo unido", async () => {
    const { result } = renderHook(() => useDuplicados());
    await waitFor(() => expect(result.current.uniones).not.toBeNull());
    const antes = pedidos("/equivalencias/unidos");
    const { queda, sale } = await resolverSugerencia(pendientes[0]!, "unir", "b");
    expect(apiFalsa).toHaveBeenCalledWith("/equivalencias/s1/unir", { method: "POST", body: JSON.stringify({ conservar: "b" }) });
    expect([queda.id, sale.id]).toEqual(["s1b", "s1a"]);
    await waitFor(() => expect(result.current.sugerencias?.map((s) => s.id)).toEqual(["s2"]));
    await waitFor(() => expect(pedidos("/equivalencias/unidos")).toBe(antes + 1));
  });

  it("«son distintos» la saca sin tocar lo unido", async () => {
    const { result } = renderHook(() => useDuplicados());
    await waitFor(() => expect(result.current.uniones).not.toBeNull());
    const antes = pedidos("/equivalencias/unidos");
    await resolverSugerencia(pendientes[1]!, "rechazar");
    await waitFor(() => expect(result.current.sugerencias?.map((s) => s.id)).toEqual(["s1"]));
    expect(pedidos("/equivalencias/unidos")).toBe(antes);
  });

  it("buscar, unir a mano y separar vuelven a traer todo", async () => {
    const { result } = renderHook(() => useDuplicados());
    await waitFor(() => expect(result.current.uniones).not.toBeNull());
    expect(await buscarDuplicados()).toBe(3);
    await unir("p1", "p2");
    expect(apiFalsa).toHaveBeenCalledWith("/equivalencias/unir", { method: "POST", body: JSON.stringify({ conservar_id: "p1", absorber_id: "p2" }) });
    await separar("p2");
    expect(apiFalsa).toHaveBeenCalledWith("/equivalencias/separar", { method: "POST", body: JSON.stringify({ absorbido_id: "p2" }) });
    expect(pedidos("/equivalencias")).toBe(4);
  });
});

// 002-T005: «Separar» y «Ver todo» abren todas las uniones, con un buscador.
describe("buscar entre los productos unidos (002-T005)", () => {
  const union = (conservado: string, absorbido: string) => ({ absorbido_id: absorbido, absorbido, conservado_id: conservado, conservado, marca: null, foto_url: null, unido_en: "2026-10-14T10:00:00Z", proveedores: null });
  const uniones = [union("Llave francesa 10 pulgadas", "LLAVE FRANCESA 10\" BAHCO"), union("Thinner sello de oro", "Thinner sello oro x 1 lt"), union("Lámpara LED 9 W", "FOCO LED 9W E27")];

  it("busca por el nombre del que quedó o del que se unió, sin importar mayúsculas ni tildes", () => {
    expect(buscarUniones(uniones, "lampara").map((u) => u.conservado)).toEqual(["Lámpara LED 9 W"]);
    expect(buscarUniones(uniones, "BAHCO").map((u) => u.conservado)).toEqual(["Llave francesa 10 pulgadas"]);
    expect(buscarUniones(uniones, "  ")).toHaveLength(3);
    expect(buscarUniones(uniones, "zz")).toEqual([]);
  });
});
