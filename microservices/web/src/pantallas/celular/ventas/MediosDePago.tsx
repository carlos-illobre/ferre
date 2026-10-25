import { NOMBRE_DE_MEDIO, type Medio } from "../../../negocio/ventas";
import { IconoDeMedio } from "../../IconoDeMedio";
import { MEDIOS } from "../../textos";
import css from "./MediosDePago.module.css";

// El medio de pago, como la v4 de «Ventas de hoy» (decisión 142): una fila de pastillas; la
// elegida con su color, el ícono en un círculo lleno y su nombre; las demás, solo el ícono. Lo usan
// Vender (los cuatro) y corregir o cambiar una venta (los que corresponden).
type Props<M extends Medio> = { medios: readonly M[]; elegido: M | null; alElegir: (m: M) => void; etiqueta: string; prefijo: string; testId?: string };
const CORTO = Object.fromEntries(MEDIOS.map((m) => [m.valor, m.corto])) as Record<Medio, string>;

export function MediosDePago<M extends Medio>({ medios, elegido, alElegir, etiqueta, prefijo, testId }: Props<M>) {
  return (
    <div className={css.fila} role="radiogroup" aria-label={etiqueta} data-testid={testId}>
      {medios.map((m) => (
        <button key={m} type="button" role="radio" aria-checked={elegido === m} aria-label={NOMBRE_DE_MEDIO[m]} title={NOMBRE_DE_MEDIO[m]}
          className={`${css.medio} medio-${m} ${elegido === m ? css.elegido : ""}`} onClick={() => alElegir(m)} data-testid={`${prefijo}-${m}`}>
          <IconoDeMedio medio={m} tam={18} />{elegido === m && <span className="anim-asoma">{CORTO[m]}</span>}
        </button>
      ))}
    </div>
  );
}
