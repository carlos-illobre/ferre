import { productoEnMemoria } from "../catalogo";
import { conUnidad } from "../catalogo";
import { nombreDeMedio } from "../ventas";
import type { CambioApartado } from "@acceso/apartados";

// Lo que trae cada cambio apartado, según su tipo, y lo que se saca de ahí.
export type Venta = { medio_pago?: string; items?: { producto_id?: string | null; descripcion?: string; cantidad?: number; precio_unitario?: number }[] };
export type NoLlevo = { items?: { descripcion?: string; precio_ofrecido?: number | null }[]; motivo?: string };
export type Ajuste = { cantidad_real?: number; motivo?: string };
export type CambioDeProducto = { margen_elegido?: number | null; unidad?: string; codigo_barras?: string | null; proveedor_preferido_id?: string | null; foto_url?: string | null };
export type UnidadDe = (productoId?: string | null) => string | undefined;

// La unidad del producto, del catálogo bajado; sin producto o sin catálogo, «un.» (decisión 144).
export const unidadDelProducto: UnidadDe = (id) => (id ? productoEnMemoria(id)?.unidad : undefined);
export const unidadDelRecurso = (c: CambioApartado, unidadDe: UnidadDe) => unidadDe(c.ruta.split("/").pop());
export const productoDe = (c: CambioApartado) => c.producto ?? "un producto que ya no está";
export const cuerpo = <T>(c: CambioApartado) => (c.cuerpo ?? {}) as T;

export const importeDe = (i: { cantidad?: number; precio_unitario?: number }) => Number(i.cantidad ?? 0) * Number(i.precio_unitario ?? 0);
export const cantidadDe = (i: { producto_id?: string | null; cantidad?: number }, unidadDe: UnidadDe) => conUnidad(i.cantidad ?? 0, unidadDe(i.producto_id));
export const medioDe = (v: Venta) => (v.medio_pago ? nombreDeMedio(v.medio_pago) : null);
export const conMinuscula = (r: string) => `${r.charAt(0).toLowerCase()}${r.slice(1)}`;

// El nombre sin la medida ni el envase, para que entre en una línea: «Látex interior mate blanco 4 L» → «Látex interior».
const CONECTORES = new Set(["de", "del", "con", "para", "x", "y", "a", "en", "por"]);
export function nombreCorto(descripcion: string): string {
  const palabras: string[] = [];
  let importantes = 0;
  for (const p of descripcion.split(/\s+/)) { palabras.push(p); if (!CONECTORES.has(p.toLowerCase()) && ++importantes === 2) break; }
  return palabras.join(" ");
}
