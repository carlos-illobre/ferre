/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("./api", async (original) => ({ ...(await original<typeof import("./api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { traerPorCodigo, useCatalogo } from "./catalogo";
import { buscaEnElServidor } from "./guardado";
import { cambiarPreferencia, preferencias, recargarPreferencias } from "./preferencias";
import { Configuracion } from "./principal/Configuracion";

// Cómo buscar productos cuando el celular no guarda el catálogo (RF-82, specs/009-configuracion).
const ancho = (px: number) => { (window as any).innerWidth = px; };
const prod = (id: string, descripcion: string, codigo_barras: string | null = null) => ({ id, descripcion, marca: "MARCA", codigo_barras, unidad: "unidad", margen_elegido: null, proveedor: "P", codigo_proveedor: null, costo_neto: "100", iva: "0.21", fecha_lista: "2026-08-11", lista_importada_id: "l", explicacion_costo: [] });
const PRIMEROS = [prod("a", "ARANDELA PLANA")];
const pedidos = () => apiFalsa.mock.calls.map((c) => String(c[0]));

describe("Cómo buscar productos sin guardar el catálogo", () => {
  beforeEach(() => {
    ancho(390); localStorage.clear(); recargarPreferencias(); apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string) => {
      if (ruta.startsWith("/productos?limite=")) return PRIMEROS;
      if (ruta.startsWith("/productos?buscar=mecha")) return [prod("m", "MECHA WIDIA 8 MM", "7790001112223")];
      if (ruta.startsWith("/productos?codigo=7790009998887")) return [prod("t", "TALADRO PERCUTOR", "7790009998887")];
      if (ruta.startsWith("/productos?")) return [];
      if (ruta === "/stock") return { productos: [] };
      return [];
    });
  });
  afterEach(() => { ancho(1024); });

  it("E15: con el guardado deshabilitado aparecen las dos formas, cada una con su ventaja y su desventaja, y elegida la de bajar el catálogo", () => {
    render(<Configuracion celular alCambiarElGuardado={() => undefined} />);
    expect(screen.getByTestId("cfg-buscar-memoria").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("cfg-buscar-servidor").getAttribute("aria-checked")).toBe("false");
    for (const forma of ["memoria", "servidor"]) {
      expect(screen.getByTestId(`cfg-buscar-${forma}`).textContent).toContain("Ventaja:");
      expect(screen.getByTestId(`cfg-buscar-${forma}`).textContent).toContain("Desventaja:");
    }
    const alCambiar = vi.fn();
    render(<Configuracion celular alCambiarElGuardado={alCambiar} />);
    fireEvent.click(screen.getAllByTestId("cfg-buscar-servidor").at(-1)!);
    expect(preferencias().buscar).toBe("servidor");
    expect(alCambiar).toHaveBeenCalledTimes(1);
    expect(buscaEnElServidor()).toBe(true);
  });

  it("E16: con el guardado habilitado, o en la computadora, la elección no aparece", () => {
    cambiarPreferencia("sinConexion", true);
    const celular = render(<Configuracion celular alCambiarElGuardado={() => undefined} />);
    expect(screen.queryByTestId("cfg-buscar-memoria")).toBeNull();
    expect(buscaEnElServidor()).toBe(false);
    celular.unmount();
    ancho(1366);
    render(<Configuracion />);
    expect(screen.queryByTestId("cfg-buscar-memoria")).toBeNull();
  });

  it("E17 y E18: buscando en el servidor no se baja el catálogo; buscar y escanear le preguntan al servidor, lo dicen mientras tanto y dan el mismo producto", async () => {
    cambiarPreferencia("buscar", "servidor");
    const { result } = renderHook(() => useCatalogo());
    await waitFor(() => expect(result.current.catalogo?.map((p) => p.id)).toEqual(["a"]));
    // Nunca pidió el catálogo entero.
    expect(pedidos().filter((r) => r === "/productos")).toEqual([]);
    expect(result.current.catalogoCompleto).toBe(false);

    // Buscar: primero lo que hay en memoria (nada) y, al dejar de escribir, la consulta al servidor.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    act(() => { expect(result.current.buscarProductos("mecha")).toEqual([]); });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    vi.useRealTimers();
    await waitFor(() => expect(result.current.buscarProductos("mecha").map((p) => p.id)).toEqual(["m"]));
    expect(pedidos().filter((r) => r.startsWith("/productos?buscar=mecha"))).toHaveLength(1);
    expect(result.current.buscandoEnElServidor).toBe(false);

    // Escanear un código que no está en memoria lo pide por su código, y queda en memoria.
    let leido: { id: string } | null = null;
    let enCurso = false;
    await act(async () => { const pedido = traerPorCodigo("7790009998887"); enCurso = true; leido = await pedido; });
    expect(enCurso).toBe(true);
    expect(leido!.id).toBe("t");
    expect(result.current.catalogo?.map((p) => p.id).sort()).toEqual(["a", "m", "t"]);
    // Uno que ya está en memoria no vuelve a preguntar; uno que nadie tiene da «ninguno».
    const antes = apiFalsa.mock.calls.length;
    expect((await traerPorCodigo("7790001112223"))?.id).toBe("m");
    expect(apiFalsa.mock.calls.length).toBe(antes);
    expect(await traerPorCodigo("000")).toBeNull();
  });
});
