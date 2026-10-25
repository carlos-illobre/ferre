import { enteras } from "../catalogo";
import type { Item } from "./venta-en-curso";

// + y − cambian la cantidad de a uno por unidad y de a medio en lo que se pesa o se mide; nunca
// llega a cero (para eso está quitar).
export function otraCantidad(item: Item, signo: 1 | -1): number | null {
  const paso = enteras(item.unidad) ? 1 : 0.5;
  const valor = Math.round((item.cantidad + signo * paso) * 10) / 10;
  return valor > 0 ? valor : null;
}
