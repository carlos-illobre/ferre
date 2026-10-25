import { MARGENES } from "../../../negocio/precios";

type Props = { elegido: number | null; alElegir: (m: number) => void; disabled?: boolean; etiqueta?: string; atajos?: boolean; compacto?: boolean; flechasDeAfuera?: boolean; sinSigno?: boolean };

// Izquierda y derecha pasan al margen de al lado y lo eligen.
function pasarConLasFlechas(e: React.KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault(); e.stopPropagation();
  const botones = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
  const i = botones.indexOf(document.activeElement as HTMLButtonElement);
  const destino = botones[(i + (e.key === "ArrowRight" ? 1 : -1) + botones.length) % botones.length];
  destino?.focus(); destino?.click();
}

const textoDelMargen = (m: number, sinSigno?: boolean, compacto?: boolean) => `${m}${sinSigno ? "" : `${compacto ? "" : " "}%`}`;

// Los cinco márgenes de un toque. Es un grupo de opciones: Tab entra una vez y las flechas
// izquierda y derecha pasan de un margen a otro y lo eligen.
// Con `flechasDeAfuera`, las flechas no eligen: las maneja quien lo contiene, y se elige con Enter.
export function Margenes({ elegido, alElegir, disabled, etiqueta = "Margen", atajos, compacto, flechasDeAfuera, sinSigno }: Props) {
  const conFoco = MARGENES.includes(elegido as never) ? elegido : MARGENES[0];
  return (
    <div className={`margenes ${compacto ? "compacto" : ""}`} role="radiogroup" aria-label={etiqueta} onKeyDown={flechasDeAfuera ? undefined : pasarConLasFlechas}>
      {MARGENES.map((m, i) => (
        <button key={m} type="button" role="radio" aria-checked={elegido === m} tabIndex={m === conFoco ? 0 : -1} disabled={disabled} title={atajos ? `Mayúsculas + ${i + 1}` : undefined}
          onClick={(e) => { e.stopPropagation(); alElegir(m); }} aria-label={sinSigno ? `${m} %` : undefined} data-testid={`margen-${m}`}>{textoDelMargen(m, sinSigno, compacto)}</button>
      ))}
    </div>
  );
}
