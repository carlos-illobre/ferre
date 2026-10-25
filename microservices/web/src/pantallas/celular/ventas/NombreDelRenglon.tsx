import { abreviarUnidad } from "../../../negocio/catalogo";
import type { Item } from "../../../negocio/ventas";
import { nombreDeProducto } from "../../../negocio/formato";
import css from "./Renglon.module.css";

// El nombre con la marca y el stock, que abre la hoja del renglón; en un ítem libre, la caja para escribirlo.
const num = (n: number) => n.toLocaleString("es-AR");
type Props = { item: Item; stock: number | undefined; alCambiar: (c: Partial<Item>) => void; alAbrir: () => void };

export function NombreDelRenglon({ item: it, stock, alCambiar, alAbrir }: Props) {
  if (!it.producto) {
    return (
      <span className={css.nombre}>
        <input className="linea-editable" value={it.descripcion} placeholder="¿Qué se lleva?" onChange={(e) => alCambiar({ descripcion: e.target.value })} data-testid="descripcion-libre" />
        <small>Ítem libre</small>
      </span>
    );
  }
  return (
    <button type="button" className={css.nombre} onClick={alAbrir} data-testid="abrir-renglon">
      <b>{nombreDeProducto(it.descripcion)}</b>
      <small>{[it.producto.marca, stock !== undefined ? `${num(stock)} ${abreviarUnidad(it.unidad)}` : null].filter(Boolean).join(" · ")}</small>
    </button>
  );
}
