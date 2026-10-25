import type { Item } from "../../../negocio/ventas";
import { soloDigitos } from "./soloDigitos";
import css from "./PrecioAMano.module.css";

// La caja del precio de un ítem libre, a la vista en el renglón. Vale solo para esta venta.
export function PrecioAMano({ item, alCambiar, falta }: { item: Item; alCambiar: (c: Partial<Item>) => void; falta: boolean }) {
  return (
    <label className={`con-prefijo ${css.caja} ${falta ? "falta" : ""}`} title="Un precio distinto solo para esta venta. No cambia el producto.">
      <span aria-hidden="true">$</span>
      <input inputMode="numeric" placeholder="a mano" aria-label={`Precio a mano de ${item.descripcion || "este ítem"}, solo para esta venta`} autoFocus={item.precioManual === null}
        value={item.precioManual ?? ""} onChange={(e) => alCambiar({ precioManual: soloDigitos(e.target.value) })} data-testid="precio-manual" />
    </label>
  );
}
