import { api } from "../api";
import { consultas } from "../consultas";
import { pesosCortos } from "../formato";
import { useDelServidor } from "./del-servidor";
import { NOMBRE_DE_MEDIO } from "./ventas/venta";
import type { CambioApartado, CambiosParaRevisar } from "@servidor/apartados";

// Lo apartado de alguien a quien desactivaron (specs/014-cambios-apartados): lo que hizo sin
// conexión y no llegó al servidor. No cuenta para nada hasta que alguien con «Administrar
// usuarios» lo acepta; aceptado, queda a nombre de quien lo hizo. Una sola vez para el celular y
// la computadora: qué hay, cómo se cuenta cada cambio y cómo se decide.
export type { CambioApartado };
const CLAVE = ["apartados"] as const;

export function useParaRevisar(activo = true) {
  return useDelServidor<CambiosParaRevisar>(CLAVE, "/apartados", { activo });
}

// Aceptar o descartar uno. Si sale bien, la lista se vuelve a pedir y el cambio se va. Si no,
// el error dice por qué (lo dice el servidor: no se pudo aplicar, u otra persona ya lo decidió) y
// la lista no se vuelve a pedir: la tarjeta queda con el motivo a la vista hasta que se actualice.
export async function decidir(id: string, decision: "aceptar" | "descartar"): Promise<void> {
  await api(`/apartados/${id}/${decision}`, { method: "POST" });
  await consultas.invalidateQueries({ queryKey: CLAVE });
}

// De a una persona, en el orden en que llegaron sus cambios.
export type DeUnaPersona = { usuario_id: string; usuario: string; desactivado_en: string | null; dispositivo: string | null; cambios: CambioApartado[] };
export function porPersona(lista: CambioApartado[]): DeUnaPersona[] {
  const grupos = new Map<string, DeUnaPersona>();
  for (const c of lista) {
    const g = grupos.get(c.usuario_id) ?? { usuario_id: c.usuario_id, usuario: c.usuario, desactivado_en: c.desactivado_en, dispositivo: c.dispositivo, cambios: [] };
    g.cambios.push(c);
    grupos.set(c.usuario_id, g);
  }
  return [...grupos.values()];
}

// Un cambio contado con las palabras del negocio: qué es, lo principal y su detalle.
export type Descripcion = { titulo: string; resumen: string | null; renglones: string[]; cuando: string };
const numero = (n: unknown) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 3 });
const dosCifras = (n: number) => String(n).padStart(2, "0");
export const diaYHora = (iso: string) => { const d = new Date(iso); return `${dosCifras(d.getDate())}/${dosCifras(d.getMonth() + 1)} a las ${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`; };
const hora = (iso: string) => { const d = new Date(iso); return `${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`; };
const mismoDia = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

type Venta = { medio_pago?: string; items?: { descripcion?: string; cantidad?: number; precio_unitario?: number }[] };
type NoLlevo = { items?: { descripcion?: string; precio_ofrecido?: number | null }[]; motivo?: string };
type Ajuste = { cantidad_real?: number; motivo?: string };
type CambioDeProducto = { margen_elegido?: number | null; unidad?: string; codigo_barras?: string | null; proveedor_preferido_id?: string | null; foto_url?: string | null };

export function describir(c: CambioApartado): Descripcion {
  const llego = mismoDia(c.hecho_en, c.llegado_en) ? `llegó a las ${hora(c.llegado_en)}` : `llegó el ${diaYHora(c.llegado_en)}`;
  const cuando = (verbo: string | null) => `${verbo ? `${verbo} el` : "El"} ${diaYHora(c.hecho_en)} · ${llego}`;
  const producto = c.producto ?? "un producto que ya no está";
  if (c.tipo === "venta") {
    const v = (c.cuerpo ?? {}) as Venta;
    const items = v.items ?? [];
    const total = items.reduce((s, i) => s + Number(i.cantidad ?? 0) * Number(i.precio_unitario ?? 0), 0);
    const medio = v.medio_pago ? NOMBRE_DE_MEDIO[v.medio_pago as keyof typeof NOMBRE_DE_MEDIO] ?? v.medio_pago : null;
    return {
      titulo: "Venta", resumen: [pesosCortos(total), medio].filter(Boolean).join(" · "),
      renglones: items.map((i) => `${numero(i.cantidad)} × ${i.descripcion ?? "sin descripción"} — ${pesosCortos(Number(i.cantidad ?? 0) * Number(i.precio_unitario ?? 0))}`),
      cuando: cuando("Cobrada"),
    };
  }
  if (c.tipo === "consulta") {
    const n = (c.cuerpo ?? {}) as NoLlevo;
    return { titulo: "No llevó", resumen: n.motivo ?? null, renglones: (n.items ?? []).map((i) => [i.descripcion ?? "sin descripción", i.precio_ofrecido ? `ofrecido a ${pesosCortos(i.precio_ofrecido)}` : null].filter(Boolean).join(" · ")), cuando: cuando("Anotado") };
  }
  if (c.tipo === "stock.ajuste") {
    const a = (c.cuerpo ?? {}) as Ajuste;
    return { titulo: "Ajuste de stock", resumen: producto, renglones: [[`Hay ${numero(a.cantidad_real)}`, a.motivo ? `«${a.motivo}»` : null].filter(Boolean).join(" · ")], cuando: cuando(null) };
  }
  if (c.tipo === "producto.cambio") {
    const p = (c.cuerpo ?? {}) as CambioDeProducto;
    const renglones = [
      "margen_elegido" in p ? (p.margen_elegido === null ? "Sin margen" : `Margen ${p.margen_elegido} %`) : null,
      p.unidad ? `Se vende por ${p.unidad}` : null,
      "codigo_barras" in p ? (p.codigo_barras ? `Código de barras ${p.codigo_barras}` : "Sin código de barras") : null,
      "proveedor_preferido_id" in p ? "Otro proveedor preferido" : null,
      "foto_url" in p ? "Otra foto" : null,
    ].filter((r): r is string => Boolean(r));
    return { titulo: "Cambio de producto", resumen: producto, renglones, cuando: cuando(null) };
  }
  if (c.tipo === "conteo.renglon") {
    const r = (c.cuerpo ?? {}) as { cantidad?: number };
    return { titulo: "Conteo", resumen: producto, renglones: [c.metodo === "DELETE" ? "Sacó el renglón del conteo" : `Contó ${numero(r.cantidad)}`], cuando: cuando(null) };
  }
  return { titulo: c.tipo, resumen: null, renglones: [], cuando: cuando(null) };
}
