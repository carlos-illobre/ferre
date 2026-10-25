import { cuentaDelRenglon, type Item } from "../../../negocio/ventas";
import { nombreDeProducto, pesosCortos } from "../../../negocio/formato";
import { useVeCostos } from "../../Costos";
import { Aviso } from "../base/ui";
import css from "./DeDondeSale.module.css";

// «De dónde sale» (de la v3): la cuenta del renglón elegido, paso a paso, siempre a la vista. Como
// la maqueta (decisión 127): cada paso con su importe a la derecha, separados por una línea punteada.
export function DeDondeSale({ item }: { item: Item | null }) {
  const veCostos = useVeCostos();
  if (!item) return <p className="detalle">Elegí un renglón para ver de dónde sale su precio.</p>;
  const cuenta = cuentaDelRenglon(item, veCostos);
  if (!cuenta) return <><p className="detalle">{nombreDeProducto(item.descripcion)}</p><Aviso tipo="alerta">Todavía no tiene precio: elegí el margen o ponelo a mano.</Aviso></>;
  return (
    <div data-testid="de-donde-sale">
      <p className="detalle">{nombreDeProducto(item.descripcion)}, el renglón elegido</p>
      <dl className={css.filas}>{cuenta.filas.map((f, i) => <div key={i}><dt>{f.texto}</dt><dd>{f.valor}</dd></div>)}</dl>
      <div className={css.total}><span>Total del renglón</span><strong className="importe">{pesosCortos(cuenta.total)}</strong></div>
    </div>
  );
}
