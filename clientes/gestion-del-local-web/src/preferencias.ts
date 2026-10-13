import { useSyncExternalStore } from "react";

// Las preferencias de este dispositivo (RF-80): las elige cada persona acá y no cambian nada
// en los demás. Se guardan en el navegador y no se borran al salir de la sesión. Si el
// navegador no deja guardar, valen mientras la aplicación esté abierta.
export type Preferencias = { animaciones: boolean };
const DE_ARRANQUE: Preferencias = { animaciones: true };
const CLAVE = "ferre.preferencias";

function leer(): Preferencias {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Partial<Preferencias> | null;
    // Un valor que no sea el esperado se toma como el de arranque.
    return { animaciones: typeof guardado?.animaciones === "boolean" ? guardado.animaciones : DE_ARRANQUE.animaciones };
  } catch { return { ...DE_ARRANQUE }; }
}

let actuales: Preferencias = typeof localStorage === "undefined" ? { ...DE_ARRANQUE } : leer();
const oyentes = new Set<() => void>();

// La marca que apaga el movimiento: la miran la hoja de estilos y la navegación animada.
function aplicar(): void {
  if (typeof document === "undefined") return;
  if (actuales.animaciones) delete document.documentElement.dataset.animaciones;
  else document.documentElement.dataset.animaciones = "no";
}
aplicar();

export const preferencias = (): Preferencias => actuales;
export function cambiarPreferencia<K extends keyof Preferencias>(clave: K, valor: Preferencias[K]): void {
  actuales = { ...actuales, [clave]: valor };
  try { localStorage.setItem(CLAVE, JSON.stringify(actuales)); } catch { /* vale mientras esté abierta */ }
  aplicar();
  oyentes.forEach((o) => o());
}
export function usePreferencias(): Preferencias {
  return useSyncExternalStore((o) => { oyentes.add(o); return () => { oyentes.delete(o); }; }, () => actuales);
}
// Para las pruebas: volver a leer lo guardado, como al abrir la aplicación.
export function recargarPreferencias(): void { actuales = leer(); aplicar(); oyentes.forEach((o) => o()); }
