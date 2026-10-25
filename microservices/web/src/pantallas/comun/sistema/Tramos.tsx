import { nombreDelTramo } from "../../../negocio/sistema";

// Los tramos de un tiempo, como «Buscar versión nueva»: tocar uno lo guarda. Es un grupo de
// opciones: el teclado lo recorre como a cualquiera.
export function Tramos({ etiqueta, tramos, elegido, apagado, alElegir, testId }: { etiqueta: string; tramos: number[]; elegido: number | undefined; apagado: boolean; alElegir: (s: number) => void; testId: string }) {
  return (
    <div className={`cfg-tramos ${apagado ? "apagados" : ""}`} role="radiogroup" aria-labelledby={etiqueta} style={{ gridTemplateColumns: `repeat(${Math.max(tramos.length, 1)}, 1fr)` }} data-testid={testId}>
      {tramos.map((s) => (
        <button key={s} type="button" role="radio" aria-checked={elegido === s} className={elegido === s ? "elegido" : ""} disabled={apagado}
          onClick={() => { if (s !== elegido) alElegir(s); }} data-testid={`${testId}-${s}`}>{nombreDelTramo(s)}</button>
      ))}
    </div>
  );
}
