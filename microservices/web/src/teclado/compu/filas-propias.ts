// Una lista que se recorre por sus filas (`data-filas`, con cada fila marcada `data-fila`: las
// filas de una tabla, los botones de una lista): con el foco en una fila, ↑ ↓
// pasan a la de al lado e Inicio y Fin a la primera y la última.
const DESTINO: Record<string, (i: number, n: number) => number> = { ArrowDown: (i) => i + 1, ArrowUp: (i) => i - 1, Home: () => 0, End: (_, n) => n - 1 };

const conModificador = (e: KeyboardEvent) => e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
const filaDe = (objetivo: EventTarget | null) => (objetivo instanceof HTMLElement && objetivo.matches("[data-filas] [data-fila]") ? objetivo : null);
const filasJuntoA = (fila: HTMLElement) => [...(fila.closest("[data-filas]")?.querySelectorAll<HTMLElement>("[data-fila]") ?? [])];

function alTeclear(e: KeyboardEvent) {
  const destino = DESTINO[e.key];
  const fila = destino && !e.defaultPrevented && !conModificador(e) ? filaDe(e.target) : null;
  if (!fila) return;
  const filas = filasJuntoA(fila);
  const siguiente = filas[destino!(filas.indexOf(fila), filas.length)];
  if (!siguiente) return;
  e.preventDefault();
  siguiente.focus();
}

export function instalarFilasPropias(): void {
  window.addEventListener("keydown", alTeclear);
}
