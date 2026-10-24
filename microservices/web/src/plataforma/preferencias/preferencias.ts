import { useSyncExternalStore } from "react";

// Preferencias de un dispositivo: las elige cada persona en ese aparato y no cambian nada en
// los demás. Se guardan en el navegador bajo una clave y no se borran al salir de la sesión.
// Si el navegador no deja guardar, valen mientras la aplicación esté abierta. Sirve para
// cualquier aplicación: quien las usa dice la clave, los valores de arranque y cómo se lee lo
// guardado (un valor que no sea el esperado se toma como el de arranque).
export type OpcionesDePreferencias<T extends object> = {
  clave: string;
  deArranque: T;
  // Arma las preferencias a partir de lo guardado, que puede faltar o venir mal.
  leer: (guardado: Partial<Record<keyof T, unknown>> | null, deArranque: T) => T;
  // Se llama al abrir y en cada cambio: para aplicar la preferencia a la página.
  alAplicar?: (actuales: T) => void;
};

export function crearPreferencias<T extends object>(opciones: OpcionesDePreferencias<T>) {
  const leerLoGuardado = (): T => {
    try { return opciones.leer(JSON.parse(localStorage.getItem(opciones.clave) ?? "null") as Partial<Record<keyof T, unknown>> | null, opciones.deArranque); }
    catch { return { ...opciones.deArranque }; }
  };
  let actuales: T = typeof localStorage === "undefined" ? { ...opciones.deArranque } : leerLoGuardado();
  const oyentes = new Set<() => void>();
  const aplicar = () => { if (typeof document !== "undefined") opciones.alAplicar?.(actuales); };
  aplicar();

  const leer = (): T => actuales;
  function cambiar<K extends keyof T>(clave: K, valor: T[K]): void {
    actuales = { ...actuales, [clave]: valor };
    try { localStorage.setItem(opciones.clave, JSON.stringify(actuales)); } catch { /* vale mientras esté abierta */ }
    aplicar();
    oyentes.forEach((o) => o());
  }
  function useLasPreferencias(): T {
    return useSyncExternalStore((o) => { oyentes.add(o); return () => { oyentes.delete(o); }; }, () => actuales);
  }
  // Para quien no es una pantalla: enterarse de cada cambio. Devuelve cómo dejar de escuchar.
  function escuchar(oyente: () => void): () => void { oyentes.add(oyente); return () => { oyentes.delete(oyente); }; }
  // Volver a leer lo guardado, como al abrir la aplicación.
  function recargar(): void { actuales = leerLoGuardado(); aplicar(); oyentes.forEach((o) => o()); }

  return { leer, cambiar, usar: useLasPreferencias, escuchar, recargar };
}
