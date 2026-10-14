import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { preciosDeUnProducto } from "../precios.js";
import * as datos from "./datos.js";

export { normalizarBusqueda, type ProductoCatalogo } from "./datos.js";

// El catálogo para el mostrador (issues #13 y #14), en sus reglas (ADR-018): cada producto con
// su costo vigente, el margen elegido y el precio ya calculado acá, con su explicación y el de
// cada uno de los cinco márgenes. El front solo calcula la vista previa de un margen o un
// precio tipeado.

// Lo que se le suma a cada producto: el precio de su margen (y para qué margen se calculó, así
// el front sabe si quedó viejo después de cambiarlo) y el de cada botón.
export function conPrecio<T extends { costo_neto: string | null; iva: string | null; margen_elegido: number | null }>(p: T) {
  const { precio, porMargen } = preciosDeUnProducto(p);
  return { ...p, precio: precio?.valor ?? null, explicacion_precio: precio?.pasos ?? [], margen_del_precio: precio ? p.margen_elegido : null, precios: porMargen };
}

export const catalogo = async (q: datos.FiltrosDelCatalogo) => (await datos.catalogo(q)).map(conPrecio);

export type CambiosEntrada = { margen_elegido?: number | null; unidad?: string; codigo_barras?: string | null; proveedor_preferido_id?: string | null; foto_url?: string | null };
export type Rechazo = { error: string; estado: 400 | 403 | 404 | 413; permiso?: string };

// Elegir margen: uno de los botones (300/200/100/50/25), cualquier porcentaje entero tipeado a
// mano, o ninguno; también la unidad, el código de barras, el proveedor preferido y la foto.
// Fijar el margen de un producto es de quien tiene ese permiso; en una venta el margen vale solo
// para esa venta y no llega acá (RF-72). Queda auditado.
export async function cambiar(id: string, cuerpo: CambiosEntrada, fijaMargenes: boolean, usuarioId: string): Promise<Rechazo | null> {
  const cambios: Record<string, unknown> = {};
  if ("margen_elegido" in cuerpo) {
    if (!fijaMargenes) return { error: "No tenés permiso para esto. Hace falta: Fijar márgenes", permiso: "catalogo.margenes", estado: 403 };
    const m = cuerpo.margen_elegido;
    if (m !== null && (typeof m !== "number" || !Number.isInteger(m) || m <= 0 || m > 10000)) return { error: "El margen es un porcentaje entero mayor que cero (por ejemplo 20) o ninguno", estado: 400 };
    cambios.margen_elegido = m;
  }
  if ("unidad" in cuerpo) {
    if (!["unidad", "kg", "m", "l"].includes(cuerpo.unidad as string)) return { error: "La unidad es unidad, kg, m o l", estado: 400 };
    cambios.unidad = cuerpo.unidad;
  }
  if ("codigo_barras" in cuerpo) {
    const cb = cuerpo.codigo_barras === null ? null : String(cuerpo.codigo_barras).trim();
    if (cb !== null && !/^[0-9A-Za-z-]{4,32}$/.test(cb)) return { error: "El código de barras tiene que tener entre 4 y 32 letras o números", estado: 400 };
    cambios.codigo_barras = cb;
  }
  if ("proveedor_preferido_id" in cuerpo) cambios.proveedor_preferido_id = cuerpo.proveedor_preferido_id ?? null;
  if ("foto_url" in cuerpo) {
    const f = cuerpo.foto_url === null ? null : String(cuerpo.foto_url).trim();
    if (f !== null && !/^(https?:\/\/|\/fotos\/).{4,500}$/.test(f)) return { error: "La foto tiene que ser una dirección https o una foto subida", estado: 400 };
    cambios.foto_url = f;
  }
  if (Object.keys(cambios).length === 0) return { error: "Nada que cambiar: mandá margen_elegido, unidad, codigo_barras, proveedor_preferido_id o foto_url", estado: 400 };
  if (!(await datos.cambiar(id, cambios))) return { error: "No existe ese producto", estado: 404 };
  await registrarEvento(pool, { tipo: "producto.precio_elegido", usuarioId, contenido: { id, ...cuerpo } });
  return null;
}

// Foto sacada con el celular (el cliente ya la achica a 800 px). Tipos: jpeg, png, webp; hasta 10 MB.
const TIPOS_DE_FOTO: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
export async function subirFoto(id: string, archivo: unknown, usuarioId: string): Promise<Rechazo | { foto_url: string }> {
  if (!(archivo instanceof File)) return { error: "Falta la foto", estado: 400 };
  const extension = TIPOS_DE_FOTO[archivo.type];
  if (!extension) return { error: "La foto tiene que ser jpeg, png o webp", estado: 400 };
  if (archivo.size > 10 * 1024 * 1024) return { error: "La foto pesa más de 10 MB", estado: 413 };
  const url = await datos.guardarFoto(Buffer.from(await archivo.arrayBuffer()), extension);
  if (!(await datos.cambiar(id, { foto_url: url }))) return { error: "No existe ese producto", estado: 404 };
  await registrarEvento(pool, { tipo: "producto.foto", usuarioId, contenido: { id, foto_url: url } });
  return { foto_url: url };
}

// Las fotos se sirven sin sesión: una etiqueta <img> no puede mandar el token, y el nombre al
// azar hace que no se puedan adivinar. Son fotos de tornillos, no datos.
export async function foto(nombre: string) {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre)) return null;
  const contenido = await datos.leerFoto(nombre);
  if (!contenido) return null;
  return { contenido: new Uint8Array(contenido), tipo: nombre.endsWith(".png") ? "image/png" : nombre.endsWith(".webp") ? "image/webp" : "image/jpeg" };
}
