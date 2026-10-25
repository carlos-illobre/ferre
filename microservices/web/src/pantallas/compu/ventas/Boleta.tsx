import { abreviarUnidad, conUnidad } from "../../../negocio/catalogo";
import { precioDe, subtotalDe, type Item } from "../../../negocio/ventas";
import { nombreDeProducto, hora, pesosCortos } from "../../../negocio/formato";
import css from "./Boleta.module.css";

// La boleta (de la v4): la venta como un ticket de mostrador.
export function Boleta({ items, total }: { items: Item[]; total: number }) {
  return (
    <div data-testid="boleta">
      <div className={css.cab}><b>Boleta de mostrador</b><span className="detalle">{hora(new Date().toISOString())}</span></div>
      {items.length === 0 ? <p className="detalle">La boleta está vacía.</p> : items.map((it) => <LineaDeBoleta key={it.clave} item={it} />)}
      <div className={css.total}><span>Total<small>{items.length} {items.length === 1 ? "producto" : "productos"}</small></span><strong className="importe">{pesosCortos(total)}</strong></div>
    </div>
  );
}

// Cómo se llegó al precio de la línea: a mano o con qué margen.
const deDonde = (it: Item, margen: number | null) => (it.precioManual !== null ? " · a mano" : margen !== null ? ` · margen ${margen} %` : "");
const porUnidad = (it: Item) => (it.unidad === "unidad" ? "c/u" : `el ${abreviarUnidad(it.unidad)}`);

function LineaDeBoleta({ item: it }: { item: Item }) {
  const p = precioDe(it);
  const r = subtotalDe(it);
  return (
    <div className={`${css.linea} ${p.unitario === null ? css.falta : ""}`}>
      <span className={css.cantidad}>{conUnidad(it.cantidad, it.unidad)}</span>
      <span className={css.nombre}>{nombreDeProducto(it.descripcion)}<small>{p.unitario === null ? "Sin precio" : `${pesosCortos(p.unitario)} ${porUnidad(it)}${deDonde(it, p.margen)}`}</small></span>
      <span className={css.importe}>{r ? pesosCortos(r.valor) : "—"}</span>
    </div>
  );
}
