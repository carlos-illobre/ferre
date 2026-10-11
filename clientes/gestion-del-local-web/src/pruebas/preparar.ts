import "fake-indexeddb/auto";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { conTodosLosPermisos, usuarioDePrueba } from "./sesion";

// Las pantallas se prueban sueltas, sin el proveedor de sesión: la sesión es la de prueba.
vi.mock("../sesion", async (original) => ({
  ...(await original<typeof import("../sesion")>()),
  useSesion: () => ({ sesion: { estado: "con-sesion", usuario: usuarioDePrueba, sinConexion: false, sesionId: "s1" }, entrar: vi.fn(), salir: vi.fn() }),
}));

// jsdom no trae IntersectionObserver; las pantallas lo usan para la carga progresiva.
class ObservadorFalso {
  static ultimo: ObservadorFalso | null = null;
  constructor(public cb: IntersectionObserverCallback) { ObservadorFalso.ultimo = this; }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() { return []; }
  root = null; rootMargin = ""; thresholds = [];
  // Simula que el centinela entró en pantalla.
  cruzar() { this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
}
(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = ObservadorFalso;
export { ObservadorFalso };

if (!globalThis.crypto.randomUUID) {
  (globalThis.crypto as { randomUUID: () => string }).randomUUID = () => `${Date.now()}-${Math.random()}` as never;
}
// Los diálogos del navegador no existen en jsdom: se aceptan.
window.confirm = () => true;
window.alert = () => undefined;

afterEach(() => { cleanup(); localStorage.clear(); conTodosLosPermisos(); });
