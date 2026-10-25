import { useSyncExternalStore } from "react";

// Cómo se pide cada acción, para mostrarlo al lado de lo que la hace («F2» junto a «Cobrar»). Lo
// dice quien las pide (el teclado); quien las hace solo muestra lo que haya.
let etiquetas: Readonly<Record<string, string>> = {};
const oyentes = new Set<() => void>();

export function etiquetar(nuevas: Record<string, string>): void {
  etiquetas = { ...etiquetas, ...nuevas };
  oyentes.forEach((o) => o());
}
export const etiquetaDe = (accion: string): string | undefined => etiquetas[accion];

const suscribir = (o: () => void) => { oyentes.add(o); return () => { oyentes.delete(o); }; };
export function useEtiqueta(accion: string): string | undefined {
  return useSyncExternalStore(suscribir, () => etiquetas[accion]);
}
