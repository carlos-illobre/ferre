import type { Item } from "../../../negocio/ventas";
import css from "./PrecioAMano.module.css";

// Un precio escrito a mano, solo para esta venta: el «$» y la caja.
// `dentroDeEtiqueta`: ya está en una etiqueta (la de la hoja del renglón), que no se anida.
type Props = { item: Item; alCambiar: (c: Partial<Item>) => void; placeholder: string; autoFocus?: boolean; clase?: string; dentroDeEtiqueta?: boolean };
const comoPrecio = (texto: string) => (texto === "" ? null : Number(texto.replace(/[^\d]/g, "")));

export function PrecioAMano({ item, alCambiar, placeholder, autoFocus, clase = "", dentroDeEtiqueta }: Props) {
  const Caja = dentroDeEtiqueta ? "span" : "label";
  return (
    <Caja className={`${css.caja} ${clase}`}>
      <span>$</span>
      <input inputMode="numeric" placeholder={placeholder} autoFocus={autoFocus} value={item.precioManual ?? ""} onChange={(e) => alCambiar({ precioManual: comoPrecio(e.target.value) })} data-testid="precio-manual" />
    </Caja>
  );
}
