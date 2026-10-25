import { precioDe, type Item } from "../../../negocio/ventas";
import { pesos } from "../../../negocio/formato";
import { SiVeCostos } from "../../Costos";
import { Margenes } from "../base/ui";
import { PrecioDelRenglon } from "./PrecioDelRenglon";
import css from "./FilaDelPrecio.module.css";

// Debajo del nombre: el costo (para quien lo ve), el margen y el precio por unidad. La cuenta
// entera está en «De dónde sale».
type Props = { item: Item; alCambiar: (c: Partial<Item>) => void; alElegirMargen: (m: number) => void };

export function FilaDelPrecio({ item: it, alCambiar, alElegirMargen }: Props) {
  const p = precioDe(it);
  const conCosto = Boolean(it.producto) && p.costo !== null;
  const sinPrecio = p.unitario === null;
  return (
    <div className={`${css.fila} ${sinPrecio ? css.sinPrecio : ""}`}>
      {conCosto && <SiVeCostos><span>Costo <b className={css.valor}>{pesos(p.costo!)}</b></span><span className={css.sep} /></SiVeCostos>}
      {conCosto && <>
        <span className={sinPrecio ? "falta-texto" : ""}>Margen</span>
        <Margenes compacto sinSigno elegido={it.precioManual === null ? p.margen : null} alElegir={alElegirMargen} etiqueta={`Margen de ${it.descripcion}`} />
        <span>%</span><span className={css.sep} />
      </>}
      <PrecioDelRenglon item={it} alCambiar={alCambiar} claseDelValor={css.valor} />
    </div>
  );
}
