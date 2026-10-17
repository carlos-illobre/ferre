import { afterEach, describe, expect, it, vi } from "vitest";
import { repetirMientrasSeVe } from "./mientras-se-ve";

// La búsqueda de versión nueva cada media hora corre solo con la app a la vista (decisión 91).
let visibilidad: DocumentVisibilityState = "visible";
Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibilidad });
const ocultar = (si: boolean) => { visibilidad = si ? "hidden" : "visible"; document.dispatchEvent(new Event("visibilitychange")); };

describe("repetirMientrasSeVe", () => {
  afterEach(() => { vi.useRealTimers(); visibilidad = "visible"; });

  it("a la vista, repite cada tanto", () => {
    vi.useFakeTimers();
    const accion = vi.fn();
    const { dejar } = repetirMientrasSeVe(accion, () => 1000);
    expect(accion).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(accion).toHaveBeenCalledTimes(3);
    dejar();
  });

  it("oculta no hace nada; al volver lo hace en el momento y cuenta desde cero", () => {
    vi.useFakeTimers();
    const accion = vi.fn();
    const { dejar } = repetirMientrasSeVe(accion, () => 1000);
    vi.advanceTimersByTime(500);
    ocultar(true);
    vi.advanceTimersByTime(10_000);
    expect(accion).not.toHaveBeenCalled();
    ocultar(false);
    expect(accion).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(999);
    expect(accion).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(accion).toHaveBeenCalledTimes(2);
    dejar();
  });

  it("si arranca oculta, no cuenta hasta que se ve", () => {
    vi.useFakeTimers();
    visibilidad = "hidden";
    const accion = vi.fn();
    const { dejar } = repetirMientrasSeVe(accion, () => 1000);
    vi.advanceTimersByTime(5000);
    expect(accion).not.toHaveBeenCalled();
    dejar();
  });

  it("toma el tiempo nuevo al reiniciar, sin hacer la acción", () => {
    vi.useFakeTimers();
    let cada = 1000;
    const accion = vi.fn();
    const { dejar, reiniciar } = repetirMientrasSeVe(accion, () => cada);
    vi.advanceTimersByTime(900);
    cada = 5000;
    reiniciar();
    vi.advanceTimersByTime(4999);
    expect(accion).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(accion).toHaveBeenCalledTimes(1);
    dejar();
  });

  it("con el tiempo en null no repite, pero al volver a la vista la hace una vez", () => {
    vi.useFakeTimers();
    let cada: number | null = 1000;
    const accion = vi.fn();
    const { dejar, reiniciar } = repetirMientrasSeVe(accion, () => cada);
    cada = null;
    reiniciar();
    vi.advanceTimersByTime(60_000);
    expect(accion).not.toHaveBeenCalled();
    ocultar(true);
    ocultar(false);
    expect(accion).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(accion).toHaveBeenCalledTimes(1);
    dejar();
  });

  it("reiniciar con la página oculta no arranca la cuenta", () => {
    vi.useFakeTimers();
    const accion = vi.fn();
    const { dejar, reiniciar } = repetirMientrasSeVe(accion, () => 1000);
    visibilidad = "hidden";
    reiniciar();
    vi.advanceTimersByTime(5000);
    expect(accion).not.toHaveBeenCalled();
    dejar();
  });

  it("al dejar, no repite más", () => {
    vi.useFakeTimers();
    const accion = vi.fn();
    repetirMientrasSeVe(accion, () => 1000).dejar();
    vi.advanceTimersByTime(5000);
    ocultar(false);
    expect(accion).not.toHaveBeenCalled();
  });
});
