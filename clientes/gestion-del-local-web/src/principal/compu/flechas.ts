import { useEffect } from "react";
import { usarTeclasPorDefecto } from "../../teclas";

// El teclado en la computadora (decisión 77, pedido de Carlos del 2026-10-13). Las flechas
// recorren el menú y las pestañas (eso lo resuelve la aplicación) y, acá, los ítems de una lista:
//   ↓ ↑   van al ítem siguiente o al anterior: un renglón de una tabla, una tarjeta de una lista.
//         ↑ desde el primero vuelve a las pestañas de la parte.
// Nada más: a un campo o a un botón se va con Tab, y dentro de un campo las flechas hacen lo de
// siempre. Enter acciona lo que tiene el foco (en una casilla, hace lo mismo que Espacio).
const ENFOCABLES = "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']):not([type='file']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const LISTAS = "ul, ol, table, [role='listbox'], [role='list'], .lista";
const ITEMS = "li, tr, tbody, [role='option'], [role='listitem'], [role='row']";
const visible = (e: HTMLElement) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";

// Los ítems de la lista en la que está el foco: de cada uno, lo primero que se puede enfocar.
function itemsDeLaLista(foco: HTMLElement): HTMLElement[] {
  const lista = foco.closest<HTMLElement>(LISTAS);
  if (!lista || lista.closest(".lateral, .pestanas")) return [];
  const propios = [...lista.querySelectorAll<HTMLElement>(ITEMS)].filter((i) => i.closest(LISTAS) === lista && visible(i));
  // En una lista sin ítems marcados (botones sueltos, uno debajo del otro), cada hijo es un ítem.
  const filas = propios.length ? propios : ([...lista.children] as HTMLElement[]).filter(visible);
  const vistos = new Set<HTMLElement>();
  return filas.map((f) => (f.matches(ENFOCABLES) ? f : [...f.querySelectorAll<HTMLElement>(ENFOCABLES)].find(visible)))
    .filter((c): c is HTMLElement => Boolean(c) && !vistos.has(c!) && Boolean(vistos.add(c!)));
}

function manejar(e: KeyboardEvent): void {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing) return;
  const foco = e.target as HTMLElement | null;
  if (!foco) return;
  const tipo = foco instanceof HTMLInputElement ? foco.type : "";
  if (e.key === "Enter" && tipo === "checkbox") { e.preventDefault(); (foco as HTMLInputElement).click(); return; }
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  // Dentro de un campo, las flechas son del campo.
  if (foco.isContentEditable || ["SELECT", "TEXTAREA"].includes(foco.tagName) || (foco.tagName === "INPUT" && !["checkbox", "button", "submit"].includes(tipo))) return;
  const items = itemsDeLaLista(foco);
  const fila = foco.closest<HTMLElement>(ITEMS);
  const i = items.findIndex((c) => c === foco || (fila !== null && fila.contains(c)));
  if (i < 0) return;
  const destino = items[i + (e.key === "ArrowDown" ? 1 : -1)];
  if (destino) { e.preventDefault(); destino.focus(); destino.scrollIntoView?.({ block: "nearest" }); return; }
  // Arriba del primero están las pestañas de la parte, si tiene.
  if (e.key === "ArrowUp" && !foco.closest("dialog[open], [role='dialog'], [aria-modal='true']")) {
    const pestana = document.querySelector<HTMLElement>(".cuerpo .pestanas button[aria-current='page']");
    if (pestana) { e.preventDefault(); pestana.focus(); }
  }
}

export function useFlechas(activas: boolean): void {
  useEffect(() => {
    if (!activas) return;
    usarTeclasPorDefecto(manejar);
    return () => usarTeclasPorDefecto(null);
  }, [activas]);
}
