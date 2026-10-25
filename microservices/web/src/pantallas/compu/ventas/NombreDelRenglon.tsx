import type { Item } from "../../../negocio/ventas";
import { nombreDeProducto } from "../../../formato";
import { detalleDe } from "./detalle";
import { StockDelProducto } from "./StockDelProducto";
import css from "./NombreDelRenglon.module.css";

// El nombre del producto, con marca, proveedor y stock; en un ítem libre, la caja para escribirlo.
type Props = { item: Item; stock: number | undefined; alCambiar: (c: Partial<Item>) => void; alIrALaCantidad: () => void };

export function NombreDelRenglon({ item: it, stock, alCambiar, alIrALaCantidad }: Props) {
  const producto = it.producto;
  if (!producto) {
    return (
      <div className={css.nombre}>
        <input className="entrada" value={it.descripcion} placeholder="¿Qué se lleva?" aria-label="Descripción del ítem libre" onChange={(e) => alCambiar({ descripcion: e.target.value })} data-testid="descripcion-libre" />
        <div className="detalle">Ítem libre: no está en ninguna lista</div>
      </div>
    );
  }
  const detalle = detalleDe(producto);
  return (
    <div className={css.nombre}>
      <button type="button" className="nombre" data-principal onClick={alIrALaCantidad}>{nombreDeProducto(it.descripcion)}</button>
      <div className="detalle">{detalle}{detalle ? " · " : ""}<StockDelProducto stock={stock} unidad={it.unidad} pide={it.cantidad} alerta /></div>
    </div>
  );
}
