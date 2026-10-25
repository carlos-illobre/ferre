import { urlDeFoto } from "../../../negocio/catalogo";
import { conUnidad } from "../../../negocio/catalogo";
import type { VentaDelDia } from "../../../negocio/ventas";
import { pesosCortos } from "../../../formato";
import { Icono } from "../componentes/base";
import css from "./VentasDelDia.module.css";

// Mirando la venta: cada producto con su foto, cuánto, a cuánto y lo que ya volvió; el total y, si
// se anuló, que el stock volvió.
type Renglon = VentaDelDia["items"][number];
const subtotal = (i: Renglon) => i.subtotal ?? Number(i.cantidad) * Number(i.precio_unitario);

export function ProductosDeLaVenta({ venta: v, alListo }: { venta: VentaDelDia; alListo: () => void }) {
  const anulada = v.estado === "anulada";
  return (
    <>
      <div className="an-items" data-testid="detalle-venta">{v.items.map((i, n) => <Producto key={n} renglon={i} />)}</div>
      <div className={css.hojaTotal}><span>Total</span><b className="importe" style={{ textDecoration: anulada ? "line-through" : undefined }}>{pesosCortos(v.total)}</b></div>
      {anulada && <div className={css.hojaAnulada}><Icono nombre="prohibido" tam={18} />Anulada. El stock volvió; la venta queda a la vista.</div>}
      <button type="button" className="boton tinta" onClick={alListo}>Listo</button>
    </>
  );
}

function Producto({ renglon: i }: { renglon: Renglon }) {
  const foto = urlDeFoto(i.foto_url);
  const volvio = Number(i.devuelto ?? 0) > 0 ? ` · volvieron ${conUnidad(i.devuelto!, i.unidad)}` : "";
  return (
    <div className="an-item">
      <span className="an-foto">{foto ? <img src={foto} alt="" /> : <Icono nombre="imagen" tam={18} />}</span>
      <span><b>{conUnidad(i.cantidad, i.unidad)} {i.descripcion}</b><small>{pesosCortos(i.precio_unitario)} c/u{volvio}</small></span>
      <span className="an-subtotal">{pesosCortos(subtotal(i))}</span>
    </div>
  );
}
