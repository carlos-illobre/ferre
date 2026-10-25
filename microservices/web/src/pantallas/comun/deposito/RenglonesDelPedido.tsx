import { pluralDelPedido, type ProveedorDelPedido, type useBorrador } from "../../../negocio/deposito";
import { CantidadDelPedido } from "./CantidadDelPedido";
import { pesos } from "./formato-de-pedidos";
import css from "./Pedidos.module.css";

// Los renglones del borrador, con su cantidad, el estimado y quitar; al pie, el total estimado.
type Props = { b: ReturnType<typeof useBorrador>; proveedor: ProveedorDelPedido; total: number };

export function RenglonesDelPedido({ b, proveedor, total }: Props) {
  if (b.renglones.length === 0) return <p className={css.vacio} data-testid="pedido-vacio">El pedido está vacío. Buscá cada producto y tocalo (o Enter) para agregarlo.</p>;
  return (
    <div className={css.tarjeta}>
      <ul className={css.renglones}>
        {b.renglones.map((r) => (
          <li key={r.producto_id} className={css.renglon} data-testid="renglon-pedido">
            <span className={css.quien}><strong>{r.descripcion}</strong><span className={css.detalle}>{[r.marca, r.codigo, r.costo === null ? "sin costo de lista" : `${pesos(r.costo)} c/u`].filter(Boolean).join(" · ")}</span></span>
            <CantidadDelPedido valor={r.cantidad} unidad={r.unidad} nombre={r.descripcion} alCambiar={(c) => b.cambiar(r.producto_id, c)} />
            <strong className={`${css.importe} ${css.estimado}`}>{r.costo === null ? "—" : pesos(r.cantidad * r.costo)}</strong>
            <button type="button" className={css.quitar} onClick={() => b.quitar(r.producto_id)} aria-label={`Quitar ${r.descripcion} del pedido`} data-testid="quitar-renglon">✕</button>
          </li>
        ))}
      </ul>
      <div className={css.pie}><span className={css.detalle}>{pluralDelPedido(b.renglones.length, "renglón", "renglones")} · el costo sale de la última lista de {proveedor.nombre}</span>
        <span>Total estimado <strong className={`${css.importe} ${css.total}`} data-testid="total-estimado">{pesos(total)}</strong></span></div>
    </div>
  );
}
