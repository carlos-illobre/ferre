import { useSyncExternalStore } from "react";
import { cambiosDeProductosPendientes } from "../../datos/almacenamiento";
import type { Producto } from "../../datos/almacenamiento";
import type { PaginaDeProductos } from "@servidor/productos";
import type { Cliente } from "@servidor/clientes";
import type { Unidad } from "./unidades";

// Lo que fue llegando del servidor, en memoria mientras la aplicación está abierta y compartido
// por todas las pantallas (ver catalogo.ts).
export type Cambios = Partial<Pick<Producto, "margen_elegido" | "codigo_barras" | "codigo_leido_en" | "foto_url"> & { unidad: Unidad; proveedor_preferido_id?: string }>;
type Estado = { catalogo: Producto[]; stock: Map<string, number>; clientes: Cliente[]; error: string | null; buscando: boolean };

export const SIN_CONEXION_PARA_BUSCAR = "Sin conexión: para buscar productos hace falta internet.";
export const POR_PAGINA = 50;
export const REFRESCO_MS = 60_000; // una búsqueda ya hecha se vuelve a pedir si pasó este tiempo

const VACIO: Estado = { catalogo: [], stock: new Map(), clientes: [], error: null, buscando: false };
let estado: Estado = VACIO;
const oyentes = new Set<() => void>();
export const elEstado = () => estado;
export function poner(cambios: Partial<Estado>) { estado = { ...estado, ...cambios }; oyentes.forEach((o) => o()); }
const suscribir = (oyente: () => void) => { oyentes.add(oyente); return () => { oyentes.delete(oyente); }; };
export const useEstado = () => useSyncExternalStore(suscribir, () => estado);

export const porId = new Map<string, Producto>();
export const comparar = new Intl.Collator("es").compare;

// Cambios hechos acá que todavía no confirmó el servidor: van encima de lo que llega.
export const enVuelo = new Map<string, Cambios>();

// Lo que llega del servidor se suma a la memoria, con lo que falta mandar encima, y su stock.
export async function sumar(pagina: PaginaDeProductos): Promise<Producto[]> {
  const enCola = pagina.productos.length ? await cambiosDeProductosPendientes().catch(() => new Map<string, Record<string, unknown>>()) : new Map();
  const stock = new Map(estado.stock);
  const llegados = pagina.productos.map((p) => {
    const local = { ...enCola.get(p.id), ...enVuelo.get(p.id) } as Partial<Producto>;
    const nuevo = Object.keys(local).length ? { ...p, ...local } : p;
    porId.set(p.id, nuevo);
    // El servidor no manda el stock de los que nunca tuvieron movimientos: no tienen.
    stock.set(p.id, Number(pagina.stock[p.id] ?? 0));
    return nuevo;
  });
  if (llegados.length) poner({ catalogo: [...porId.values()].sort((a, b) => comparar(a.descripcion, b.descripcion)), stock });
  return llegados;
}

// Un producto que ya llegó en esta sesión, si llegó.
export const productoEnMemoria = (id: string): Producto | undefined => porId.get(id);
export const losQueEstan = (ids: string[]) => ids.map((id) => porId.get(id)).filter((p): p is Producto => Boolean(p));

export function ponerEnMemoria(id: string, cambios: Partial<Producto>) {
  const p = porId.get(id);
  if (!p) return;
  porId.set(id, { ...p, ...cambios });
  poner({ catalogo: estado.catalogo.map((x) => (x.id === id ? porId.get(id)! : x)) });
}

// Stock que ve el mostrador después de un movimiento local (venta sin conexión).
export function ajustarStockLocal(id: string, delta: number) {
  // Una venta nunca deja el stock por debajo de cero (RF-59): baja hasta cero y no más.
  const n = new Map(estado.stock); const hay = n.get(id) ?? 0;
  n.set(id, delta < 0 ? Math.min(hay, Math.max(0, hay + delta)) : hay + delta);
  poner({ stock: n });
}

export function olvidarLaMemoria() {
  porId.clear(); enVuelo.clear();
  estado = { ...VACIO, stock: new Map() };
}
