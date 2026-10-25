import { conCantidad, conPrecio, subtotalCorregido, type RenglonCorregido as Renglon } from "../../../negocio/ventas";
import { nombreDeProducto, pesosCortos } from "../../../formato";
import { Icono } from "../componentes/base";
import { FotoChica } from "./FotoChica";
import { MasMenos } from "./MasMenos";
import { PrecioTocable } from "./PrecioTocable";
import css from "./VentasDelDia.module.css";

// Un renglón de la venta que se corrige: − cantidad +, el precio (se toca para cambiarlo) y el
// tacho; si cambió, el subtotal de antes tachado. Lo que ya volvió por un cambio no se puede quitar.
export function RenglonCorregido({ r, alCambiar, alQuitar }: { r: Renglon; alCambiar: (r: Renglon) => void; alQuitar: () => void }) {
  const cambioPrecio = Boolean(r.antes) && r.antes!.precio_unitario !== r.precio_unitario;
  return (
    <div className={css.renglon} data-testid="renglon-corregido">
      <FotoChica url={r.foto_url} />
      <span className={css.nom}><b>{nombreDeProducto(r.descripcion)}</b>
        <span className={css.ed}>
          <MasMenos valor={r.cantidad} min={Math.max(r.devuelto, Number.isInteger(r.cantidad) ? 1 : 0.5)} alCambiar={(n) => alCambiar(conCantidad(r, n))} unidad={r.unidad} etiqueta={r.descripcion} />
          <PrecioTocable valor={r.precio_unitario} cambio={cambioPrecio} alCambiar={(p) => alCambiar(conPrecio(r, p))} etiqueta={`Precio de ${r.descripcion}`} />
          <button type="button" className={css.tacho} aria-label={`Quitar ${r.descripcion}`} disabled={r.devuelto > 0} onClick={alQuitar} data-testid="quitar"><Icono nombre="basura" tam={18} /></button>
        </span>
      </span>
      <SubtotalCorregido r={r} />
    </div>
  );
}

function SubtotalCorregido({ r }: { r: Renglon }) {
  const cambio = r.antes && (r.antes.cantidad !== r.cantidad || r.antes.precio_unitario !== r.precio_unitario);
  return (
    <span className={`${css.sub} importe`}>
      {cambio && <s className={css.viejo}>{pesosCortos(subtotalCorregido({ cantidad: r.antes!.cantidad, precio_unitario: r.antes!.precio_unitario, margen_aplicado: r.margen_aplicado }))}</s>}
      {pesosCortos(subtotalCorregido(r))}
    </span>
  );
}

// Un renglón que se quitó: tachado, con «Volver a poner».
export function RenglonQuitado({ r, alVolver }: { r: Renglon; alVolver: () => void }) {
  return (
    <div className={`${css.renglon} quitado`} data-testid="renglon-quitado">
      <FotoChica url={r.foto_url} /><span className={css.nom}><s>{nombreDeProducto(r.descripcion)}</s><small>quitado</small></span>
      <button type="button" className="enlace" onClick={alVolver}>Volver a poner</button>
    </div>
  );
}
