import { GRILLA_DE_MAS, parteAbierta } from "./marcas";
// Las opciones se recorren con las flechas como la grilla que se ve (pedido de Carlos del
// 2026-10-15): → a la siguiente y ← a la anterior; ↓ a la de abajo y ↑ a la de arriba, en la misma
// columna; ← desde la primera vuelve al menú.
const FLECHAS = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
// Cuántas opciones entran por fila: las que empiezan a la misma altura que la primera.
function columnas(botones: HTMLButtonElement[]) {
  const arriba = botones[0]!.getBoundingClientRect().top;
  return Math.max(1, botones.filter((b) => Math.abs(b.getBoundingClientRect().top - arriba) < 2).length);
}
const conModificador = (e: KeyboardEvent) => e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
const parteDelMenu = parteAbierta;
function teclas(e: KeyboardEvent, grilla: HTMLElement) {
  if (conModificador(e) || !FLECHAS.includes(e.key)) return;
  const botones = [...grilla.querySelectorAll<HTMLButtonElement>("button")];
  const i = botones.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  const n = columnas(botones);
  const paso = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: n, ArrowUp: -n }[e.key as "ArrowRight" | "ArrowLeft" | "ArrowDown" | "ArrowUp"];
  e.preventDefault(); e.stopPropagation();
  const destino = botones[i + paso] ?? (e.key === "ArrowLeft" ? parteDelMenu() : null);
  destino?.focus();
}


export function instalarGrillaDeMas(): void {
  window.addEventListener("keydown", (e) => {
    const grilla = e.target instanceof Element ? e.target.closest<HTMLElement>(GRILLA_DE_MAS) : null;
    if (grilla) teclas(e, grilla);
  });
}
