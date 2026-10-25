import { pesosCortos } from "../base/ui";
import css from "./Resumen.module.css";

// El «$» chico de la v2, delante del importe.
export function Pesos({ valor }: { valor: number }) {
  const texto = pesosCortos(Math.abs(valor));
  return <span className={css.pesos} aria-label={`${valor < 0 ? "−" : ""}${texto}`}>{valor < 0 ? "−" : ""}<span className={css.peso} aria-hidden="true">$</span><span aria-hidden="true">{texto.slice(1)}</span></span>;
}
