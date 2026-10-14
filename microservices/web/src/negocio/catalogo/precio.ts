import { esMargenBoton, precioDeVenta } from "@ferre/calculo-de-precios";
import type { Producto } from "../../producto";

// El precio de un producto, una sola vez para todas las pantallas (RNF-60): costo de la
// lista × margen elegido × IVA, con sus pasos para explicarlo. Sin costo o sin margen no hay precio.
// (En la etapa 4 del reordenamiento lo calcula el servidor; acá queda solo lo que se muestra.)
export const IVA_SI_NO_SE_SABE = 0.21;

export function precioDelProducto(p: Producto) {
  const costo = p.costo_neto === null ? null : Number(p.costo_neto);
  const iva = p.iva === null ? IVA_SI_NO_SE_SABE : Number(p.iva);
  const calculo = costo !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: costo, margen: p.margen_elegido, iva }) : null;
  return { costo, iva, calculo, valor: calculo?.valor ?? null };
}

// El margen elegido cuando no es uno de los cinco botones: el que se tipeó a mano.
export const margenAMano = (p: Producto): number | null => (p.margen_elegido !== null && !esMargenBoton(p.margen_elegido) ? p.margen_elegido : null);

// «Otro margen» tal como se tipea: un porcentaje entero mayor que cero. Si no, `null`.
export function otroMargen(texto: string): number | null {
  const v = Math.round(Number(texto.trim()));
  return texto.trim() !== "" && Number.isFinite(v) && v > 0 ? v : null;
}
