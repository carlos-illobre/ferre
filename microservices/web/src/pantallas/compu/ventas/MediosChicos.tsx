import { NOMBRE_DE_MEDIO, type Medio } from "../../../negocio/ventas";
import { IconoDeMedio } from "../../IconoDeMedio";
import { MEDIOS } from "../../textos";
import css from "./VentasDelDia.module.css";

// Los medios en pastillas chicas, la elegida con su nombre: al corregir y para cobrar la diferencia.
const CORTO = Object.fromEntries(MEDIOS.map((m) => [m.valor, m.corto])) as Record<Medio, string>;
type Props<M extends Medio> = { medios: readonly M[]; elegido: M; alElegir: (m: M) => void; prefijo: string };

export function MediosChicos<M extends Medio>({ medios, elegido, alElegir, prefijo }: Props<M>) {
  return (
    <>
      {medios.map((m) => (
        <button key={m} type="button" role="radio" aria-checked={elegido === m} title={NOMBRE_DE_MEDIO[m]} className={`${css.medioEd} medio-${m} ${elegido === m ? "elegido" : ""}`} onClick={() => alElegir(m)} data-testid={`${prefijo}-${m}`}>
          <IconoDeMedio medio={m} tam={16} />{elegido === m && <span>{CORTO[m]}</span>}
        </button>
      ))}
    </>
  );
}
