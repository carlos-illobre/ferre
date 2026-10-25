import { useEffect, useRef } from "react";
import type { Acciones } from "./registro";

// Acciones de un lugar de la pantalla (una cantidad, un renglón, una búsqueda): valen con el foco
// adentro de ese lugar. Así un control que se repite (varias cantidades a la vista) ofrece las
// suyas sin pisarse con los otros.
const lugares = new WeakMap<Element, () => Acciones>();

export function useAccionesDelLugar(lugar: { readonly current: Element | null }, acciones: Acciones): void {
  const actuales = useRef(acciones);
  actuales.current = acciones;
  useEffect(() => {
    const el = lugar.current;
    if (!el) return;
    lugares.set(el, () => actuales.current);
    return () => { lugares.delete(el); };
  });
}

// Pide la acción del lugar más cercano al elemento (él o el que lo contiene) que la ofrezca.
export function pedirEn(desde: Element | null, nombre: string): boolean {
  for (let el = desde; el; el = el.parentElement) {
    const accion = lugares.get(el)?.()[nombre];
    if (accion) return accion() !== false;
  }
  return false;
}
