import { abreviarUnidad } from "../../../negocio/catalogo";
import { Pastilla, numero } from "../base/ui";

// El stock en su pastilla. Sin movimientos de stock, no hay: «sin stock», como la maqueta. Con
// `pide`, si lo pedido no alcanza lo dice.
export function StockDelProducto({ stock, unidad, pide, alerta = false }: { stock: number | undefined; unidad: string; pide?: number; alerta?: boolean }) {
  const hay = stock ?? 0;
  if (hay <= 0) return <Pastilla tipo={alerta ? "alerta" : undefined} sinPunto>sin stock</Pastilla>;
  if (pide !== undefined && pide > hay) return <Pastilla tipo="alerta" sinPunto>{`hay ${numero(hay)}: no alcanza`}</Pastilla>;
  return <Pastilla tipo="ok" sinPunto>{numero(hay)} {abreviarUnidad(unidad)}</Pastilla>;
}
