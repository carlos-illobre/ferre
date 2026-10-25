import { productoEnMemoria } from "../catalogo";
import { conUnidad } from "../catalogo";
import type { CambioApartado } from "@servidor/apartados";
import { cantidadDe, conMinuscula, cuerpo, importeDe, medioDe, nombreCorto, productoDe, unidadDelProducto, unidadDelRecurso, type Ajuste, type UnidadDe, type Venta } from "./cuerpos";
import { describir } from "./describir";
import { diaCorto, hora, primerNombre } from "./fechas";

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
type Ver = (c: CambioApartado, unidadDe: UnidadDe) => VistaDelCambio;
const BASE = { importe: null, medio: null, productos: [] as ProductoApartado[], hecho: "Hecho" };

function productosDeLaVenta(v: Venta, unidadDe: UnidadDe): ProductoApartado[] {
  return (v.items ?? []).map((i) => {
    const p = i.producto_id ? productoEnMemoria(i.producto_id) : undefined;
    return { producto_id: i.producto_id ?? null, descripcion: i.descripcion ?? "sin descripción", cantidad: cantidadDe(i, unidadDe), importe: importeDe(i), foto_url: p?.foto_url ?? null, marca: p?.marca ?? null };
  });
}

const venta: Ver = (c, unidadDe) => {
  const v = cuerpo<Venta>(c);
  const productos = productosDeLaVenta(v, unidadDe);
  const total = productos.reduce((s, p) => s + (p.importe ?? 0), 0);
  return {
    tipo: "venta", nombre: "Venta", detalle: [`${diaCorto(c.hecho_en)} ${hora(c.hecho_en)}`, medioDe(v)].filter(Boolean).join(" · "), importe: total, medio: v.medio_pago ?? null,
    titulo: "Cobrada sin conexión, sin registrar", hecho: "Cobrada", productos, boton: "Aceptar venta",
    efecto: [`Entra en las ventas del ${diaCorto(c.hecho_en)}, ${hora(c.hecho_en)}, a nombre de ${primerNombre(c.usuario)}.`, ...productos.map((p) => `${nombreCorto(p.descripcion)}: baja ${p.cantidad} el stock.`)],
  };
};
const ajuste: Ver = (c, unidadDe) => {
  const a = cuerpo<Ajuste>(c);
  const hay = conUnidad(a.cantidad_real ?? 0, unidadDelRecurso(c, unidadDe));
  const producto = productoDe(c);
  return { ...BASE, tipo: "ajuste", nombre: "Ajuste de stock", detalle: [producto, `hay ${hay}`].join(" · "), titulo: "Ajuste de stock hecho sin conexión", boton: "Aceptar ajuste",
    efecto: [`${nombreCorto(producto)}: el stock queda en ${hay}.`, ...(a.motivo ? [`Con el motivo «${a.motivo}».`] : [])] };
};
const cambioDeProducto: Ver = (c, unidadDe) => {
  const d = describir(c, unidadDe);
  const producto = productoDe(c);
  return { ...BASE, tipo: "producto", nombre: "Cambio de producto", detalle: [producto, ...d.renglones].join(" · "), titulo: "Producto cambiado sin conexión", boton: "Aceptar cambio",
    efecto: d.renglones.map((r) => `${nombreCorto(producto)}: ${conMinuscula(r)}.`) };
};
const conteo: Ver = (c, unidadDe) => {
  const d = describir(c, unidadDe);
  const producto = productoDe(c);
  return { ...BASE, tipo: "conteo", nombre: "Renglón de conteo", detalle: [producto, ...d.renglones].join(" · "), titulo: "Conteo hecho sin conexión", boton: "Aceptar conteo",
    efecto: [`${nombreCorto(producto)}: ${conMinuscula(d.renglones[0] ?? "")} en el conteo.`] };
};
const consulta: Ver = (c, unidadDe) => {
  const d = describir(c, unidadDe);
  return { ...BASE, tipo: "consulta", nombre: "No llevó", detalle: [d.resumen, ...d.renglones].filter(Boolean).join(" · "), titulo: "Anotado sin conexión", boton: "Aceptar",
    efecto: ["Queda anotado en lo que no se llevaron."] };
};
const VISTAS: Record<string, Ver> = { venta, "stock.ajuste": ajuste, "producto.cambio": cambioDeProducto, "conteo.renglon": conteo, consulta };

export function vistaDelCambio(c: CambioApartado, unidadDe: UnidadDe = unidadDelProducto): VistaDelCambio {
  return VISTAS[c.tipo]?.(c, unidadDe) ?? { ...BASE, tipo: "otro", nombre: c.tipo, detalle: diaCorto(c.hecho_en), titulo: "Hecho sin conexión", boton: "Aceptar", efecto: [] };
}
