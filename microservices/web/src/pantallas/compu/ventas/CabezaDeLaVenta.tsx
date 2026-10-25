import type { Item } from "../../../negocio/ventas";
import { precioDe } from "../../../negocio/ventas";
import { useRueda } from "../../../plataforma/animacion";
import { Boton } from "../base/ui";
import css from "./CabezaDeLaVenta.module.css";

// «Esta venta», cuántos productos y cuántos precios faltan (al lado de la cuenta y no en la barra
// del cobro, decisión 126). Con la venta vacía no hay nada que anotar ni vaciar: no se muestran.
export function CabezaDeLaVenta({ items, alNoLlevo, alVaciar }: { items: Item[]; alNoLlevo: () => void; alVaciar: () => void }) {
  const rueda = useRueda<HTMLSpanElement>(items.length);
  const faltan = items.filter((i) => precioDe(i).unitario === null).length;
  return (
    <div className={css.cab} data-testid="titulo-venta">
      <h2>Esta venta</h2><span className={css.cuenta}><span className="anim-rueda-valor" ref={rueda}>{items.length}</span> {items.length === 1 ? "producto" : "productos"}</span>
      {faltan > 0 && <span className={`${css.cuenta} ${css.falta}`} data-testid="faltan-precios">Falta{faltan > 1 ? `n ${faltan} precios` : " 1 precio"}</span>}
      <span className="crece" />
      {items.length > 0 && <>
        <Boton tam="chico" icono="prohibido" className={css.fantasma} onClick={alNoLlevo} aria-keyshortcuts="F4" data-testid="no-llevo">No llevó <kbd className="tecla">F4</kbd></Boton>
        <Boton tam="chico" icono="basura" className={css.fantasma} onClick={alVaciar} data-testid="vaciar-venta">Vaciar</Boton>
      </>}
    </div>
  );
}
