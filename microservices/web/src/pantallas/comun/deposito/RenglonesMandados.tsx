import { cantidadConUnidad, pluralDelPedido, totalDelPedido, type Pedido, type RenglonDelPedido } from "../../../negocio/deposito";
import { pesos } from "./formato-de-pedidos";
import css from "./Pedidos.module.css";

// Lo pedido de cada producto y, si ya llegó algo, cuánto llegó y cuánto falta; al pie, el estimado.
export function RenglonesMandados({ p, encarga, renglones }: { p: Pedido; encarga: boolean; renglones: RenglonDelPedido[] }) {
  const conLlegadas = p.estado !== "enviado" && p.estado !== "cancelado";
  return (
    <div className={css.tarjeta}>
      <ul className={css.renglones}>
        {p.items.map((i) => {
          const pedido = Number(i.cantidad), llego = Number(i.recibido), resta = Math.max(0, Math.round((pedido - llego) * 1000) / 1000);
          return (
            <li key={i.producto_id} className={`${css.renglon} mandado`} data-testid="renglon-pedido">
              <span className={css.quien}><strong>{i.descripcion}</strong><span className={css.detalle}>{[i.marca, i.codigo_proveedor].filter(Boolean).join(" · ")}</span></span>
              <span className={css.cuentas}>
                <span>Pedido <strong>{cantidadConUnidad(pedido, i.unidad)}</strong></span>
                {conLlegadas && <span>Llegó <strong>{cantidadConUnidad(llego, i.unidad)}</strong></span>}
                {resta > 0 && conLlegadas && <span className={css.resta}>Falta <strong>{cantidadConUnidad(resta, i.unidad)}</strong></span>}
              </span>
            </li>
          );
        })}
      </ul>
      {encarga && <div className={css.pie}><span className={css.detalle}>{pluralDelPedido(p.items.length, "renglón", "renglones")}</span><span>Total estimado <strong className={`${css.importe} ${css.total}`}>{pesos(totalDelPedido(renglones))}</strong></span></div>}
    </div>
  );
}
