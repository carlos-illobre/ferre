import { useCallback, useEffect, useRef } from "react";
import { useTeclasGlobales } from "../../../plataforma/teclado";
import type { Inventario } from "./useInventario";

// «/» va a la búsqueda; C, a «¿Cuántas hay?» del elegido; ↑ ↓ eligen (arriba del primero están las
// pestañas, decisión 82, salvo con el cursor en la búsqueda: las flechas no lo sacan de la caja,
// decisiones 130 y 133); Enter en la búsqueda va a corregir y Esc la limpia.
type Tecla = globalThis.KeyboardEvent;
const aCorregir = (x: Inventario) => x.panel.current?.querySelector<HTMLInputElement>("[data-testid='cantidad-real']")?.focus();
const esLetraC = (e: Tecla) => (e.key === "c" || e.key === "C") && !e.ctrlKey && !e.metaKey && !e.altKey;

function antesDelPanel(e: Tecla, x: Inventario, escribiendo: boolean): boolean {
  if (e.key === "/" && !escribiendo) { e.preventDefault(); x.caja.current?.focus(); return true; }
  if (esLetraC(e) && !escribiendo && x.corrige && x.elegido) { e.preventDefault(); aCorregir(x); return true; }
  return false;
}

function enLaLista(e: Tecla, x: Inventario, escribiendo: boolean) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") { enLaCaja(e, x); return; }
  if (!x.filas.length) return;
  e.preventDefault();
  if (e.key === "ArrowDown") x.setElegidoId(x.filas[Math.min(x.marcada + 1, x.filas.length - 1)]!.id);
  else subir(x, escribiendo);
}

function enLaCaja(e: Tecla, x: Inventario) {
  if (e.target !== x.caja.current) return;
  if (e.key === "Enter" && x.elegido) { e.preventDefault(); aCorregir(x); }
  else if (e.key === "Escape" && x.consulta) { e.preventDefault(); x.setConsulta(""); }
}

function subir(x: Inventario, escribiendo: boolean) {
  if (x.marcada > 0) { x.setElegidoId(x.filas[x.marcada - 1]!.id); return; }
  if (!escribiendo) document.querySelector<HTMLElement>(".cuerpo .pestanas button[aria-current='page']")?.focus();
}

export function useTeclasDeInventario(x: Inventario) {
  const actual = useRef(x);
  useEffect(() => { actual.current = x; });
  const teclas = useCallback((e: Tecla) => {
    if (document.querySelector("dialog[open]")) return;
    const x = actual.current;
    const destino = e.target as HTMLElement;
    const escribiendo = destino.tagName === "INPUT" || destino.tagName === "TEXTAREA";
    if (antesDelPanel(e, x, escribiendo) || x.panel.current?.contains(destino)) return;
    enLaLista(e, x, escribiendo);
  }, []);
  useTeclasGlobales(teclas, x.caja.current);
}
