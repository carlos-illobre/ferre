import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { preciosDeUnProducto } from "../precios.js";
import * as datos from "./datos.js";
import type { z } from "zod";
import type { FotoSubida, ProductoDelCatalogo } from "../contratos/productos.js";
import type { cambiosDeProducto } from "./esquemas.js";

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

export const catalogo = async (q: datos.FiltrosDelCatalogo): Promise<ProductoDelCatalogo[]> => (await datos.catalogo(q)).map(conPrecio);

export type CambiosValidados = z.output<typeof cambiosDeProducto>;

// La última lectura del código (specs/016, RF-112): cargarlo o cambiarlo la pone; borrarlo la
// borra. Vale la hora en que se leyó, que manda el dispositivo; si no la manda, si está en el
// futuro o si es anterior al sistema, la del servidor.
const DESDE = Date.parse("2026-01-01T00:00:00Z");
export function horaDeLectura(codigo: string | null, mandada: string | undefined, ahora = new Date()): string | null {
  if (codigo === null) return null;
  const leida = mandada === undefined ? NaN : Date.parse(mandada);
  return Number.isFinite(leida) && leida <= ahora.getTime() && leida >= DESDE ? new Date(leida).toISOString() : ahora.toISOString();
}
export type Rechazo = { error: string; estado: 400 | 403 | 404 | 413; permiso?: string };

// Lo que cambia de un producto, ya validado con su esquema (`esquemas.ts`). Fijar el margen de
// un producto es de quien tiene ese permiso; en una venta el margen vale solo para esa venta y
// no llega acá (RF-72). Queda auditado.
export async function cambiar(id: string, cambios: CambiosValidados, fijaMargenes: boolean, usuarioId: string): Promise<Rechazo | null> {
  if ("margen_elegido" in cambios && !fijaMargenes) return { error: "No tenés permiso para esto. Hace falta: Fijar márgenes", permiso: "catalogo.margenes", estado: 403 };
  const conLectura = "codigo_barras" in cambios ? { ...cambios, codigo_leido_en: horaDeLectura(cambios.codigo_barras ?? null, cambios.codigo_leido_en) } : cambios;
  if (!(await datos.cambiar(id, conLectura))) return { error: "No existe ese producto", estado: 404 };
  await registrarEvento(pool, { tipo: "producto.precio_elegido", usuarioId, contenido: { id, ...conLectura } });
  return null;
}

// Foto sacada con el celular (el cliente ya la achica a 800 px). Tipos: jpeg, png, webp; hasta 10 MB.
const TIPOS_DE_FOTO: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
export async function subirFoto(id: string, archivo: unknown, usuarioId: string): Promise<Rechazo | FotoSubida> {
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
