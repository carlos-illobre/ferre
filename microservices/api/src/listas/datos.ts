import { readFile } from "node:fs/promises";
import { pool } from "../db.js";
import { enTransaccionPg } from "../base.js";
import { leerPlanilla, type Lectura } from "./lector.js";

// Listas de precios: el acceso a los datos (ADR-018). SQL escrito a mano con el cliente de
// Postgres (inserciones de muchas filas por lote), con el tipo de lo que devuelve.
export const historial = () => pool.query(
  `SELECT l.id, l.archivo_nombre, l.fecha_lista, l.estado, l.resumen, l.avisos, l.importada_en, l.creado_en, p.id AS proveedor_id, p.nombre AS proveedor
     FROM lista_importada l JOIN proveedor p ON p.id = l.proveedor_id
    ORDER BY l.creado_en DESC LIMIT 100`).then((r) => r.rows);

export async function proveedorConLector(lector: string): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>("SELECT id FROM proveedor WHERE lector = $1 AND activo", [lector]);
  return rows[0]?.id ?? null;
}

export type ConfiguracionDeProveedor = { nombre: string; precios_incluyen_iva: boolean; descuento_general: string; descuento_contado: string; lector: string | null };
export async function proveedorActivo(id: string): Promise<ConfiguracionDeProveedor | null> {
  const { rows } = await pool.query<ConfiguracionDeProveedor>("SELECT nombre, precios_incluyen_iva, descuento_general, descuento_contado, lector FROM proveedor WHERE id = $1 AND activo", [id]);
  return rows[0] ?? null;
}

export const guardarPendiente = (l: { id: string; proveedorId: string; archivoNombre: string; ruta: string; fechaLista: string; resumen: string; avisos: string; usuarioId: string }) => pool.query(
  `INSERT INTO lista_importada (id, proveedor_id, archivo_nombre, archivo_ruta, fecha_lista, estado, resumen, avisos, cargada_por)
   VALUES ($1, $2, $3, $4, $5, 'pendiente', $6, $7, $8)`,
  [l.id, l.proveedorId, l.archivoNombre, l.ruta, l.fechaLista, l.resumen, l.avisos, l.usuarioId]);

// El costo vigente de cada código de ese proveedor: la fila más reciente.
export const costosVigentes = (proveedorId: string) => pool.query<{ codigo_proveedor: string; costo_neto: string }>(
  `SELECT DISTINCT ON (codigo_proveedor) codigo_proveedor, costo_neto FROM precio_proveedor WHERE proveedor_id = $1 ORDER BY codigo_proveedor, fecha_lista DESC, creado_en DESC`,
  [proveedorId]).then((r) => r.rows);

export const preciosVigentes = (proveedorId: string) => pool.query<{ producto_id: string; codigo_proveedor: string; costo_neto: string; precio_lista: string }>(
  `SELECT DISTINCT ON (codigo_proveedor) producto_id, codigo_proveedor, costo_neto, precio_lista
     FROM precio_proveedor WHERE proveedor_id = $1 ORDER BY codigo_proveedor, fecha_lista DESC, creado_en DESC`,
  [proveedorId]).then((r) => r.rows);

// Solo una aplicación a la vez: el que cambia el estado es el que la corre.
export async function empezarAAplicar(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE lista_importada SET estado = 'aplicando', resumen = resumen || '{"progreso": {"procesadas": 0, "total": null}}'::jsonb WHERE id = $1 AND estado = 'pendiente'`, [id]);
  return Boolean(rowCount);
}
export const volverAPendiente = (id: string, error: string) =>
  pool.query(`UPDATE lista_importada SET estado = 'pendiente', resumen = resumen || $2::jsonb WHERE id = $1`, [id, JSON.stringify({ error })]);
export const anotarProgreso = (id: string, progreso: unknown) =>
  pool.query(`UPDATE lista_importada SET resumen = resumen || $2::jsonb WHERE id = $1`, [id, JSON.stringify({ progreso })]);
export const marcarAplicada = (id: string, usuarioId: string, resultado: unknown) => pool.query(
  `UPDATE lista_importada SET estado = 'aplicada', importada_en = now(), aplicada_por = $2, resumen = (resumen - 'progreso' - 'error') || $3::jsonb WHERE id = $1`,
  [id, usuarioId, JSON.stringify(resultado)]);
export async function descartar(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`UPDATE lista_importada SET estado = 'descartada' WHERE id = $1 AND estado = 'pendiente'`, [id]);
  return Boolean(rowCount);
}

function insertMultiple(tabla: string, columnas: string[], filas: unknown[][]): string {
  const valores = filas.map((_, i) => `(${columnas.map((__, j) => `$${i * columnas.length + j + 1}`).join(", ")})`).join(", ");
  return `INSERT INTO ${tabla} (${columnas.join(", ")}) VALUES ${valores}`;
}
// Un lote = una transacción con dos INSERT de muchas filas: cientos de veces menos idas y
// vueltas que una fila por vez.
export const guardarLote = (productos: unknown[][], precios: unknown[][]) => enTransaccionPg(async (cliente) => {
  if (productos.length) await cliente.query(insertMultiple("producto", ["id", "descripcion", "marca", "codigo_barras", "proveedor_preferido_id"], productos), productos.flat());
  if (precios.length) {
    await cliente.query(
      insertMultiple("precio_proveedor", ["id", "producto_id", "proveedor_id", "lista_importada_id", "codigo_proveedor", "descripcion_proveedor", "precio_lista", "descuentos", "costo_neto", "iva", "cantidad_bulto", "precio_bulto", "fecha_lista"], precios),
      precios.flat());
  }
});

export async function archivoDe(id: string) {
  const { rows } = await pool.query<{ archivo_nombre: string; archivo_ruta: string | null }>("SELECT archivo_nombre, archivo_ruta FROM lista_importada WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function estadoDe(id: string) {
  const { rows } = await pool.query(
    `SELECT l.id, l.estado, l.resumen, l.avisos, l.fecha_lista::text, l.archivo_nombre, p.nombre AS proveedor FROM lista_importada l JOIN proveedor p ON p.id = l.proveedor_id WHERE l.id = $1`, [id]);
  return rows[0] ?? null;
}

export type ListaGuardada = { id: string; proveedor_id: string; archivo_nombre: string; archivo_ruta: string; fecha_lista: string; estado: string; lector: string | null; precios_incluyen_iva: boolean; descuento_general: string; descuento_contado: string };
export async function buscarLista(id: string): Promise<ListaGuardada | null> {
  const { rows } = await pool.query<ListaGuardada>(
    `SELECT l.id, l.proveedor_id, l.archivo_nombre, l.archivo_ruta, l.fecha_lista::text, l.estado, p.lector, p.precios_incluyen_iva, p.descuento_general, p.descuento_contado
       FROM lista_importada l JOIN proveedor p ON p.id = l.proveedor_id WHERE l.id = $1`, [id]);
  return rows[0] ?? null;
}

// Las filas no se guardan hasta aplicar: se vuelve a leer el archivo original.
export async function releer(lista: ListaGuardada): Promise<Lectura> {
  const contenido = await readFile(lista.archivo_ruta);
  return leerPlanilla(new File([contenido], lista.archivo_nombre), { lector: lista.lector, precios_incluyen_iva: lista.precios_incluyen_iva, descuento_general: lista.descuento_general, descuento_contado: lista.descuento_contado });
}
