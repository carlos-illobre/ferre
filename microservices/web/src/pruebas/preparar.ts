import "fake-indexeddb/auto";
import { afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
// Directo al archivo y no al index: el index cargaría la API antes de que cada prueba la reemplace.
import { consultas } from "../datos/conexion/consultas";
import { conTodosLosPermisos, usuarioDePrueba } from "./sesion";

// Las pantallas se prueban sueltas, sin el proveedor de sesión: la sesión es la de prueba.
// `entrar` y `salir` son siempre las mismas, como en la aplicación: una pantalla que depende de
// ellas no se reinicia en cada dibujo.
vi.mock("../datos/sesion", async (original) => {
  const entrar = vi.fn(), salir = vi.fn();
  return {
    ...(await original<typeof import("../datos/sesion")>()),
    useSesion: () => ({ sesion: { estado: "con-sesion", usuario: usuarioDePrueba, sinConexion: false, sesionId: "s1" }, entrar, salir }),
  };
});

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

// La venta en curso vive mientras la aplicación está abierta (ADR-022): cada prueba arranca sin venta.
// La venta se trae después de que cada prueba pone sus vi.mock: importarla acá arriba cargaría
// antes los módulos de los datos (cada index.ts trae todo su módulo).
let vaciarVenta = () => {};
beforeAll(async () => { ({ vaciarVenta } = await import("../negocio/ventas/venta-en-curso")); });
afterEach(() => { cleanup(); localStorage.clear(); consultas.clear(); conTodosLosPermisos(); vaciarVenta(); });
