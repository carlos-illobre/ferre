import { api } from "../datos/conexion";
import { consultas } from "../datos/conexion";
import { pesosCortos } from "../formato";
import { productoEnMemoria } from "./catalogo";
import { conUnidad } from "./catalogo";
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
const dosCifras = (n: number) => String(n).padStart(2, "0");
export const diaYHora = (iso: string) => { const d = new Date(iso); return `${dosCifras(d.getDate())}/${dosCifras(d.getMonth() + 1)} a las ${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`; };
const hora = (iso: string) => { const d = new Date(iso); return `${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`; };
const mismoDia = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

type Venta = { medio_pago?: string; items?: { producto_id?: string | null; descripcion?: string; cantidad?: number; precio_unitario?: number }[] };
type NoLlevo = { items?: { descripcion?: string; precio_ofrecido?: number | null }[]; motivo?: string };
type Ajuste = { cantidad_real?: number; motivo?: string };
type CambioDeProducto = { margen_elegido?: number | null; unidad?: string; codigo_barras?: string | null; proveedor_preferido_id?: string | null; foto_url?: string | null };

// La unidad del producto, del catálogo bajado; sin producto o sin catálogo, «un.» (decisión 144).
const unidadDelProducto = (id?: string | null) => (id ? productoEnMemoria(id)?.unidad : undefined);

export function describir(c: CambioApartado, unidadDe: (productoId?: string | null) => string | undefined = unidadDelProducto): Descripcion {
  const delRecurso = unidadDe(c.ruta.split("/").pop());
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
      renglones: items.map((i) => `${conUnidad(i.cantidad ?? 0, unidadDe(i.producto_id))} ${i.descripcion ?? "sin descripción"} — ${pesosCortos(Number(i.cantidad ?? 0) * Number(i.precio_unitario ?? 0))}`),
      cuando: cuando("Cobrada"),
    };
  }
  if (c.tipo === "consulta") {
    const n = (c.cuerpo ?? {}) as NoLlevo;
    return { titulo: "No llevó", resumen: n.motivo ?? null, renglones: (n.items ?? []).map((i) => [i.descripcion ?? "sin descripción", i.precio_ofrecido ? `ofrecido a ${pesosCortos(i.precio_ofrecido)}` : null].filter(Boolean).join(" · ")), cuando: cuando("Anotado") };
  }
  if (c.tipo === "stock.ajuste") {
    const a = (c.cuerpo ?? {}) as Ajuste;
    return { titulo: "Ajuste de stock", resumen: producto, renglones: [[`Hay ${conUnidad(a.cantidad_real ?? 0, delRecurso)}`, a.motivo ? `«${a.motivo}»` : null].filter(Boolean).join(" · ")], cuando: cuando(null) };
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
    return { titulo: "Conteo", resumen: producto, renglones: [c.metodo === "DELETE" ? "Sacó el renglón del conteo" : `Contó ${conUnidad(r.cantidad ?? 0, delRecurso)}`], cuando: cuando(null) };
  }
  return { titulo: c.tipo, resumen: null, renglones: [], cuando: cuando(null) };
}

// La v2 (specs/021): cada cambio como renglón de la bandeja y como detalle, igual en el celular y en
// la computadora. Lo que no se sabe (el stock de antes y de después) no se inventa.
export type ProductoApartado = { producto_id: string | null; descripcion: string; cantidad: string; importe: number | null; foto_url: string | null; marca: string | null };
export type VistaDelCambio = {
  tipo: "venta" | "ajuste" | "producto" | "conteo" | "consulta" | "otro";
  nombre: string; // «Venta», «Ajuste de stock»…
  detalle: string; // «jue 15/10 17:52 · Efectivo» o el producto con lo que cambió
  importe: number | null; // las ventas; el resto muestra la hora
  medio: string | null;
  titulo: string; // el título del detalle
  hecho: string; // «Cobrada» o «Hecho»
  productos: ProductoApartado[];
  efecto: string[]; // «Si la aceptás»: lo que va a pasar, con las palabras del negocio
  boton: string; // «Aceptar venta», «Aceptar ajuste»…
};
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export const diaCorto = (iso: string) => { const d = new Date(iso); return `${DIAS[d.getDay()]} ${dosCifras(d.getDate())}/${dosCifras(d.getMonth() + 1)}`; };
export const horaCorta = hora;
// «hoy 09:14», «ayer 18:40» o «jue 15/10 18:40».
export function cuandoCorto(iso: string, ahora = new Date()): string {
  const d = new Date(iso);
  const ayer = new Date(ahora); ayer.setDate(ahora.getDate() - 1);
  const dia = d.toDateString() === ahora.toDateString() ? "hoy" : d.toDateString() === ayer.toDateString() ? "ayer" : diaCorto(iso);
  return `${dia} ${hora(iso)}`;
}
// «hace 4 días», «hace 3 horas», «recién».
export function haceCuanto(iso: string, ahora = Date.now()): string {
  const minutos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60_000));
  if (minutos < 2) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return horas === 1 ? "hace 1 hora" : `hace ${horas} horas`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}
export const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
const primerNombre = (nombre: string) => nombre.split(/\s+/)[0] ?? nombre;

export function vistaDelCambio(c: CambioApartado, unidadDe: (productoId?: string | null) => string | undefined = unidadDelProducto): VistaDelCambio {
  const delRecurso = unidadDe(c.ruta.split("/").pop());
  const producto = c.producto ?? "un producto que ya no está";
  const deCatalogo = (id?: string | null) => (id ? productoEnMemoria(id) : undefined);
  if (c.tipo === "venta") {
    const v = (c.cuerpo ?? {}) as Venta;
    const items = v.items ?? [];
    const productos = items.map((i) => {
      const p = deCatalogo(i.producto_id);
      return { producto_id: i.producto_id ?? null, descripcion: i.descripcion ?? "sin descripción", cantidad: conUnidad(i.cantidad ?? 0, unidadDe(i.producto_id)), importe: Number(i.cantidad ?? 0) * Number(i.precio_unitario ?? 0), foto_url: p?.foto_url ?? null, marca: p?.marca ?? null };
    });
    const total = productos.reduce((s, p) => s + (p.importe ?? 0), 0);
    const medio = v.medio_pago ? NOMBRE_DE_MEDIO[v.medio_pago as keyof typeof NOMBRE_DE_MEDIO] ?? v.medio_pago : null;
    const cuantos = items.length === 1 ? "1 producto" : `${items.length} productos`;
    return {
      tipo: "venta", nombre: "Venta", detalle: [`${diaCorto(c.hecho_en)} ${hora(c.hecho_en)}`, medio].filter(Boolean).join(" · "), importe: total, medio: v.medio_pago ?? null,
      titulo: "Cobrada sin conexión, sin registrar", hecho: "Cobrada", productos, boton: "Aceptar venta",
      efecto: [`Entra en las ventas del ${diaCorto(c.hecho_en)}, ${hora(c.hecho_en)}, a nombre de ${primerNombre(c.usuario)}.`, ...productos.map((p) => `${nombreCorto(p.descripcion)}: baja ${p.cantidad} el stock.`)],
    };
  }
  const base = { importe: null, medio: null, productos: [] as ProductoApartado[], hecho: "Hecho" };
  if (c.tipo === "stock.ajuste") {
    const a = (c.cuerpo ?? {}) as Ajuste;
    const hay = conUnidad(a.cantidad_real ?? 0, delRecurso);
    return { ...base, tipo: "ajuste", nombre: "Ajuste de stock", detalle: [producto, `hay ${hay}`].join(" · "), titulo: "Ajuste de stock hecho sin conexión", boton: "Aceptar ajuste",
      efecto: [`${nombreCorto(producto)}: el stock queda en ${hay}.`, ...(a.motivo ? [`Con el motivo «${a.motivo}».`] : [])] };
  }
  if (c.tipo === "producto.cambio") {
    const d = describir(c, unidadDe);
    return { ...base, tipo: "producto", nombre: "Cambio de producto", detalle: [producto, ...d.renglones].join(" · "), titulo: "Producto cambiado sin conexión", boton: "Aceptar cambio",
      efecto: d.renglones.map((r) => `${nombreCorto(producto)}: ${r.charAt(0).toLowerCase()}${r.slice(1)}.`) };
  }
  if (c.tipo === "conteo.renglon") {
    const d = describir(c, unidadDe);
    return { ...base, tipo: "conteo", nombre: "Renglón de conteo", detalle: [producto, ...d.renglones].join(" · "), titulo: "Conteo hecho sin conexión", boton: "Aceptar conteo",
      efecto: [`${nombreCorto(producto)}: ${(d.renglones[0] ?? "").charAt(0).toLowerCase()}${(d.renglones[0] ?? "").slice(1)} en el conteo.`] };
  }
  if (c.tipo === "consulta") {
    const d = describir(c, unidadDe);
    return { ...base, tipo: "consulta", nombre: "No llevó", detalle: [d.resumen, ...d.renglones].filter(Boolean).join(" · "), titulo: "Anotado sin conexión", boton: "Aceptar",
      efecto: ["Queda anotado en lo que no se llevaron."] };
  }
  return { ...base, tipo: "otro", nombre: c.tipo, detalle: diaCorto(c.hecho_en), titulo: "Hecho sin conexión", boton: "Aceptar", efecto: [] };
}
// El nombre sin la medida ni el envase, para que entre en una línea: «Látex interior mate blanco 4 L» → «Látex interior».
const CONECTORES = new Set(["de", "del", "con", "para", "x", "y", "a", "en", "por"]);
function nombreCorto(descripcion: string): string {
  const palabras: string[] = [];
  let importantes = 0;
  for (const p of descripcion.split(/\s+/)) { palabras.push(p); if (!CONECTORES.has(p.toLowerCase()) && ++importantes === 2) break; }
  return palabras.join(" ");
}

// Los cuatro números de arriba de la bandeja.
export function resumenDeLoApartado(lista: CambioApartado[]) {
  const ventas = lista.filter((c) => c.tipo === "venta");
  const plata = ventas.reduce((s, c) => s + (vistaDelCambio(c, () => undefined).importe ?? 0), 0);
  const masViejo = lista.reduce<string | null>((m, c) => (!m || c.hecho_en < m ? c.hecho_en : m), null);
  return { cambios: lista.length, ventas: ventas.length, plata, personas: new Set(lista.map((c) => c.usuario_id)).size, masViejo };
}
