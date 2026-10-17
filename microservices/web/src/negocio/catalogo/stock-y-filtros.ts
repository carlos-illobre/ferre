import type { Producto } from "../../producto";
import { abreviarUnidad, unidadDe } from "../../unidades";

// Lo que el Catálogo muestra y filtra del stock y de la marca (RF-107, RF-109), una sola vez
// para el celular y la computadora (decisión 47). El stock es el mismo de Depósito.

// El stock de un producto como se lee en el Catálogo: la cantidad con la unidad en que se vende
// («12 un.», «3,5 kg»), o «Sin stock» si es cero, negativo o no se cargó nunca. «Stock bajo»
// espera al stock mínimo (RF-54, decisión 103).
export function stockDe(p: Producto, stock: ReadonlyMap<string, number>): { hay: boolean; texto: string } {
  const cantidad = stock.get(p.id);
  if (cantidad === undefined || !Number.isFinite(cantidad) || cantidad <= 0) return { hay: false, texto: "Sin stock" };
  const unidad = unidadDe(p);
  // Lo que redondeado daría «0» (0,04 kg) se escribe con su primera cifra: hay stock, y un «0» en
  // verde contradiría «Sin stock».
  const redondeado = cantidad.toLocaleString("es-AR", { maximumFractionDigits: unidad === "unidad" ? 0 : 1 });
  const numero = redondeado === "0" ? cantidad.toLocaleString("es-AR", { maximumSignificantDigits: 1 }) : redondeado;
  return { hay: true, texto: `${numero} ${abreviarUnidad(unidad)}` };
}

export type Disponibilidad = "todos" | "con-stock" | "sin-stock";
export type Filtros = { disponibilidad: Disponibilidad; marca: string | null };
export const SIN_FILTROS: Filtros = { disponibilidad: "todos", marca: null };
// Cuántos filtros hay puestos: lo dice el botón de filtros.
export const cuantosFiltros = (f: Filtros) => (f.disponibilidad !== "todos" ? 1 : 0) + (f.marca !== null ? 1 : 0);

// Dos proveedores pueden escribir la misma marca distinto («3M» y «3m»): es una sola.
const clave = (marca: string) => marca.trim().toLocaleLowerCase("es-AR");

// Las marcas para elegir, sin repetir y en orden alfabético, de los productos que se le pasen
// (el catálogo entero o, buscando en el servidor, lo encontrado). Los sin marca no suman ninguna.
export function marcasDe(productos: readonly Producto[]): string[] {
  const porClave = new Map<string, string>();
  for (const p of productos) {
    const m = p.marca?.trim();
    if (m && !porClave.has(clave(m))) porClave.set(clave(m), m);
  }
  return [...porClave.values()].sort((a, b) => a.localeCompare(b, "es-AR", { sensitivity: "base" }));
}

// La lista ya buscada, con los filtros puestos: cumple todos a la vez.
export function filtrar(productos: readonly Producto[], stock: ReadonlyMap<string, number>, f: Filtros): Producto[] {
  return productos.filter((p) => {
    if (f.disponibilidad !== "todos" && stockDe(p, stock).hay !== (f.disponibilidad === "con-stock")) return false;
    if (f.marca !== null && (!p.marca || clave(p.marca) !== clave(f.marca))) return false;
    return true;
  });
}
