import { conCantidad, conPrecio, subtotalesDelRenglon, type RenglonCorregido as Renglon } from "../../../negocio/ventas";
import { abreviarUnidad, conUnidad } from "../../../negocio/catalogo";
import { nombreDeProducto, numero, pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Icono, Pastilla } from "../base/ui";
import { MiniaturaDeProducto } from "./MiniaturaDeProducto";
import { PrecioEditable } from "./PrecioEditable";
import css from "./VentasDelDia.module.css";

// Un renglón de la venta que se corrige: − cantidad +, × el precio (se toca para cambiarlo) y el
// tacho; si cambió, el subtotal de antes tachado. Lo que ya volvió por un cambio no se puede quitar.
const t = TEXTOS.hoy;

export function RenglonCorregido({ r, alCambiar, alQuitar }: { r: Renglon; alCambiar: (r: Renglon) => void; alQuitar: () => void }) {
  const cambioPrecio = Boolean(r.antes) && r.antes!.precio_unitario !== r.precio_unitario;
  return (
    <li className="rv ed" data-testid="renglon-corregido">
      <MiniaturaDeProducto url={r.foto_url} />
      <span className="nom-det"><b>{nombreDeProducto(r.descripcion)}{!r.antes && <Pastilla tipo="ok" sinPunto>nuevo</Pastilla>}</b></span>
      <SubtotalCorregido r={r} />
      <span className="editar">
        <Cantidad r={r} alCambiar={alCambiar} />
        ×
        <PrecioEditable valor={r.precio_unitario} cambio={cambioPrecio} etiqueta={`Precio de ${r.descripcion}`} alCambiar={(p) => alCambiar(conPrecio(r, p))} />
        <button type="button" className={css.tacho} aria-label={`${t.quitarRenglon.largo} ${r.descripcion}`} title={r.devuelto > 0 ? "Ya volvió en parte por un cambio: no se puede quitar" : t.quitarRenglon.largo} disabled={r.devuelto > 0} onClick={alQuitar} data-testid="quitar"><Icono nombre="basura" tam={16} /></button>
      </span>
    </li>
  );
}

function SubtotalCorregido({ r }: { r: Renglon }) {
  const st = subtotalesDelRenglon(r);
  return (
    <span className="st importe">
      {st.antes !== null && <s className="viejo">{pesosCortos(st.antes)}</s>}
      {pesosCortos(st.ahora)}
    </span>
  );
}

function Cantidad({ r, alCambiar }: { r: Renglon; alCambiar: (r: Renglon) => void }) {
  const paso = Number.isInteger(r.cantidad) ? 1 : 0.5;
  const cambio = Boolean(r.antes) && r.antes!.cantidad !== r.cantidad;
  return (
    <span className={`${css.cantidad} ${cambio ? "cambio" : ""}`}>
      <button type="button" aria-label={`Uno menos de ${r.descripcion}`} disabled={r.cantidad - paso < Math.max(r.devuelto, paso) - 1e-9} onClick={() => alCambiar(conCantidad(r, r.cantidad - paso))} data-testid="menos"><Icono nombre="menos" tam={16} /></button>
      <span className="n" data-testid="cantidad">{numero(r.cantidad)}</span><span className="u" data-testid="unidad-cantidad">{abreviarUnidad(r.unidad || "unidad")}</span>
      <button type="button" aria-label={`Uno más de ${r.descripcion}`} onClick={() => alCambiar(conCantidad(r, r.cantidad + paso))} data-testid="mas"><Icono nombre="mas" tam={16} /></button>
    </span>
  );
}

// Un renglón que se quitó: tachado, con «Volver a poner».
export function RenglonQuitado({ r, alVolver }: { r: Renglon; alVolver: () => void }) {
  return (
    <li className="rv quitado" data-testid="renglon-quitado">
      <MiniaturaDeProducto url={r.foto_url} />
      <span className="nom-det"><s>{nombreDeProducto(r.descripcion)}</s><small>{conUnidad(r.antes!.cantidad, r.unidad)} × {pesosCortos(r.antes!.precio_unitario)} · quitado</small></span>
      <button type="button" className="enlace" onClick={alVolver}>Volver a poner</button>
    </li>
  );
}
