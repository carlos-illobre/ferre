import { api, esFaltaDeRed } from "../../datos/conexion";
import { loBajado, type Bajado } from "../../datos/almacenamiento";
import type { Producto } from "../../datos/almacenamiento";
import type { PaginaDeProductos } from "@servidor/productos";
import type { Disponibilidad } from "./stock-y-filtros";
import { comparar } from "./memoria";

// ---------- Sin conexión, lo bajado a mano (historia 5) ----------

export const sinConexion = esFaltaDeRed;

// Lo bajado, como si lo hubiera contestado el servidor: la misma forma, para sumarlo igual.
export const comoPagina = (b: Bajado, productos: Producto[], hayMas = false, total = productos.length) =>
  ({ productos, stock: Object.fromEntries(productos.map((p) => [p.id, String(b.stock.get(p.id) ?? 0)])), hay_mas: hayMas, total }) as unknown as PaginaDeProductos;
// La descarga trae, de cada producto, los códigos de todos sus proveedores (no solo el del que
// fija el costo): sin conexión se encuentra por cualquiera de ellos, como en el servidor.
type ConCodigosBajados = Producto & { codigos?: (string | null)[] };
const codigosDe = (p: ConCodigosBajados) => [p.codigo_proveedor, p.codigo_barras, ...(p.codigos ?? [])];
// La regla de búsqueda del servidor (specs/018, E03), para lo bajado sin conexión y para lo que se
// muestra mientras el servidor contesta: así el orden no cambia al llegar la respuesta. Cada
// palabra es el comienzo de una palabra de la descripción o la marca, o el comienzo de un código;
// lo escrito entero, con sus signos, también vale como comienzo de un código (TA-81, decisión 139);
// primero las descripciones más cortas.
const palabrasDe = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
export function comoElServidor(ps: Producto[], consulta: string): Producto[] {
  const palabras = palabrasDe(consulta).slice(0, 8);
  const entero = consulta.trim().toLowerCase();
  if (!palabras.length) return [];
  return ps.filter((p) => {
    const texto = ` ${palabrasDe(`${p.descripcion} ${p.marca ?? ""}`).join(" ")}`;
    const codigos = [p.codigo_barras, ...((p as ConCodigosBajados).codigos ?? [p.codigo_proveedor])].filter((c): c is string => Boolean(c)).map((c) => c.toLowerCase());
    return palabras.every((w) => texto.includes(` ${w}`) || codigos.some((c) => c.startsWith(w))) || codigos.some((c) => c.startsWith(entero));
  }).sort((a, b) => a.descripcion.length - b.descripcion.length || comparar(a.descripcion, b.descripcion));
}
const claveDeMarca = (m: string) => m.trim().toLocaleLowerCase("es-AR");
export function buscarEnLoBajado(b: Bajado, c: { buscar?: string; codigo?: string; ids?: string[]; marca?: string | null; disponibilidad?: Disponibilidad }): Producto[] {
  let r: Producto[] = c.buscar?.trim() ? comoElServidor(b.productos, c.buscar) : [...b.productos].sort((x, y) => comparar(x.descripcion, y.descripcion));
  if (c.codigo) r = r.filter((p) => codigosDe(p).includes(c.codigo!));
  if (c.ids) { const ids = new Set(c.ids); r = r.filter((p) => ids.has(p.id)); }
  if (c.marca) r = r.filter((p) => p.marca && claveDeMarca(p.marca) === claveDeMarca(c.marca!));
  if (c.disponibilidad && c.disponibilidad !== "todos") r = r.filter((p) => ((b.stock.get(p.id) ?? 0) > 0) === (c.disponibilidad === "con-stock"));
  return r;
}
// Las marcas de unos productos, sin repetir (como se escribió en la primera) y en orden.
export function marcasDe(ps: Producto[]): string[] {
  const porClave = new Map<string, string>();
  for (const p of ps) { const m = p.marca?.trim(); if (m && !porClave.has(claveDeMarca(m))) porClave.set(claveDeMarca(m), m); }
  return [...porClave.values()].sort((x, y) => x.localeCompare(y, "es-AR", { sensitivity: "base" }));
}
// Si falla por falta de conexión y hay algo bajado, contesta lo bajado; si no, el mismo error.
export async function oLoBajado<T>(pedido: Promise<T>, conLoBajado: (b: Bajado) => T | Promise<T>): Promise<T> {
  try { return await pedido; }
  catch (e) {
    const b = sinConexion(e) ? await loBajado() : null;
    if (!b) throw e;
    return conLoBajado(b);
  }
}
export function pedirPagina(consulta: Record<string, string | number | undefined>): Promise<PaginaDeProductos> {
  const q = new URLSearchParams(Object.entries(consulta).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== "").map(([k, v]) => [k, String(v)]));
  return api<PaginaDeProductos>(`/productos/pagina${q.size ? `?${q}` : ""}`);
}
