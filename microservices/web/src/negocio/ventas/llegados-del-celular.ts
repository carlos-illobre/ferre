import { useSyncExternalStore } from "react";
import type { Item } from "./venta-en-curso";

// Los renglones que acaba de agregar el celular (como lector o en espejo): la computadora los
// marca «Llegó del celular» un momento, como la maqueta de la v2 (decisión 127).
const DURA_MS = 3000;
let llegados: ReadonlySet<string> = new Set();
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function marcarLlegado(clave: string): void {
  llegados = new Set([...llegados, clave]); avisar();
  setTimeout(() => { const resto = new Set(llegados); resto.delete(clave); llegados = resto; avisar(); }, DURA_MS);
}

// Lo que entró entre la venta de antes y la de después: un renglón nuevo o uno al que le subió
// la cantidad.
export const loQueEntro = (antes: readonly Item[], despues: readonly Item[]): Item[] =>
  despues.filter((it) => { const previo = antes.find((a) => a.clave === it.clave); return !previo || it.cantidad > previo.cantidad; });

export function marcarLoQueEntro(antes: readonly Item[], despues: readonly Item[]): void {
  for (const it of loQueEntro(antes, despues)) marcarLlegado(it.clave);
}

export function useLlegadosDelCelular(): ReadonlySet<string> {
  return useSyncExternalStore((o) => { oyentes.add(o); return () => oyentes.delete(o); }, () => llegados);
}
