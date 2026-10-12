import { useEffect } from "react";
import { usarTeclasPorDefecto } from "../../teclas";

// Todo con el teclado (pedido de Carlos del 2026-10-12; el mouse es un complemento). En la
// computadora, las flechas recorren lo que hay en la pantalla y Enter lo acciona:
//   ↓ ↑   van al control siguiente o al anterior (un campo, un botón, una casilla, un renglón).
//   →     lo mismo que ↓ donde no tiene otro uso; en un campo de texto, solo con el cursor al final.
//   ←     lleva al menú (lo resuelve la aplicación; en un campo, solo con el cursor al principio).
//   Enter acciona el botón o tilda la casilla; Espacio también. Esc cierra lo que esté abierto.
// Vale también dentro de una ventana abierta, sin salir de ella. No se mete donde las flechas
// ya significan otra cosa: una lista de resultados que la pantalla recorre (esa tecla llega
// usada); un selector o una fecha, donde ↑ ↓ cambian el valor y se sigue con Enter (o →); un
// área de texto, de la que se sale por abajo desde el final.
const ENFOCABLES = "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']):not([type='file']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const visible = (e: HTMLElement) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";

function alcance(): HTMLElement | null {
  const ventanas = [...document.querySelectorAll<HTMLElement>("dialog[open], [role='dialog'], [aria-modal='true']")].filter(visible);
  return ventanas.at(-1) ?? document.querySelector<HTMLElement>(".cuerpo");
}

function mover(e: KeyboardEvent, hacia: 1 | -1): void {
  const donde = alcance();
  if (!donde) return;
  const enVentana = !donde.classList.contains("cuerpo");
  const controles = [...donde.querySelectorAll<HTMLElement>(ENFOCABLES)].filter((c) => visible(c) && (enVentana || !c.closest(".pestanas")) && c.id !== "contenido");
  if (controles.length === 0) return;
  const foco = document.activeElement as HTMLElement | null;
  const i = foco ? controles.indexOf(foco) : -1;
  const destino = i < 0 ? (hacia === 1 ? controles[0] : controles.at(-1)) : controles[i + hacia];
  if (!destino) {
    // Arriba del primero de la pantalla están las pestañas de la parte, si tiene.
    if (hacia === -1 && !enVentana) { const pestana = document.querySelector<HTMLElement>(".cuerpo .pestanas button[aria-current='page']"); if (pestana) { e.preventDefault(); pestana.focus(); } }
    return;
  }
  e.preventDefault();
  destino.focus();
  destino.scrollIntoView?.({ block: "nearest" });
}

function manejar(e: KeyboardEvent): void {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing) return;
  const foco = e.target as HTMLElement | null;
  const etiqueta = foco?.tagName ?? "";
  const tipo = foco instanceof HTMLInputElement ? foco.type : "";
  const deTexto = etiqueta === "TEXTAREA" || (etiqueta === "INPUT" && ["text", "search", "", "tel", "url", "email", "password"].includes(tipo));
  const conFlechasPropias = etiqueta === "SELECT" || etiqueta === "TEXTAREA" || ["date", "time", "number", "range", "radio"].includes(tipo) || Boolean(foco?.isContentEditable);

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    // En un área de texto las flechas mueven el cursor; se sale por abajo desde el final y por arriba desde el principio.
    if (etiqueta === "TEXTAREA") { const t = foco as HTMLTextAreaElement; if (e.key === "ArrowDown" ? t.selectionStart !== t.value.length : t.selectionEnd !== 0) return; }
    else if (conFlechasPropias) return;
    mover(e, e.key === "ArrowDown" ? 1 : -1);
  } else if (e.key === "ArrowRight") {
    if (etiqueta === "TEXTAREA" || ["date", "time", "range", "radio"].includes(tipo) || foco?.isContentEditable) return;
    if (deTexto || tipo === "number") { const c = foco as HTMLInputElement; if (tipo !== "number" && !(c.selectionStart === c.value.length && c.selectionEnd === c.value.length)) return; }
    mover(e, 1);
  } else if (e.key === "Enter" && (etiqueta === "SELECT" || ["date", "time"].includes(tipo))) {
    // En un selector o una fecha, ↑ ↓ cambian el valor: Enter lo da por elegido y pasa al siguiente.
    mover(e, 1);
  } else if (e.key === "Enter" && tipo === "checkbox") {
    // En una casilla, Enter hace lo mismo que Espacio.
    e.preventDefault();
    (foco as HTMLInputElement).click();
  }
}

export function useFlechas(activas: boolean): void {
  useEffect(() => {
    if (!activas) return;
    usarTeclasPorDefecto(manejar);
    return () => usarTeclasPorDefecto(null);
  }, [activas]);
}
