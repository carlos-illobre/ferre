import { base } from "../persistencia/conexion.js";
import { productosConStock, stockDeProductos } from "../persistencia/deposito.js";
import { anotarEvento } from "../eventos/anotar.js";
import { preciosDeUnProducto, VERSION_DE_PRECIOS } from "../precios.js";
import * as copia from "./copia.js";
import * as datos from "../persistencia/productos.js";
import type { z } from "zod";
import type { DescargaDeProductos, FotoSubida, PaginaDeProductos, ProductoDelCatalogo, ResumenDelCatalogo } from "../contratos/productos.js";
import type { cambiosDeProducto } from "./esquemas.js";

export { type ProductoCatalogo } from "../persistencia/productos.js";
export { normalizarBusqueda } from "./copia.js";

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

// Lo que el dispositivo recibe de una fila de la copia: sin lo que la copia usa para buscar.
const comoProducto = ({ vigente: _v, codigos: _c, cambio: _m, ...p }: datos.FilaDeLaCopia): ProductoDelCatalogo => conPrecio(p);

// Los valores que llegan en la consulta, recortados como siempre: hasta 300 identificadores con
// forma de UUID; `desde` desde cero; `limite` hasta su tope.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idsDe = (ids: string | undefined) => (ids === undefined ? undefined : ids.split(",").map((x) => x.trim()).filter((x) => UUID.test(x)).slice(0, 300));
const entero = (texto: string | undefined, si: number, tope: number) => { const n = Math.floor(Number(texto)); return Number.isFinite(n) && n >= 0 ? Math.min(n, tope) : si; };

export type ConsultaDelCatalogo = { limite?: string; desde?: string; buscar?: string; codigo?: string; ids?: string; marca?: string; disponibilidad?: string; primero?: string };

// La marca de descarga que va a los dispositivos dice de qué base es: «<base>.<transacción>»
// (022-E23). Vale solo si es de esta base y la transacción tiene hasta 20 dígitos y entra en un xid8
// (2^64 - 1); otra cosa (otro ambiente, una base nueva o restaurada) vale como ninguna: se baja todo.
export const marcaParaDispositivo = (transaccion: string) => `${copia.deQueBase()}.${transaccion}`;
export function marcaValida(m: string | undefined): string | null {
  const [base, transaccion = ""] = (m ?? "").split(".");
  return base === copia.deQueBase() && /^\d{1,20}$/.test(transaccion) && BigInt(transaccion) <= 18446744073709551615n ? transaccion : null;
}

// GET /productos: lo de siempre, para la aplicación de la versión anterior mientras se actualiza
// (specs/018): todo, o de a tandas, desde la copia.
export function catalogo(q: ConsultaDelCatalogo): ProductoDelCatalogo[] {
  const filas = copia.buscar({ buscar: q.buscar, codigo: q.codigo, ids: idsDe(q.ids) });
  const limite = entero(q.limite, 0, 20_000);
  const desde = entero(q.desde, 0, 10_000_000);
  return (limite > 0 ? filas.slice(desde, desde + limite) : filas).map(comoProducto);
}

// GET /productos/pagina (specs/018, RF-122): solo lo encontrado, de a 50 (hasta 200), con el stock
// de esa página, lo único que se lee de la base. El filtro de stock lee qué productos tienen.
export async function pagina(q: ConsultaDelCatalogo): Promise<PaginaDeProductos> {
  const disponibilidad = q.disponibilidad === "con-stock" || q.disponibilidad === "sin-stock" ? q.disponibilidad : null;
  const stock = disponibilidad ? { hay: disponibilidad === "con-stock", conStock: await productosConStock(base) } : null;
  const filas = copia.buscar({ buscar: q.buscar, codigo: q.codigo, ids: idsDe(q.ids), marca: q.marca?.trim() || null, stock, primeroDe: q.primero && UUID.test(q.primero) ? q.primero : null });
  const limite = Math.max(1, entero(q.limite, 50, 200));
  const desde = entero(q.desde, 0, 10_000_000);
  const productos = filas.slice(desde, desde + limite);
  return { productos: productos.map(comoProducto), stock: await stockDeProductos(base, productos.map((p) => p.id)), hay_mas: desde + limite < filas.length, total: filas.length };
}

// GET /productos/descarga?marca=&desde=&limite= (specs/018, historia 5): para trabajar sin
// conexión. Sale de la copia: no lee la base.
export function descarga(q: { marca?: string; desde?: string; limite?: string }): DescargaDeProductos {
  const marca = marcaValida(q.marca);
  const desde = q.desde && UUID.test(q.desde) ? q.desde : "";
  const d = copia.descarga({ marca, desde, limite: Math.max(1, entero(q.limite, 500, 1000)) });
  // Con todos sus códigos de proveedor, también los de listas viejas: sin conexión se escanean igual
  // que con conexión (revisión 1.3). Y la versión del cálculo del precio: si cambió, el dispositivo
  // vuelve a bajar todo (revisión 3.4).
  return { productos: d.filas.map((f) => ({ ...comoProducto(f), codigos: f.codigos ?? [] })), quitados: d.quitados, hay_mas: d.hayMas, siguiente: d.ultimo, marca: marcaParaDispositivo(d.marca), calculo: VERSION_DE_PRECIOS };
}

// GET /productos/resumen: cuántos productos hay y cuántos tienen costo pero no margen.
export function resumen(): ResumenDelCatalogo {
  const todos = copia.buscar({});
  return { productos: todos.length, sin_margen: todos.filter((p) => p.margen_elegido === null && p.costo_neto !== null).length };
}

// GET /productos/marcas: las marcas para el filtro del Catálogo, sin repetir y en orden; con una
// búsqueda, las de lo encontrado (015-E29).
export const marcas = (q: { buscar?: string }): readonly string[] => (q.buscar?.trim() ? copia.marcasDe(copia.buscar({ buscar: q.buscar })) : copia.marcas());

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
  await anotarEvento(base, { tipo: "producto.precio_elegido", usuarioId, contenido: { id, ...conLectura } });
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
  await anotarEvento(base, { tipo: "producto.foto", usuarioId, contenido: { id, foto_url: url } });
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
