import { useRef } from "react";
import { enteras, type Unidad } from "../../../negocio/catalogo";
import { precioDe, type Item } from "../../../negocio/ventas";
import { SelectorDeUnidad } from "../../comun/SelectorDeUnidad";
import { Contador, FotoProducto, Icono } from "../base/ui";
import { FilaDelPrecio } from "./FilaDelPrecio";
import { NombreDelRenglon } from "./NombreDelRenglon";
import { SubtotalDelRenglon } from "./SubtotalDelRenglon";
import { useAnimacionDelRenglon } from "./useAnimacionDelRenglon";
import css from "./RenglonDeVenta.module.css";

// Cada renglón, una tarjeta de la v2 (decisión 122). Arriba la foto, el nombre con marca,
// proveedor y stock, la cantidad con su unidad, el total del renglón y el tacho (a la derecha del
// precio, decisión 132); abajo el costo, el margen y el precio por unidad (o a mano).
export type PropsDeRenglon = {
  item: Item; stock: number | undefined; marcar: boolean; elegido: boolean; llegado: boolean; entrada: number;
  alCambiar: (c: Partial<Item>) => void; alQuitar: () => void; alElegirMargen: (m: number) => void; alCambiarUnidad: (u: Unidad) => void;
  alSubirFoto?: (archivo: File) => Promise<void>; alElegir: () => void;
};

export function RenglonDeVenta(r: PropsDeRenglon) {
  const { item: it } = r;
  const raiz = useRef<HTMLLIElement>(null);
  useAnimacionDelRenglon(raiz, r.entrada, r.llegado, r.marcar);
  const sinPrecio = precioDe(it).unitario === null;
  const clases = [css.item, sinPrecio && css.sinPrecio, sinPrecio && r.marcar && css.marcada, r.elegido && css.elegido].filter(Boolean).join(" ");
  // Enter sobre el renglón marcado pone el cursor en su cantidad.
  const aLaCantidad = () => raiz.current?.querySelector<HTMLInputElement>("[data-testid='cantidad']")?.focus();
  return (
    <li ref={raiz} className={clases} data-testid="item" data-clave={it.clave} onMouseDown={r.alElegir} onFocusCapture={r.alElegir}>
      {r.llegado && <span className={css.llego} role="status" data-testid="llego-del-celular"><Icono nombre="celular" tam={16} />Llegó del celular</span>}
      <div className={css.foto}><FotoDelRenglon item={it} alSubir={r.alSubirFoto} /></div>
      <NombreDelRenglon item={it} stock={r.stock} alCambiar={r.alCambiar} alIrALaCantidad={aLaCantidad} />
      <Contador valor={it.cantidad} entera={enteras(it.unidad)} alCambiar={(v) => r.alCambiar({ cantidad: v })} etiqueta={`Cantidad de ${it.descripcion}`}><SelectorDeUnidad unidad={it.unidad} alCambiar={r.alCambiarUnidad} /></Contador>
      <SubtotalDelRenglon item={it} />
      <button type="button" className={css.tacho} title="Quitar de la venta" aria-label={`Quitar ${it.descripcion || "el ítem"}`} onClick={r.alQuitar} data-testid="quitar-renglon"><Icono nombre="basura" tam={20} /></button>
      <FilaDelPrecio item={it} alCambiar={r.alCambiar} alElegirMargen={r.alElegirMargen} />
    </li>
  );
}

// La foto del producto, que se puede cambiar ahí mismo; un ítem libre muestra el lápiz.
function FotoDelRenglon({ item: it, alSubir }: { item: Item; alSubir?: (archivo: File) => Promise<void> }) {
  if (!it.producto) return <span className="miniatura"><Icono nombre="editar" tam={18} grosor={1.6} /></span>;
  return <FotoProducto id={it.producto.id} url={it.producto.foto_url ?? null} descripcion={it.descripcion} alSubir={alSubir} />;
}
