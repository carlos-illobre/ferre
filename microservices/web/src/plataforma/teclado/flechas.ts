import { useEffect } from "react";
import { usarTeclasPorDefecto } from "./teclas";
import { filasDeLaPantalla, fijarDisposicion, laDisposicion, type DisposicionParaFlechas } from "./disposicion";
import { abrir, filaMarcada, marcar } from "./marca";
import "./flechas.css";

// El teclado en la computadora (decisiones 77 y 82). Hay dos focos distintos:
//   - el cursor de escritura, que queda en la caja de texto de la pantalla y no se mueve con
//     las flechas (a los campos y botones se va con Tab);
//   - la marca de las flechas, que solo puede estar en el menú, en las pestañas (eso lo
//     resuelve cada aplicación, con el foco de verdad) o en una fila entera de la lista de la
//     pantalla. De la marca de las filas se ocupa este archivo:
//       ↓      desde las pestañas o desde la búsqueda marca la primera fila; si la lista está
//              vacía, la marca no baja.
//       ↓ ↑    con una fila marcada, marcan la siguiente o la anterior, entera; ↑ desde la
//              primera saca la marca de la lista y, si el cursor no está en una caja de texto,
//              vuelve a las pestañas (con el cursor en la búsqueda, el cursor no se mueve).
//       Enter  abre la fila marcada: su acción principal.
// Vale igual en todas las pantallas. No cuentan como lista: lo que la aplicación diga que se
// recorre de otra forma (su menú, sus pestañas), los resultados que despliega una búsqueda (los
// recorre esa búsqueda) ni lo que una pantalla marca con `data-sin-flechas`. Los títulos de una
// tabla no son filas. Los nombres propios de cada aplicación llegan en `DisposicionParaFlechas`.

export type { DisposicionParaFlechas } from "./disposicion";
export { irAlPrimerItem, quitarLaMarca } from "./marca";

const TECLAS_DE_LA_LISTA = new Set(["ArrowDown", "ArrowUp", "Enter"]);
const conModificador = (e: KeyboardEvent) => e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing;
const tipoDe = (foco: HTMLElement) => (foco instanceof HTMLInputElement ? foco.type : "");
// En una caja de texto de una línea las flechas no tienen otro uso: mueven la marca.
const esDeUnaLinea = (foco: HTMLElement) => foco.tagName === "INPUT" && ["text", "search", ""].includes(tipoDe(foco));
// En un campo donde las flechas cambian el valor (una cantidad, un selector, una fecha, un
// área de texto), son del campo.
const flechasDelCampo = (foco: HTMLElement) => !esDeUnaLinea(foco) && (foco.isContentEditable || ["SELECT", "TEXTAREA", "INPUT"].includes(foco.tagName));

function enterEnUnaCasilla(e: KeyboardEvent, foco: HTMLElement): boolean {
  if (e.key !== "Enter" || tipoDe(foco) !== "checkbox") return false;
  e.preventDefault(); (foco as HTMLInputElement).click();
  return true;
}

// Enter sobre un botón enfocado es de ese botón; con una fila marcada y el cursor en la búsqueda (o en ningún lado), abre la fila.
function enter(e: KeyboardEvent, foco: HTMLElement): void {
  const actual = filaMarcada();
  if (!actual || (!esDeUnaLinea(foco) && foco.matches("button, a[href], [role='button']"))) return;
  e.preventDefault();
  abrir(actual);
}

// Arriba de la primera fila están las pestañas de la parte, si tiene. Con el cursor en una caja
// de texto, la marca se va de la lista y el cursor se queda donde está: son dos focos distintos.
function salirPorArriba(foco: HTMLElement): void {
  marcar(null);
  const escribiendo = foco instanceof HTMLTextAreaElement || (foco instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit"].includes(foco.type));
  if (!escribiendo && !foco.closest("dialog[open], [role='dialog'], [aria-modal='true']")) laDisposicion().arribaDeLaLista?.()?.focus();
}

function mover(e: KeyboardEvent, foco: HTMLElement): void {
  const actual = filaMarcada();
  const filas = filasDeLaPantalla();
  if (filas.length === 0) return;
  const i = actual ? filas.indexOf(actual) : -1;
  if (e.key === "ArrowDown") { e.preventDefault(); marcar(filas[Math.min(i + 1, filas.length - 1)]!); }
  else if (i > 0) { e.preventDefault(); marcar(filas[i - 1]!); }
  else if (i === 0) { e.preventDefault(); salirPorArriba(foco); }
}

function manejar(e: KeyboardEvent): void {
  const foco = e.target as HTMLElement | null;
  if (conModificador(e) || !foco) return;
  if (enterEnUnaCasilla(e, foco)) return;
  if (!TECLAS_DE_LA_LISTA.has(e.key) || flechasDelCampo(foco)) return;
  if (e.key === "Enter") enter(e, foco); else mover(e, foco);
}

export function useFlechas(activas: boolean, deLaAplicacion?: DisposicionParaFlechas): void {
  if (deLaAplicacion) fijarDisposicion(deLaAplicacion);
  useEffect(() => {
    if (!activas) return;
    usarTeclasPorDefecto(manejar);
    // Al cambiar de pantalla o al usar el mouse, la marca de las flechas se va.
    const quitar = () => marcar(null);
    window.addEventListener("hashchange", quitar);
    window.addEventListener("mousedown", quitar);
    return () => { usarTeclasPorDefecto(null); window.removeEventListener("hashchange", quitar); window.removeEventListener("mousedown", quitar); quitar(); };
  }, [activas]);
}
