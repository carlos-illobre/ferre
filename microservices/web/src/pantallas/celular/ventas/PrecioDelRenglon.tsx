import { precioDe, type Item } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import { useVeCostos } from "../../Costos";
import { POR_UNIDAD } from "./por-unidad";
import { PrecioAMano } from "./PrecioAMano";
import css from "./Renglon.module.css";

// El precio por unidad en su pastilla. Quien ve costos (o con un precio a mano) la toca para ver
// cómo se calculó. Sin precio, lo que falta; un ítem libre, la caja para ponerlo.
type Props = { item: Item; alCambiar: (c: Partial<Item>) => void; alExplicar: () => void };

export function PrecioDelRenglon({ item: it, alCambiar, alExplicar }: Props) {
  const p = precioDe(it);
  const veCostos = useVeCostos();
  if (p.unitario === null && !it.producto) return <PrecioAMano item={it} alCambiar={alCambiar} placeholder="precio" autoFocus />;
  if (p.unitario === null) return <SinPrecio costo={veCostos ? p.costo : null} />;
  const contenido = <><b>{pesosCortos(p.unitario)}</b><small>{it.precioManual !== null ? "a mano" : POR_UNIDAD[it.unidad]}</small></>;
  if (!veCostos && it.precioManual === null) return <span className={css.precio}>{contenido}</span>;
  return <button type="button" className={css.precio} onClick={alExplicar} aria-label={`Cómo se calculó ${pesosCortos(p.unitario)}`} data-testid="precio">{contenido}</button>;
}

// Sin precio: el costo (para quien lo ve) o que falta elegir el margen.
function SinPrecio({ costo }: { costo: number | null }) {
  return <span className={`${css.precio} ${css.falta}`} data-testid="sin-precio"><b>Sin precio</b><small>{costo !== null ? `costo ${pesosCortos(costo)}` : "elegí margen"}</small></span>;
}
