import { conUnidad } from "../../../negocio/catalogo";
import { pesosCortos } from "../../../negocio/formato";
import { precioDe, subtotalDe, type Item } from "../../../negocio/ventas";
import { useRueda } from "../../../plataforma/animacion";
import css from "./SubtotalDelRenglon.module.css";

// El total del renglón y, debajo, la cuenta (cantidad × precio) o qué le falta para tenerlo.
export function SubtotalDelRenglon({ item: it }: { item: Item }) {
  const p = precioDe(it);
  const renglon = subtotalDe(it);
  const rueda = useRueda<HTMLSpanElement>(renglon?.valor ?? 0);
  const falta = it.producto && p.costo !== null ? "elegí el margen" : "poné el precio";
  return (
    <div className={css.sub} data-testid="subtotal">
      {renglon ? <span className="importe anim-rueda-valor" ref={rueda}>{pesosCortos(renglon.valor)}</span> : <span className="falta-texto" data-testid="sin-precio">Sin precio</span>}
      <small>{p.unitario === null ? falta : `${conUnidad(it.cantidad, it.unidad)} × ${pesosCortos(p.unitario)}`}</small>
    </div>
  );
}
