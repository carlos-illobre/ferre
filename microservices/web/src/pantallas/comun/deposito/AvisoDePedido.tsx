import type { Pedido } from "../../../negocio/deposito";
import { dia } from "./formato-de-pedidos";
import css from "./Pedidos.module.css";

// En el ingreso que viene de un pedido: de qué pedido es la mercadería y que está cargado lo que falta llegar.
export function AvisoDePedido({ pedido, error }: { pedido: Pedido | null; error: string | null }) {
  if (error) return <p className={css.error} role="alert">{error}</p>;
  if (!pedido) return null;
  return <p className={css.aviso} role="status" data-testid="ingreso-de-pedido">Mercadería del pedido a {pedido.proveedor}{pedido.enviado_en ? ` del ${dia(pedido.enviado_en)}` : ""}. Está cargado lo que falta llegar: corregí lo que haya llegado distinto y quitá lo que no vino.</p>;
}
