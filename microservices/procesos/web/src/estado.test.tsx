import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useProcesos } from "./estado";
import { guardadoEnMemoria, servicio, VENTA } from "./pruebas/servicio";

// Sin conexión y dos personas a la vez (E41, E42), sin pantallas.
const DIBUJA = { ver: true, dibujar: true };

describe("sin conexión", () => {
  it("011-E42 un proceso que nunca se abrió en este dispositivo dice que hace falta conexión", async () => {
    const s = servicio();
    const id = await s.cargar("Venta");
    s.sinConexion(true);
    const { result } = renderHook(() => useProcesos({ pedir: s.dibuja, puede: DIBUJA, guardarLocal: guardadoEnMemoria() }));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.sinConexion).toBe(true);
    await act(() => result.current.abrir(id));
    expect(result.current.abierto).toBeNull();
    expect(result.current.aviso).toBe("Sin conexión: este proceso no se abrió antes en este dispositivo. Hace falta conexión para verlo");
  });

  it("011-E42 sin guardado del dispositivo (un celular que no guarda), no queda nada guardado", async () => {
    const s = servicio();
    await s.cargar("Venta");
    const { result } = renderHook(() => useProcesos({ pedir: s.dibuja, puede: DIBUJA, guardarLocal: null }));
    await waitFor(() => expect(result.current.abierto?.nombre).toBe("Venta"));
    s.sinConexion(true);
    const otra = renderHook(() => useProcesos({ pedir: s.dibuja, puede: DIBUJA, guardarLocal: null }));
    await waitFor(() => expect(otra.result.current.cargando).toBe(false));
    expect(otra.result.current.lista).toEqual([]);
    expect(otra.result.current.abierto).toBeNull();
  });

  it("011-E42 si se corta mientras se dibuja, dice que no se guardó, deja de dibujar y lo manda cuando vuelve la conexión", async () => {
    const s = servicio();
    const id = await s.cargar("Venta", VENTA, false);
    const { result } = renderHook(() => useProcesos({ pedir: s.dibuja, puede: DIBUJA, guardarLocal: guardadoEnMemoria() }));
    await waitFor(() => expect(result.current.abierto?.id).toBe(id));
    s.sinConexion(true);
    act(() => result.current.guardarBorrador(id, VENTA.replace('name="Cobrar"', 'name="Cobrar ya"')));
    await waitFor(() => expect(result.current.guardado).toBe("sin-conexion"));
    // No se dibuja hasta que vuelva, y el último cambio sigue a la vista.
    expect(result.current.sinConexion).toBe(true);
    expect(result.current.abierto?.borrador?.bpmn).toContain("Cobrar ya");
    s.sinConexion(false);
    act(() => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(result.current.guardado).toBe("guardado"));
    expect(result.current.sinConexion).toBe(false);
    expect(((await s.dibuja(`/procesos/${id}`)) as { borrador: { bpmn: string } }).borrador.bpmn).toContain("Cobrar ya");
  });
});

describe("dos personas a la vez", () => {
  it("011-E41 los cambios seguidos se guardan uno detrás del otro, cada uno con la revisión nueva, sin chocar entre sí", async () => {
    const s = servicio();
    const id = await s.cargar("Venta", VENTA, false);
    const { result } = renderHook(() => useProcesos({ pedir: s.dibuja, puede: DIBUJA, guardarLocal: null }));
    await waitFor(() => expect(result.current.abierto?.id).toBe(id));
    act(() => {
      result.current.guardarBorrador(id, VENTA.replace('name="Cobrar"', 'name="Uno"'));
      result.current.guardarBorrador(id, VENTA.replace('name="Cobrar"', 'name="Dos"'));
    });
    await waitFor(() => expect(result.current.abierto?.borrador?.bpmn).toContain('name="Dos"'));
    expect(result.current.aviso).toBeNull();
  });
});

describe("abrir", () => {
  it("011-E01 si se toca un proceso mientras se abre solo el último, queda el que se tocó aunque la otra respuesta llegue después", async () => {
    const s = servicio();
    const b = await s.cargar("Compra");
    const a = await s.cargar("Venta");
    const guardado = guardadoEnMemoria();
    guardado.setItem("procesos.ultimo", JSON.stringify(a));
    // El que se abre solo (el último) tarda; el que se toca responde enseguida.
    let soltarA: () => void = () => undefined;
    const aTarda = new Promise<void>((r) => { soltarA = r; });
    const pedir: typeof s.dibuja = async (ruta, init) => {
      if (ruta === `/procesos/${a}`) await aTarda;
      return s.dibuja(ruta, init);
    };
    const { result } = renderHook(() => useProcesos({ pedir, puede: DIBUJA, guardarLocal: guardado }));
    await waitFor(() => expect(result.current.lista?.length).toBe(2));
    await act(() => result.current.abrir(b));
    expect(result.current.abierto?.id).toBe(b);
    await act(async () => { soltarA(); await aTarda; });
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.abierto?.id).toBe(b);
    expect(JSON.parse(guardado.getItem("procesos.ultimo")!)).toBe(b);
  });

  it("011-E01 si se toca un proceso antes de que llegue la lista, no se abre solo el último", async () => {
    const s = servicio();
    const b = await s.cargar("Compra");
    const a = await s.cargar("Venta");
    const guardado = guardadoEnMemoria();
    guardado.setItem("procesos.ultimo", JSON.stringify(a));
    let soltarLista: () => void = () => undefined;
    const listaTarda = new Promise<void>((r) => { soltarLista = r; });
    const pedidos: string[] = [];
    const pedir: typeof s.dibuja = async (ruta, init) => {
      pedidos.push(ruta);
      if (ruta === "/procesos") await listaTarda;
      return s.dibuja(ruta, init);
    };
    const { result } = renderHook(() => useProcesos({ pedir, puede: DIBUJA, guardarLocal: guardado }));
    await act(() => result.current.abrir(b));
    await act(async () => { soltarLista(); await listaTarda; });
    await waitFor(() => expect(result.current.lista?.length).toBe(2));
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.abierto?.id).toBe(b);
    expect(pedidos).not.toContain(`/procesos/${a}`);
  });
});
