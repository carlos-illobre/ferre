import { sql } from "kysely";
import type { EstadoDeLista, ListaEnHistorial } from "../contratos/listas.js";
import type { Enviable } from "../enviable.js";
import { base } from "./conexion.js";
import { enTransaccion } from "./transaccion.js";

// Listas de precios: el acceso a los datos (ADR-018). Las inserciones de un lote van en un solo
// INSERT de muchas filas, con el tipo de lo que devuelve cada consulta.
export const historial = () => sql<EnHistorial>`
  SELECT l.id, l.archivo_nombre, l.fecha_lista, l.estado, l.resumen, l.avisos, l.importada_en, l.creado_en, p.id AS proveedor_id, p.nombre AS proveedor
     FROM lista_importada l JOIN proveedor p ON p.id = l.proveedor_id
    ORDER BY l.creado_en DESC LIMIT 100`.execute(base).then((r) => r.rows);

export async function proveedorConLector(lector: string): Promise<string | null> {
  const { rows } = await sql<{ id: string }>`SELECT id FROM proveedor WHERE lector = ${lector} AND activo`.execute(base);
  return rows[0]?.id ?? null;
}

export type ConfiguracionDeProveedor = { nombre: string; precios_incluyen_iva: boolean; descuento_general: string; descuento_contado: string; lector: string | null };
export async function proveedorActivo(id: string): Promise<ConfiguracionDeProveedor | null> {
  const { rows } = await sql<ConfiguracionDeProveedor>`SELECT nombre, precios_incluyen_iva, descuento_general, descuento_contado, lector FROM proveedor WHERE id = ${id} AND activo`.execute(base);
  return rows[0] ?? null;
}

export const guardarPendiente = (l: { id: string; proveedorId: string; archivoNombre: string; ruta: string; fechaLista: string; resumen: string; avisos: string; usuarioId: string }) => sql`
  INSERT INTO lista_importada (id, proveedor_id, archivo_nombre, archivo_ruta, fecha_lista, estado, resumen, avisos, cargada_por)
   VALUES (${l.id}, ${l.proveedorId}, ${l.archivoNombre}, ${l.ruta}, ${l.fechaLista}, 'pendiente', ${l.resumen}, ${l.avisos}, ${l.usuarioId})`.execute(base);

// El costo vigente de cada código de ese proveedor: la fila más reciente.
export const costosVigentes = (proveedorId: string) => sql<{ codigo_proveedor: string; costo_neto: string }>`
  SELECT DISTINCT ON (codigo_proveedor) codigo_proveedor, costo_neto FROM precio_proveedor WHERE proveedor_id = ${proveedorId} ORDER BY codigo_proveedor, fecha_lista DESC, creado_en DESC`.execute(base).then((r) => r.rows);

export const preciosVigentes = (proveedorId: string) => sql<{ producto_id: string; codigo_proveedor: string; costo_neto: string; precio_lista: string }>`
  SELECT DISTINCT ON (codigo_proveedor) producto_id, codigo_proveedor, costo_neto, precio_lista
     FROM precio_proveedor WHERE proveedor_id = ${proveedorId} ORDER BY codigo_proveedor, fecha_lista DESC, creado_en DESC`.execute(base).then((r) => r.rows);

// Con alias: la prueba del SQL con parámetros reconoce `sql<Tipo>` sin anidar.
type EnHistorial = Enviable<ListaEnHistorial>;
type Estado = Enviable<EstadoDeLista>;

const cambiadas = (r: { numAffectedRows?: bigint }) => Number(r.numAffectedRows) > 0;

// Solo una aplicación a la vez: el que cambia el estado es el que la corre.
export const empezarAAplicar = (id: string): Promise<boolean> => sql`
  UPDATE lista_importada SET estado = 'aplicando', resumen = resumen || '{"progreso": {"procesadas": 0, "total": null}}'::jsonb WHERE id = ${id} AND estado = 'pendiente'`.execute(base).then(cambiadas);
export const volverAPendiente = (id: string, error: string) =>
  sql`UPDATE lista_importada SET estado = 'pendiente', resumen = resumen || ${JSON.stringify({ error })}::jsonb WHERE id = ${id}`.execute(base);
export const anotarProgreso = (id: string, progreso: unknown) =>
  sql`UPDATE lista_importada SET resumen = resumen || ${JSON.stringify({ progreso })}::jsonb WHERE id = ${id}`.execute(base);
export const marcarAplicada = (id: string, usuarioId: string, resultado: unknown) => sql`
  UPDATE lista_importada SET estado = 'aplicada', importada_en = now(), aplicada_por = ${usuarioId}, resumen = (resumen - 'progreso' - 'error') || ${JSON.stringify(resultado)}::jsonb WHERE id = ${id}`.execute(base);
export const descartar = (id: string): Promise<boolean> =>
  sql`UPDATE lista_importada SET estado = 'descartada' WHERE id = ${id} AND estado = 'pendiente'`.execute(base).then(cambiadas);

// Un INSERT de muchas filas: `columnas` va pegado al SQL, así que solo se llama con nombres fijos.
const insertarFilas = (tabla: string, columnas: string, filas: unknown[][]) =>
  sql`INSERT INTO ${sql.raw(tabla)} (${sql.raw(columnas)}) VALUES ${sql.join(filas.map((f) => sql`(${sql.join(f)})`))}`;

// Un lote = una transacción con dos INSERT de muchas filas: cientos de veces menos idas y
// vueltas que una fila por vez.
export const guardarLote = (productos: unknown[][], precios: unknown[][]) => enTransaccion(async (trx) => {
  if (productos.length) await insertarFilas("producto", "id, descripcion, marca, codigo_barras, proveedor_preferido_id", productos).execute(trx);
  if (precios.length) {
    await insertarFilas("precio_proveedor", "id, producto_id, proveedor_id, lista_importada_id, codigo_proveedor, descripcion_proveedor, precio_lista, descuentos, costo_neto, iva, cantidad_bulto, precio_bulto, fecha_lista", precios).execute(trx);
  }
});

export async function archivoDe(id: string) {
  const { rows } = await sql<{ archivo_nombre: string; archivo_ruta: string | null }>`SELECT archivo_nombre, archivo_ruta FROM lista_importada WHERE id = ${id}`.execute(base);
  return rows[0] ?? null;
}

// El archivo, el proveedor, la fecha y cuántos productos cargó la lista (los costos que dejó).
export async function origenDe(id: string) {
  const { rows } = await sql<{ id: string; archivo_nombre: string; proveedor: string; fecha_lista: string; productos: number }>`
    SELECT l.id, l.archivo_nombre, p.nombre AS proveedor, l.fecha_lista::text,
            (SELECT count(*)::int FROM precio_proveedor c WHERE c.lista_importada_id = l.id) AS productos
       FROM lista_importada l JOIN proveedor p ON p.id = l.proveedor_id WHERE l.id = ${id}`.execute(base);
  return rows[0] ?? null;
}

export async function estadoDe(id: string) {
  const { rows } = await sql<Estado>`
    SELECT l.id, l.estado, l.resumen, l.avisos, l.fecha_lista::text, l.archivo_nombre, p.nombre AS proveedor FROM lista_importada l JOIN proveedor p ON p.id = l.proveedor_id WHERE l.id = ${id}`.execute(base);
  return rows[0] ?? null;
}

export type ListaGuardada = { id: string; proveedor_id: string; archivo_nombre: string; archivo_ruta: string; fecha_lista: string; estado: string; lector: string | null; precios_incluyen_iva: boolean; descuento_general: string; descuento_contado: string };
export async function buscarLista(id: string): Promise<ListaGuardada | null> {
  const { rows } = await sql<ListaGuardada>`
    SELECT l.id, l.proveedor_id, l.archivo_nombre, l.archivo_ruta, l.fecha_lista::text, l.estado, p.lector, p.precios_incluyen_iva, p.descuento_general, p.descuento_contado
       FROM lista_importada l JOIN proveedor p ON p.id = l.proveedor_id WHERE l.id = ${id}`.execute(base);
  return rows[0] ?? null;
}
