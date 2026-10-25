import { pesosCortos } from "../../formato";
import { conUnidad } from "../catalogo";
import type { CambioApartado } from "@servidor/apartados";
import { cantidadDe, cuerpo, importeDe, medioDe, productoDe, unidadDelProducto, unidadDelRecurso, type Ajuste, type CambioDeProducto, type NoLlevo, type UnidadDe, type Venta } from "./cuerpos";
import { diaYHora, hora, mismoDia } from "./fechas";

// Un cambio contado con las palabras del negocio: qué es, lo principal y su detalle.
export type Descripcion = { titulo: string; resumen: string | null; renglones: string[]; cuando: string };
type Describe = (c: CambioApartado, unidadDe: UnidadDe) => Omit<Descripcion, "cuando"> & { verbo: string | null };

const venta: Describe = (c, unidadDe) => {
  const v = cuerpo<Venta>(c);
  const items = v.items ?? [];
  const total = items.reduce((s, i) => s + importeDe(i), 0);
  return { titulo: "Venta", resumen: [pesosCortos(total), medioDe(v)].filter(Boolean).join(" · "), renglones: items.map((i) => `${cantidadDe(i, unidadDe)} ${i.descripcion ?? "sin descripción"} — ${pesosCortos(importeDe(i))}`), verbo: "Cobrada" };
};
const consulta: Describe = (c) => {
  const n = cuerpo<NoLlevo>(c);
  return { titulo: "No llevó", resumen: n.motivo ?? null, renglones: (n.items ?? []).map((i) => [i.descripcion ?? "sin descripción", i.precio_ofrecido ? `ofrecido a ${pesosCortos(i.precio_ofrecido)}` : null].filter(Boolean).join(" · ")), verbo: "Anotado" };
};
const ajuste: Describe = (c, unidadDe) => {
  const a = cuerpo<Ajuste>(c);
  return { titulo: "Ajuste de stock", resumen: productoDe(c), renglones: [[`Hay ${conUnidad(a.cantidad_real ?? 0, unidadDelRecurso(c, unidadDe))}`, a.motivo ? `«${a.motivo}»` : null].filter(Boolean).join(" · ")], verbo: null };
};
const cambioDeProducto: Describe = (c) => {
  const p = cuerpo<CambioDeProducto>(c);
  const renglones = [
    "margen_elegido" in p ? (p.margen_elegido === null ? "Sin margen" : `Margen ${p.margen_elegido} %`) : null,
    p.unidad ? `Se vende por ${p.unidad}` : null,
    "codigo_barras" in p ? (p.codigo_barras ? `Código de barras ${p.codigo_barras}` : "Sin código de barras") : null,
    "proveedor_preferido_id" in p ? "Otro proveedor preferido" : null,
    "foto_url" in p ? "Otra foto" : null,
  ].filter((r): r is string => Boolean(r));
  return { titulo: "Cambio de producto", resumen: productoDe(c), renglones, verbo: null };
};
const conteo: Describe = (c, unidadDe) => {
  const r = cuerpo<{ cantidad?: number }>(c);
  return { titulo: "Conteo", resumen: productoDe(c), renglones: [c.metodo === "DELETE" ? "Sacó el renglón del conteo" : `Contó ${conUnidad(r.cantidad ?? 0, unidadDelRecurso(c, unidadDe))}`], verbo: null };
};
const DESCRIPCIONES: Record<string, Describe> = { venta, consulta, "stock.ajuste": ajuste, "producto.cambio": cambioDeProducto, "conteo.renglon": conteo };

export function describir(c: CambioApartado, unidadDe: UnidadDe = unidadDelProducto): Descripcion {
  const llego = mismoDia(c.hecho_en, c.llegado_en) ? `llegó a las ${hora(c.llegado_en)}` : `llegó el ${diaYHora(c.llegado_en)}`;
  const { verbo, ...d } = DESCRIPCIONES[c.tipo]?.(c, unidadDe) ?? { titulo: c.tipo, resumen: null, renglones: [], verbo: null };
  return { ...d, cuando: `${verbo ? `${verbo} el` : "El"} ${diaYHora(c.hecho_en)} · ${llego}` };
}
