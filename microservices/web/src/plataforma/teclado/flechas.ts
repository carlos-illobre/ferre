import { useEffect } from "react";
import { usarTeclasPorDefecto } from "./teclas";
import "./flechas.css";

// El teclado en la computadora (decisiones 77 y 82). Hay dos focos distintos:
//   - el cursor de escritura, que queda en la caja de texto de la pantalla y no se mueve con
//     las flechas (a los campos y botones se va con Tab);
//   - la marca de las flechas, que solo puede estar en el menú, en las pestañas (eso lo
//     resuelve la aplicación, con el foco de verdad) o en una fila entera de la lista de la
//     pantalla. De la marca de las filas se ocupa este archivo:
//       ↓      desde las pestañas o desde la búsqueda marca la primera fila; si la lista está
//              vacía, la marca no baja.
//       ↓ ↑    con una fila marcada, marcan la siguiente o la anterior, entera; ↑ desde la
//              primera vuelve a las pestañas.
//       Enter  abre la fila marcada: su acción principal.
// Vale igual en todas las pantallas. No cuentan como lista: el menú, las pestañas, las opciones
// de Más, los resultados que despliega una búsqueda (los recorre esa búsqueda) ni lo que una
// pantalla marca con `data-sin-flechas`. Los títulos de una tabla no son filas.
const ENFOCABLES = "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']):not([type='file']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const LISTAS = "ul, ol, table, [role='list'], .lista";
const NO_SON = ".lateral, .pestanas, .mas-grilla, [role='listbox'], [data-sin-flechas], [data-flechas-propias], thead";
const ACCIONABLE = "button:not([disabled]), a[href], [role='button'], [data-principal], .elegible";
const visible = (e: HTMLElement) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";

// Dónde valen las flechas: la ventana abierta, si hay una; si no, la pantalla.
function alcance(): HTMLElement | null {
  const ventanas = [...document.querySelectorAll<HTMLElement>("dialog[open], [role='dialog'], [aria-modal='true']")].filter(visible);
  return ventanas.at(-1) ?? document.querySelector<HTMLElement>(".cuerpo");
}

// Las filas de la lista de la pantalla: las de la primera lista que tenga alguna.
function filasDeLaPantalla(): HTMLElement[] {
  const donde = alcance();
  if (!donde) return [];
  for (const lista of donde.querySelectorAll<HTMLElement>(LISTAS)) {
    if (!visible(lista) || lista.closest(NO_SON)) continue;
    const filas = lista.tagName === "TABLE"
      ? [...lista.querySelectorAll<HTMLElement>("tbody > tr")].filter((f) => f.closest("table") === lista && !f.classList.contains("hija"))
      : ([...lista.children] as HTMLElement[]);
    // Solo cuentan las filas que hacen algo con Enter: una lista que nada más muestra datos no se recorre.
    const visibles = filas.filter((f) => visible(f) && (f.matches(ACCIONABLE) || f.querySelector(ACCIONABLE) !== null));
    if (visibles.length) return visibles;
  }
  return [];
}

let marcada: HTMLElement | null = null;
function marcar(fila: HTMLElement | null): void {
  if (marcada === fila) return;
  marcada?.removeAttribute("data-flecha");
  marcada = fila;
  if (fila) { fila.setAttribute("data-flecha", ""); fila.scrollIntoView?.({ block: "nearest" }); }
}
// La fila que tiene la marca, si sigue en pantalla.
function filaMarcada(): HTMLElement | null {
  if (marcada && (!marcada.isConnected || !visible(marcada))) marcar(null);
  return marcada;
}
export const quitarLaMarca = (): void => marcar(null);

// Desde las pestañas (o al entrar a una pantalla con el teclado): marca la primera fila y deja el
// cursor de escritura en la caja de texto de la pantalla. Sin filas no hace nada: devuelve falso
// y la marca se queda donde estaba.
export function irAlPrimerItem(): boolean {
  const donde = alcance();
  // Una pantalla que ya lleva su propia marca por la lista (Catálogo, desde la búsqueda): alcanza con dejar el cursor en su búsqueda.
  const propia = donde?.querySelector<HTMLElement>("[data-flechas-propias]");
  const filas = filasDeLaPantalla();
  if (filas.length === 0 && !(propia && propia.children.length > 0)) return false;
  const caja = donde ? [...donde.querySelectorAll<HTMLElement>("input[type='search'], input[type='text'], input:not([type])")].find((c) => visible(c) && !(c as HTMLInputElement).disabled && !c.closest(".pestanas, .mas-volver")) : undefined;
  (caja ?? document.getElementById("contenido"))?.focus();
  if (filas.length) marcar(filas[0]!);
  return true;
}

// La acción principal de una fila: la que marca con `data-principal`; si no, la fila misma si
// se puede accionar; si no, lo primero accionable que tenga.
function abrir(fila: HTMLElement): void {
  const destino = [...fila.querySelectorAll<HTMLElement>("[data-principal]")].find(visible)
    ?? (fila.matches("button, a[href], [role='button'], [data-principal], .elegible") ? fila : [...fila.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")].find(visible) ?? fila);
  destino.click();
}

function manejar(e: KeyboardEvent): void {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing) return;
  const foco = e.target as HTMLElement | null;
  if (!foco) return;
  const tipo = foco instanceof HTMLInputElement ? foco.type : "";
  if (e.key === "Enter" && tipo === "checkbox") { e.preventDefault(); (foco as HTMLInputElement).click(); return; }
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;
  // En un campo donde las flechas cambian el valor (una cantidad, un selector, una fecha, un
  // área de texto), son del campo. En una caja de texto de una línea no tienen otro uso: mueven la marca.
  const deUnaLinea = foco.tagName === "INPUT" && ["text", "search", ""].includes(tipo);
  if (!deUnaLinea && (foco.isContentEditable || ["SELECT", "TEXTAREA", "INPUT"].includes(foco.tagName))) return;
  const actual = filaMarcada();
  if (e.key === "Enter") {
    // Enter sobre un botón enfocado es de ese botón; con una fila marcada y el cursor en la búsqueda (o en ningún lado), abre la fila.
    if (!actual || (!deUnaLinea && foco.matches("button, a[href], [role='button']"))) return;
    e.preventDefault();
    abrir(actual);
    return;
  }
  const filas = filasDeLaPantalla();
  if (filas.length === 0) return;
  const i = actual ? filas.indexOf(actual) : -1;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    marcar(filas[Math.min(i + 1, filas.length - 1)]!);
  } else if (i > 0) {
    e.preventDefault();
    marcar(filas[i - 1]!);
  } else if (i === 0) {
    // Arriba de la primera fila están las pestañas de la parte, si tiene.
    e.preventDefault();
    marcar(null);
    if (!foco.closest("dialog[open], [role='dialog'], [aria-modal='true']")) document.querySelector<HTMLElement>(".cuerpo .pestanas button[aria-current='page']")?.focus();
  }
}

export function useFlechas(activas: boolean): void {
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
