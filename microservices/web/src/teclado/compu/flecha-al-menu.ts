import { botonesDelMenu, MENU, PESTANAS } from "./marcas";
const hayVentana = () => Boolean(document.querySelector("dialog[open], [role='dialog'], [aria-modal='true']"));
const esCampo = (foco: Element | null) => foco instanceof HTMLInputElement || foco instanceof HTMLTextAreaElement || foco instanceof HTMLSelectElement;
const ROLES_CON_FLECHAS = ["radio", "tab", "slider", "option", "menuitem"];

// ← lleva el foco al menú, salvo en un campo (las flechas nunca sacan el cursor, decisión 130), en
// algo que usa ← para sí (una lista de opciones, una zona que recorre sus flechas por su cuenta) o
// con una ventana abierta.
const conModificador = (e: KeyboardEvent) => e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
const usaLaFlecha = (foco: HTMLElement) => foco.isContentEditable || ROLES_CON_FLECHAS.includes(foco.getAttribute("role") ?? "");
function esDelLugar(e: KeyboardEvent): boolean {
  if (e.key !== "ArrowLeft" || e.defaultPrevented || conModificador(e) || hayVentana()) return true;
  const foco = document.activeElement as HTMLElement | null;
  if (!foco) return false;
  return Boolean(foco.closest(`${MENU}, ${PESTANAS}, [data-flechas-propias]`)) || esCampo(foco) || usaLaFlecha(foco);
}

// Flechas entre el menú y la pantalla: ← lleva el foco al menú, ↑ ↓ lo recorren, y → (o Enter)
// abre lo elegido y devuelve el foco a la pantalla, donde ↑ ↓ vuelven a elegir sus renglones.
export function instalarFlechaAlMenu(): void {
  window.addEventListener("keydown", (e) => {
    if (esDelLugar(e)) return;
    const botones = botonesDelMenu();
    const destino = botones.find((b) => b.getAttribute("aria-current") === "page") ?? botones[0];
    if (destino) { e.preventDefault(); destino.focus(); }
  });
}
