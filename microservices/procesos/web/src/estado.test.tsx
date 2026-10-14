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
