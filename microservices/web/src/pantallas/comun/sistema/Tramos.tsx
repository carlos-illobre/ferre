import type { KeyboardEvent } from "react";
import { nombreDelTramo } from "../../../negocio/sistema";

// Los tramos de un tiempo, como «Buscar versión nueva»: tocar uno lo guarda. Con el teclado, ← →
// recorren los tramos y Enter o espacio elige.
export function Tramos({ etiqueta, tramos, elegido, apagado, alElegir, testId }: { etiqueta: string; tramos: number[]; elegido: number | undefined; apagado: boolean; alElegir: (s: number) => void; testId: string }) {
  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault(); e.stopPropagation();
    const botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const i = botones.indexOf(document.activeElement as HTMLButtonElement);
    botones[Math.min(botones.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)))]?.focus();
  }
  return (
    <div className={`cfg-tramos ${apagado ? "apagados" : ""}`} role="radiogroup" aria-labelledby={etiqueta} style={{ gridTemplateColumns: `repeat(${Math.max(tramos.length, 1)}, 1fr)` }} onKeyDown={teclas} data-testid={testId}>
      {tramos.map((s) => (
        <button key={s} type="button" role="radio" aria-checked={elegido === s} className={elegido === s ? "elegido" : ""} disabled={apagado}
          onClick={() => { if (s !== elegido) alElegir(s); }} data-testid={`${testId}-${s}`}>{nombreDelTramo(s)}</button>
      ))}
    </div>
  );
}
