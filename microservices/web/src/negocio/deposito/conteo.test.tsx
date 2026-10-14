/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { producto } from "../../pruebas/catalogo-falso";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a) }));
vi.mock("../../almacen", () => ({ leerTodo: async () => [] }));
vi.mock("../../catalogo", () => ({ traerPorIds: async () => undefined }));

import { abrirConteo, crearSector, ordenarSectores, useConteo, useSectores, type Conteo, type Sector } from "./conteo";

// El conteo de estanterías, probado una sola vez y sin pantalla (010-E05).
const cinta = producto({ id: "cinta", descripcion: "CINTA AISLADORA", marca: "3M" });
const sector = (id: string, extra: Partial<Sector> = {}): Sector => ({ id, nombre: id, productos: "3", ultimo_conteo: null, conteo_abierto: null, ...extra });
const CONTEO: Conteo = {
  id: "c1", estado: "abierto", sector_id: "s1", sector: "Estantería 1",
  renglones: [{ producto_id: "clavo", cantidad_contada: "5", contado_en: "2026-10-13T10:00:00Z", descripcion: "CLAVO", marca: null, stock_teorico: "5" }],
  sin_contar: [{ producto_id: "cinta", descripcion: "CINTA AISLADORA", marca: "3M", stock_teorico: "17" }],
};
function armar() {
  return renderHook(() => { const [conteo, setConteo] = useState(CONTEO); return { conteo, ...useConteo(conteo, setConteo) }; });
}

beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockReset().mockResolvedValue({ encolado: false }); });

describe("el conteo de estanterías (010-E05)", () => {
  it("los sectores se ordenan: primero lo que quedó a medias, después lo nunca contado, después lo más atrasado", async () => {
    const lista = [sector("reciente", { ultimo_conteo: "2026-10-10" }), sector("nunca"), sector("viejo", { ultimo_conteo: "2026-01-01" }), sector("a-medias", { conteo_abierto: "c9", ultimo_conteo: "2026-10-12" })];
    expect(ordenarSectores(lista).map((s) => s.id)).toEqual(["a-medias", "nunca", "viejo", "reciente"]);
    apiFalsa.mockResolvedValue(lista);
    const { result } = renderHook(() => useSectores());
    expect(result.current.sectores).toBeNull();
    await waitFor(() => expect(result.current.sectores).toHaveLength(4));
  });

  it("abrir un sector empieza o retoma su conteo, y un sector nuevo refresca la lista", async () => {
    apiFalsa.mockImplementation(async (ruta: string, opciones?: { method?: string }) => (ruta === "/conteos" ? { id: "c1" } : ruta === "/conteos/c1" ? CONTEO : opciones?.method === "POST" ? { id: "s-nuevo" } : [sector("s1")]));
    expect(await abrirConteo("s1")).toBe(CONTEO);
    expect(apiFalsa).toHaveBeenCalledWith("/conteos", { method: "POST", body: JSON.stringify({ sector_id: "s1" }) });
    const lista = renderHook(() => useSectores());
    await waitFor(() => expect(lista.result.current.sectores).not.toBeNull());
    const pedidos = apiFalsa.mock.calls.filter((c) => c[0] === "/sectores" && !c[1]).length;
    expect(await crearSector("  Pared  ")).toBe("s-nuevo");
    expect(apiFalsa).toHaveBeenCalledWith("/sectores", { method: "POST", body: JSON.stringify({ nombre: "Pared" }) });
    await waitFor(() => expect(apiFalsa.mock.calls.filter((c) => c[0] === "/sectores" && !c[1]).length).toBe(pedidos + 1));
  });

  it("contar con conexión manda el renglón y trae el conteo como lo dejó el servidor", async () => {
    const actualizado = { ...CONTEO, renglones: [...CONTEO.renglones, { producto_id: "cinta", cantidad_contada: "15", contado_en: "x", descripcion: "CINTA AISLADORA", marca: "3M", stock_teorico: "17" }], sin_contar: [] };
    apiFalsa.mockResolvedValue(actualizado);
    const { result } = armar();
    await act(async () => { await result.current.contar(cinta, 15); });
    expect(enviarOEncolar).toHaveBeenCalledWith("conteo.renglon", "PUT", "/conteos/c1/renglones/cinta", { cantidad: 15 });
    expect(result.current.conteo).toBe(actualizado);
    expect(result.current.conDiferencia.map((r) => r.producto_id)).toEqual(["cinta"]);
    expect(result.current.enElDispositivo.size).toBe(0);
  });

  it("contar sin conexión muestra lo contado igual, con el stock que había, y lo marca como pendiente", async () => {
    enviarOEncolar.mockResolvedValue({ encolado: true });
    const { result } = armar();
    await act(async () => { await result.current.contar(cinta, 15); });
    expect(apiFalsa).not.toHaveBeenCalled();
    expect(result.current.conteo.renglones[0]).toMatchObject({ producto_id: "cinta", cantidad_contada: "15", stock_teorico: "17", marca: "3M" });
    expect(result.current.conteo.sin_contar).toHaveLength(0);
    expect(result.current.enElDispositivo.has("cinta")).toBe(true);
    expect(result.current.contadoPorId.get("cinta")?.cantidad_contada).toBe("15");
    // Al volver la conexión se trae lo del servidor y ya no queda nada pendiente.
    apiFalsa.mockResolvedValue(CONTEO);
    await act(async () => { await result.current.recargar(); });
    expect(result.current.enElDispositivo.size).toBe(0);
  });

  it("quitar saca el producto de lo contado", async () => {
    enviarOEncolar.mockResolvedValue({ encolado: true });
    const { result } = armar();
    await act(async () => { await result.current.quitar(producto({ id: "clavo", descripcion: "CLAVO" })); });
    expect(enviarOEncolar).toHaveBeenCalledWith("conteo.renglon", "DELETE", "/conteos/c1/renglones/clavo", null);
    expect(result.current.conteo.renglones).toHaveLength(0);
  });

  it("cerrar avisa si lo no contado va a cero y devuelve qué se ajustó", async () => {
    apiFalsa.mockResolvedValue({ ajustados: 1, puestos_en_cero: 2, contados: 3 });
    const { result } = armar();
    let cierre: unknown;
    await act(async () => { cierre = await result.current.cerrar(true); });
    expect(apiFalsa).toHaveBeenCalledWith("/conteos/c1/cerrar", { method: "POST", body: JSON.stringify({ faltantes_en_cero: true }) });
    expect(cierre).toEqual({ ajustados: 1, puestos_en_cero: 2, contados: 3 });
  });
});
