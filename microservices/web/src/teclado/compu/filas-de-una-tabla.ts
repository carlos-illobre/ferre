// Una tabla que se recorre por filas (`data-flechas-propias`, con cada fila `tr[data-fila]`): con el
// foco en una fila, ↑ ↓ pasan a la de al lado e Inicio y Fin a la primera y la última.
const DESTINO: Record<string, (i: number, n: number) => number> = { ArrowDown: (i) => i + 1, ArrowUp: (i) => i - 1, Home: () => 0, End: (_, n) => n - 1 };

const conModificador = (e: KeyboardEvent) => e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
const filaDe = (objetivo: EventTarget | null) => (objetivo instanceof HTMLTableRowElement && objetivo.matches("[data-flechas-propias] tr[data-fila]") ? objetivo : null);
const filasJuntoA = (fila: HTMLElement) => [...(fila.parentElement?.querySelectorAll<HTMLElement>(":scope > tr[data-fila]") ?? [])];

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

export function instalarFilasDeUnaTabla(): void {
  window.addEventListener("keydown", alTeclear);
}
