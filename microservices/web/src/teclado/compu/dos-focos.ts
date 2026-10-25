import { porLaMarca } from "./por-la-marca";
import { botonesDeLasPestanas, botonesDelMenu, rutaDeLaPestana } from "./marcas";

// Dos focos independientes (decisiones 82 y 137): con el cursor en una caja de texto, las flechas
// mueven la marca del teclado por el menú y las pestañas sin sacar el cursor de la caja. ← (con la
// caja vacía o el cursor al principio) lleva la marca al menú; ahí ↑ ↓ lo recorren y Enter o → abre
// la parte y pasa la marca a sus pestañas; en las pestañas, ← → las recorren (← desde la primera
// vuelve al menú), Enter abre la pestaña, y ↓ o Esc devuelven la marca a la pantalla. Escribir algo,
// Tab o el mouse la sacan.
type Marca = { zona: "menu" | "pestanas"; i: number } | null;
type Estado = { marca: Marca };

const menu = botonesDelMenu;
const pestanas = botonesDeLasPestanas;
const actualDe = (bs: HTMLButtonElement[]) => Math.max(0, bs.findIndex((b) => b.getAttribute("aria-current") === "page"));
const TIPOS_DE_CAJA = ["text", "search", "", "tel", "url", "email", "password", "number"];
const esCaja = (foco: Element | null) => foco instanceof HTMLTextAreaElement || (foco instanceof HTMLInputElement && TIPOS_DE_CAJA.includes(foco.type));
const hayVentana = () => Boolean(document.querySelector("dialog[open], [role='dialog'], [aria-modal='true']"));

function pintar(s: Estado) {
  document.querySelectorAll("[data-marca]").forEach((b) => b.removeAttribute("data-marca"));
  if (!s.marca) return;
  const b = (s.marca.zona === "menu" ? menu() : pestanas())[s.marca.i];
  if (b) { b.setAttribute("data-marca", ""); b.scrollIntoView?.({ block: "nearest" }); } else s.marca = null;
}
const sacar = (s: Estado) => { if (s.marca) { s.marca = null; pintar(s); } };

// Después de abrir algo, la marca va a las pestañas de lo que quedó abierto (se espera a que se dibuje).
function aLasPestanas(s: Estado, ruta: string) {
  let intentos = 0;
  const mirar = () => {
    const ps = pestanas();
    if (ps.length && !ps.some((b) => b.getAttribute("aria-current") === "page" && rutaDeLaPestana(b) === ruta) && ruta && intentos++ < 10) { setTimeout(mirar, 40); return; }
    s.marca = ps.length > 1 ? { zona: "pestanas", i: actualDe(ps) } : null; pintar(s);
  };
  setTimeout(mirar, 40);
}
// Al abrir algo con la marca, el cursor sigue en una caja de texto: la de la pantalla nueva, si tiene.
function abrirConLaMarca(s: Estado, b: HTMLButtonElement | undefined) {
  if (!b) return;
  porLaMarca.ahora = true; b.click(); setTimeout(() => { porLaMarca.ahora = false; }, 700);
}

// Sin marca: ← con la caja vacía o el cursor al principio la pone en el menú.
function ponerLaMarca(s: Estado, e: KeyboardEvent, campo: HTMLInputElement | HTMLTextAreaElement, usar: () => void) {
  const alPrincipio = campo.value === "" || (campo.selectionStart === 0 && campo.selectionEnd === 0);
  if (e.key !== "ArrowLeft" || e.shiftKey || !alPrincipio || campo.closest("[data-flechas-propias]")) return;
  usar(); s.marca = { zona: "menu", i: actualDe(menu()) }; pintar(s);
  document.querySelectorAll("[data-flecha]").forEach((f) => f.removeAttribute("data-flecha")); // la marca es una sola
}

function enElMenu(s: Estado, m: NonNullable<Marca>, e: KeyboardEvent, usar: () => void) {
  const bs = menu();
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { usar(); m.i = (m.i + (e.key === "ArrowDown" ? 1 : bs.length - 1)) % bs.length; pintar(s); }
  else if (e.key === "Enter" || e.key === "ArrowRight") { usar(); const b = bs[m.i]; sacar(s); abrirConLaMarca(s, b); aLasPestanas(s, ""); }
  else if (e.key === "ArrowLeft") usar();
  else { if (e.key === "Escape") usar(); sacar(s); }
}

function moverEnLasPestanas(s: Estado, m: NonNullable<Marca>, izquierda: boolean) {
  if (izquierda) { if (m.i > 0) m.i--; else s.marca = { zona: "menu", i: actualDe(menu()) }; }
  else if (m.i < pestanas().length - 1) m.i++;
  pintar(s);
}

function abrirLaPestana(s: Estado, b: HTMLButtonElement | undefined) {
  abrirConLaMarca(s, b);
  aLasPestanas(s, rutaDeLaPestana(b));
}

function enLasPestanas(s: Estado, m: NonNullable<Marca>, e: KeyboardEvent, usar: () => void) {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") { usar(); moverEnLasPestanas(s, m, e.key === "ArrowLeft"); }
  else if (e.key === "Enter") { usar(); abrirLaPestana(s, pestanas()[m.i]); }
  else if (e.key === "ArrowUp") usar();
  // ↓ vuelve a la pantalla (y sigue: marca la primera fila); Esc la saca; escribir saca la marca.
  else { if (e.key === "Escape") usar(); sacar(s); }
}

function alTeclear(s: Estado, e: KeyboardEvent) {
  const foco = document.activeElement;
  if (!esCaja(foco) || e.altKey || e.ctrlKey || e.metaKey || hayVentana()) { sacar(s); return; }
  const usar = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  const m = s.marca;
  if (!m) ponerLaMarca(s, e, foco as HTMLInputElement | HTMLTextAreaElement, usar);
  else if (m.zona === "menu") enElMenu(s, m, e, usar);
  else enLasPestanas(s, m, e, usar);
}

export function instalarDosFocos(): void {
  const s: Estado = { marca: null };
  window.addEventListener("keydown", (e) => alTeclear(s, e), { capture: true });
  window.addEventListener("mousedown", () => sacar(s), { capture: true });
}
