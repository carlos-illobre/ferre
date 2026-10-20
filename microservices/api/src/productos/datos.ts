import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import type pg from "pg";
import { pool } from "../db.js";
import type { ProductoDelCatalogo } from "../contratos/productos.js";

// Productos: el acceso a los datos (ADR-018). La consulta del catálogo se escribe a mano; los
// valores van siempre como parámetros, nunca pegados al texto. Se lee para la copia del servidor
// (specs/018): entera una vez y después solo lo que cambió.
// La fila del catálogo, sin el precio: el precio lo suma la regla.
export type ProductoCatalogo = Omit<ProductoDelCatalogo, "precio" | "explicacion_precio" | "margen_del_precio" | "precios">;

// Lo que la búsqueda compara de un producto: minúsculas, sin acentos y con todo lo que no es
// letra ni número convertido en espacio.
export function normalizarBusqueda(texto: string): string[] {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// La fila del catálogo como la tiene la copia del servidor (specs/018, RF-124): la de siempre,
// más si sigue a la venta (activo y no unido a otro) y todos sus códigos de proveedor, también
// los de listas viejas, que la búsqueda encuentra.
export type FilaDeLaCopia = ProductoCatalogo & { vigente: boolean; codigos: string[] };

const CONSULTA_DEL_CATALOGO = `
  SELECT p.id, p.descripcion, p.marca, p.codigo_barras, p.codigo_leido_en, p.unidad, p.margen_elegido, p.modificado_en, p.sector_id, p.foto_url,
         pp.proveedor_id, pr.nombre AS proveedor, pp.codigo_proveedor, pp.costo_neto, pp.iva, pp.fecha_lista::text, pp.lista_importada_id,
         COALESCE(pp.descuentos->'explicacion', '[]'::jsonb) AS explicacion_costo,
         COALESCE(prov.lista, '[]'::json) AS proveedores,
         (p.activo AND p.reemplazado_por IS NULL) AS vigente,
         ARRAY(SELECT DISTINCT c.codigo_proveedor FROM precio_proveedor c WHERE c.producto_id = p.id) AS codigos
    FROM producto p
    LEFT JOIN LATERAL (
      SELECT * FROM precio_proveedor x
       WHERE x.producto_id = p.id
         AND (p.proveedor_preferido_id IS NULL OR x.proveedor_id = p.proveedor_preferido_id)
       ORDER BY x.fecha_lista DESC, x.creado_en DESC LIMIT 1
    ) pp ON true
    LEFT JOIN proveedor pr ON pr.id = pp.proveedor_id
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object('proveedor_id', v.proveedor_id, 'proveedor', v.nombre, 'costo_neto', v.costo_neto, 'fecha_lista', v.fecha_lista, 'codigo_proveedor', v.codigo_proveedor) ORDER BY v.costo_neto) AS lista
        FROM (
          SELECT DISTINCT ON (x.proveedor_id) x.proveedor_id, pv.nombre, x.costo_neto, x.fecha_lista::text, x.codigo_proveedor
            FROM precio_proveedor x JOIN proveedor pv ON pv.id = x.proveedor_id
           WHERE x.producto_id = p.id ORDER BY x.proveedor_id, x.fecha_lista DESC, x.creado_en DESC
        ) v
    ) prov ON true`;

// Lo que se lee para la copia: las filas y la marca desde la que hay que leer la próxima vez.
export type LecturaDeLaCopia = { marca: string; filas: FilaDeLaCopia[]; quitados: string[] };
const POR_PAGINA = 1000;

// Todo en una sola foto de la base: la marca es el «xmin» de esa foto (la transacción más vieja
// en curso), así un cambio que todavía no se veía se lee la próxima vez aunque confirme tarde.
async function enUnaFoto<T>(trabajo: (c: pg.PoolClient, tope: string) => Promise<T>): Promise<{ marca: string; resultado: T }> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const { rows } = await c.query<{ marca: string; tope: string }>("SELECT pg_snapshot_xmin(pg_current_snapshot())::text AS marca, pg_snapshot_xmax(pg_current_snapshot())::text AS tope");
    const resultado = await trabajo(c, rows[0]!.tope);
    await c.query("COMMIT");
    return { marca: rows[0]!.marca, resultado };
  } catch (e) {
    await c.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally { c.release(); }
}

// El catálogo entero, de a páginas: la primera vez, o si la copia guardada no sirve.
export async function leerCatalogoEntero(): Promise<LecturaDeLaCopia> {
  const { marca, resultado } = await enUnaFoto(async (c) => {
    const filas: FilaDeLaCopia[] = [];
    for (let desde = "00000000-0000-0000-0000-000000000000"; ;) {
      const { rows } = await c.query<FilaDeLaCopia>(`${CONSULTA_DEL_CATALOGO} WHERE p.activo AND p.reemplazado_por IS NULL AND p.id > $1 ORDER BY p.id LIMIT $2`, [desde, POR_PAGINA]);
      filas.push(...rows);
      if (rows.length < POR_PAGINA) return filas;
      desde = rows[rows.length - 1]!.id;
    }
  });
  return { marca, filas: resultado, quitados: [] };
}

// Solo lo que cambió desde la marca: los productos anotados, con su fila (la de uno dado de baja o
// unido dice que no está vigente) o, si ya no existe, entre los quitados. Una marca que esta base
// todavía no alcanzó es de otra base (una restaurada, otro ambiente): no sirve y devuelve null.
export async function leerCambiosDesde(marcaAnterior: string): Promise<LecturaDeLaCopia | null> {
  const { marca, resultado } = await enUnaFoto(async (c, tope) => {
    if (BigInt(marcaAnterior) > BigInt(tope)) return null;
    const { rows: anotados } = await c.query<{ producto_id: string }>("SELECT producto_id FROM cambio_de_producto WHERE transaccion >= $1::xid8", [marcaAnterior]);
    const ids = anotados.map((r) => r.producto_id);
    const filas: FilaDeLaCopia[] = [];
    for (let i = 0; i < ids.length; i += POR_PAGINA) {
      const { rows } = await c.query<FilaDeLaCopia>(`${CONSULTA_DEL_CATALOGO} WHERE p.id = ANY($1::uuid[])`, [ids.slice(i, i + POR_PAGINA)]);
      filas.push(...rows);
    }
    const leidos = new Set(filas.map((f) => f.id));
    return { filas, quitados: ids.filter((id) => !leidos.has(id)) };
  });
  return resultado && { marca, ...resultado };
}

// Las únicas columnas de un producto que se cambian desde la aplicación. El nombre de la
// columna va pegado al SQL, así que solo se aceptan estas: cualquier otra hace fallar.
const COLUMNAS_QUE_SE_CAMBIAN = ["margen_elegido", "unidad", "codigo_barras", "codigo_leido_en", "proveedor_preferido_id", "foto_url"] as const;
export type CambiosDeProducto = Partial<Record<(typeof COLUMNAS_QUE_SE_CAMBIAN)[number], unknown>>;

// Cambia las columnas pedidas (ya validadas) de un producto activo; dice si existía.
export async function cambiar(id: string, cambios: CambiosDeProducto): Promise<boolean> {
  const valores: unknown[] = [id];
  const sets = Object.entries(cambios).map(([columna, valor]) => {
    if (!(COLUMNAS_QUE_SE_CAMBIAN as readonly string[]).includes(columna)) throw new Error(`No se cambia la columna ${columna} de un producto`);
    valores.push(valor);
    return `${columna} = $${valores.length}`;
  });
  const { rowCount } = await pool.query(`UPDATE producto SET ${sets.join(", ")} WHERE id = $1 AND activo`, valores);
  return Boolean(rowCount);
}

// Las fotos de productos van al volumen de datos (junto a los Excel) con un nombre al azar.
export const carpetaFotos = () => path.join(config.carpetaListas, "fotos");
export async function guardarFoto(contenido: Buffer, extension: string): Promise<string> {
  const nombre = `${randomUUID()}${extension}`;
  await mkdir(carpetaFotos(), { recursive: true });
  await writeFile(path.join(carpetaFotos(), nombre), contenido);
  return `/fotos/${nombre}`;
}
export const leerFoto = (nombre: string) => readFile(path.join(carpetaFotos(), nombre)).catch(() => null);
