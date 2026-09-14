import "fake-indexeddb/auto";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

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

afterEach(() => { cleanup(); localStorage.clear(); });
