// Un grupo de opciones (`role="radiogroup"`, como los márgenes): ← → pasan a la opción de al lado y
// la eligen, dando la vuelta. Salvo que lo recorra quien lo contiene (`data-flechas-de-afuera`).
const esDeCostado = (e: KeyboardEvent) => !e.defaultPrevented && !e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "ArrowLeft" || e.key === "ArrowRight");
const grupoDe = (objetivo: EventTarget | null) => (objetivo instanceof Element ? objetivo.closest<HTMLElement>("[role='radiogroup']:not([data-flechas-de-afuera])") : null);

function alTeclear(e: KeyboardEvent) {
  const grupo = esDeCostado(e) ? grupoDe(e.target) : null;
  if (!grupo) return;
  const botones = [...grupo.querySelectorAll<HTMLButtonElement>("button[role='radio']:not([disabled])")];
  const i = botones.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  e.preventDefault(); e.stopPropagation();
  const destino = botones[(i + (e.key === "ArrowRight" ? 1 : -1) + botones.length) % botones.length]!;
  destino.focus(); destino.click();
}

export function instalarGruposDeOpciones(): void {
  window.addEventListener("keydown", alTeclear);
}
