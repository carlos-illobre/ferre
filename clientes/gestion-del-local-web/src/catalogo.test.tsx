/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.unmock("./catalogo");
vi.mock("./api", async (original) => ({ ...(await original<typeof import("./api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));

const producto = (n: number, extra: Record<string, unknown> = {}) => ({ id: `p-${String(n).padStart(4, "0")}`, descripcion: `PRODUCTO ${String(n).padStart(4, "0")}`, marca: null, codigo_barras: null, unidad: "unidad", margen_elegido: 100, proveedor: "Uno", codigo_proveedor: `C${n}`, costo_neto: "100", iva: "0.21", fecha_lista: "2026-08-01", explicacion_costo: [], ...extra });
const TODOS = Array.from({ length: 150 }, (_, i) => producto(i));

// El catálogo se carga una vez para toda la app, muestra los primeros al instante y sigue de fondo (#69).
describe("carga del catálogo", () => {
  let vistos: (number | null)[];
  let catalogos: unknown[];
  async function montar() {
    const { useCatalogo } = await import("./catalogo");
    function Pantalla() { const { catalogo } = useCatalogo(); vistos.push(catalogo ? catalogo.length : null); catalogos.push(catalogo); return <p data-testid="cuantos">{catalogo?.length ?? "nada"}</p>; }
    return { ...render(<Pantalla />), Pantalla };
  }
  async function guardarEnElDispositivo(lista = TODOS) {
    const almacen = await import("./almacen");
    await almacen.reemplazarTodo("catalogo", lista);
    await almacen.guardarMeta("catalogo_primeros", lista.slice(0, 60));
  }
  beforeEach(async () => {
    vi.resetModules(); apiFalsa.mockReset(); vistos = []; catalogos = [];
    const almacen = await import("./almacen");
    for (const a of ["catalogo", "stock", "clientes", "meta", "cola"] as const) await almacen.reemplazarTodo(a, []);
  });

  it("con el catálogo guardado: primero se ven los 60 primeros, después todos, sin esperar al servidor", async () => {
    await guardarEnElDispositivo();
    let soltar!: (v: unknown) => void;
    apiFalsa.mockImplementation((ruta: string) => (ruta === "/productos" ? new Promise((r) => { soltar = r; }) : Promise.resolve(ruta === "/stock" ? { productos: [] } : [])));
    const { getByTestId } = await montar();
    await waitFor(() => expect(getByTestId("cuantos").textContent).toBe("150"));
    expect(vistos.filter((v, i) => v !== vistos[i - 1])).toEqual([null, 60, 150]);
    // El servidor contesta lo mismo: la pantalla no se vuelve a dibujar con otro catálogo.
    const antes = catalogos.at(-1);
    await act(async () => { soltar(TODOS.map((p) => ({ ...p }))); await new Promise((r) => setTimeout(r, 30)); });
    expect(catalogos.at(-1)).toBe(antes);
  });

  it("si el servidor trae un cambio, se ve; y lo que no cambió sigue siendo el mismo producto en memoria", async () => {
    await guardarEnElDispositivo();
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/productos" ? TODOS.map((p, i) => (i === 3 ? { ...p, costo_neto: "250" } : { ...p })) : ruta === "/stock" ? { productos: [] } : []));
    await montar();
    await waitFor(() => expect((catalogos.at(-1) as any[])?.[3]?.costo_neto).toBe("250"));
    const completo = catalogos.find((c) => (c as any[] | null)?.length === 150 && (c as any[])[3].costo_neto === "100") as any[];
    expect((catalogos.at(-1) as any[])[10]).toBe(completo[10]);
    const { leerTodo } = await import("./almacen");
    await waitFor(async () => expect((await leerTodo<any>("catalogo")).find((p) => p.id === "p-0003").costo_neto).toBe("250"));
  });

  it("otra pantalla que se abre enseguida usa lo ya cargado: no vuelve a pedir el catálogo", async () => {
    await guardarEnElDispositivo();
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/productos" ? TODOS : ruta === "/stock" ? { productos: [] } : []));
    const { Pantalla, getByTestId } = await montar();
    await waitFor(() => expect(getByTestId("cuantos").textContent).toBe("150"));
    await waitFor(() => expect(apiFalsa.mock.calls.filter((c) => c[0] === "/productos")).toHaveLength(1));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    vistos = [];
    render(<Pantalla />);
    expect(vistos[0]).toBe(150); // ya está: ni «Bajando el catálogo»
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(apiFalsa.mock.calls.filter((c) => c[0] === "/productos")).toHaveLength(1);
  });

  it("la primera vez en un dispositivo baja de a tandas y muestra la primera enseguida", async () => {
    apiFalsa.mockImplementation(async (ruta: string) => {
      if (ruta === "/productos?limite=60") return TODOS.slice(0, 60);
      if (ruta.startsWith("/productos?limite=5000&desde=60")) return TODOS.slice(60);
      return ruta === "/stock" ? { productos: [] } : [];
    });
    const { getByTestId } = await montar();
    await waitFor(() => expect(getByTestId("cuantos").textContent).toBe("150"));
    expect(vistos).toContain(60);
    const { leerMeta } = await import("./almacen");
    await waitFor(async () => expect((await leerMeta<any[]>("catalogo_primeros"))?.length).toBe(60));
  });
});
