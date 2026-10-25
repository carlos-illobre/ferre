import { MARGENES } from "./marcas";
// Teclado en la ficha: ← → recorren los márgenes sin elegir (Enter elige el que tiene el
// foco); ↑ ↓ recorren las partes de la ficha (Enter usa la que tiene el foco); ↑ desde la
// primera vuelve a los márgenes. En una caja de texto, ← → mueven el cursor.
type Tecla = KeyboardEvent;
const enCaja = (foco: HTMLElement | null, tambienInput = true) => foco?.tagName === "TEXTAREA" || (tambienInput && foco?.tagName === "INPUT");

function alMargen(margenes: HTMLButtonElement[]) {
  (margenes.find((b) => b.getAttribute("aria-checked") === "true") ?? margenes[0])?.focus();
}

function deCostado(e: Tecla, margenes: HTMLButtonElement[], foco: HTMLElement | null) {
  if (margenes.length === 0 || enCaja(foco)) return;
  e.preventDefault();
  const i = margenes.indexOf(foco as HTMLButtonElement);
  if (i < 0) alMargen(margenes);
  else margenes[(i + (e.key === "ArrowRight" ? 1 : -1) + margenes.length) % margenes.length]!.focus();
}

function deArribaAAbajo(e: Tecla, margenes: HTMLButtonElement[], foco: HTMLElement | null, ficha: HTMLElement) {
  if (enCaja(foco, false)) return;
  e.preventDefault();
  const lugares = [...ficha.querySelectorAll<HTMLElement>("[data-ficha-vertical]:not([disabled])")];
  const i = lugares.indexOf(foco as HTMLElement);
  if (e.key === "ArrowDown") lugares[i < 0 ? 0 : Math.min(i + 1, lugares.length - 1)]?.focus();
  else if (i > 0) lugares[i - 1]!.focus();
  else alMargen(margenes);
}

const MOVIMIENTOS: Record<string, typeof deArribaAAbajo> = { ArrowLeft: deCostado, ArrowRight: deCostado, ArrowUp: deArribaAAbajo, ArrowDown: deArribaAAbajo };

function teclasDeLaFicha(e: Tecla, ficha: HTMLElement) {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const mover = MOVIMIENTOS[e.key];
  if (!mover) return;
  const margenes = [...ficha.querySelectorAll<HTMLButtonElement>(`${MARGENES} button:not([disabled])`)];
  mover(e, margenes, document.activeElement as HTMLElement | null, ficha);
}

// La ficha del producto al lado de la lista (Productos).
export function instalarFicha(): void {
  window.addEventListener("keydown", (e) => {
    const ficha = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-ficha-con-flechas]") : null;
    if (ficha) teclasDeLaFicha(e, ficha);
  });
}
