import { esMargenBoton, preciosDeUnProducto, type Explicado } from "../precios/vista-previa";
import type { Producto } from "../../datos/almacenamiento";

// El precio de un producto, una sola vez para todas las pantallas (RNF-60). Lo calcula el
// servidor y llega con el producto (ADR-018). La cuenta del front (la vista previa) se usa solo
// cuando el precio del servidor no corresponde al margen que hay ahora: recién cambiado acá y
// todavía sin confirmar, o un catálogo guardado de antes. Las dos cuentas son idénticas.
export { IVA_SI_NO_SE_SABE } from "../precios/vista-previa";

export function precioDelProducto(p: Producto): { costo: number | null; iva: number; calculo: Explicado | null; valor: number | null; delServidor: boolean } {
  const vista = preciosDeUnProducto(p);
  if (p.precio != null && p.margen_del_precio === p.margen_elegido) {
    return { costo: vista.costo, iva: vista.iva, calculo: { valor: p.precio, pasos: p.explicacion_precio ?? vista.precio?.pasos ?? [] }, valor: p.precio, delServidor: true };
  }
  return { costo: vista.costo, iva: vista.iva, calculo: vista.precio, valor: vista.precio?.valor ?? null, delServidor: false };
}

// El margen elegido cuando no es uno de los cinco botones: el que se tipeó a mano.
export const margenAMano = (p: Producto): number | null => (p.margen_elegido !== null && !esMargenBoton(p.margen_elegido) ? p.margen_elegido : null);

// «Otro margen» tal como se tipea: un porcentaje entero mayor que cero. Si no, `null`.
export function otroMargen(texto: string): number | null {
  const v = Math.round(Number(texto.trim()));
  return texto.trim() !== "" && Number.isFinite(v) && v > 0 ? v : null;
}
