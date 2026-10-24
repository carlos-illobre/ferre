import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { ProductoDelCatalogo } from "../contratos/productos.js";
import * as archivos from "./archivos.js";
import { base } from "./conexion.js";
import { enUnaFoto } from "./transaccion.js";

// Productos: el acceso a los datos (ADR-018). La consulta del catálogo se escribe a mano; los
// valores van siempre como parámetros, nunca pegados al texto. Se lee para la copia del servidor
// (specs/018): entera una vez y después solo lo que cambió.
// La fila del catálogo, sin el precio: el precio lo suma la regla.
export type ProductoCatalogo = Omit<ProductoDelCatalogo, "precio" | "explicacion_precio" | "margen_del_precio" | "precios">;

// La fila del catálogo como la tiene la copia del servidor (specs/018, RF-124): la de siempre,
// más si sigue a la venta (activo y no unido a otro), todos sus códigos de proveedor, también
// los de listas viejas, que la búsqueda encuentra, y la transacción de su último cambio (null si
// no cambió desde que se anotan), para la descarga a mano (historia 5).
export type FilaDeLaCopia = ProductoCatalogo & { vigente: boolean; codigos: string[]; cambio: string | null };

const CONSULTA_DEL_CATALOGO = sql.raw(`
  SELECT p.id, p.descripcion, p.marca, p.codigo_barras, p.codigo_leido_en, p.unidad, p.margen_elegido, p.modificado_en, p.sector_id, p.foto_url,
         pp.proveedor_id, pr.nombre AS proveedor, pp.codigo_proveedor, pp.costo_neto, pp.iva, pp.fecha_lista::text, pp.lista_importada_id,
         COALESCE(pp.descuentos->'explicacion', '[]'::jsonb) AS explicacion_costo,
         COALESCE(prov.lista, '[]'::json) AS proveedores,
         (p.activo AND p.reemplazado_por IS NULL) AS vigente,
         ARRAY(SELECT DISTINCT c.codigo_proveedor FROM precio_proveedor c WHERE c.producto_id = p.id) AS codigos,
         (SELECT cp.transaccion::text FROM cambio_de_producto cp WHERE cp.producto_id = p.id) AS cambio
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
    ) prov ON true`);

// Lo que se lee para la copia: las filas y la marca desde la que hay que leer la próxima vez.
export type LecturaDeLaCopia = { marca: string; filas: FilaDeLaCopia[]; quitados: string[] };
const POR_PAGINA = 1000;

// El catálogo entero, de a páginas: la primera vez, o si la copia guardada no sirve.
export async function leerCatalogoEntero(): Promise<LecturaDeLaCopia> {
  const { marca, resultado } = await enUnaFoto((trx) => {
    const desde = async (id: string): Promise<FilaDeLaCopia[]> => {
      const { rows } = await sql<FilaDeLaCopia>`${CONSULTA_DEL_CATALOGO} WHERE p.activo AND p.reemplazado_por IS NULL AND p.id > ${id} ORDER BY p.id LIMIT ${POR_PAGINA}`.execute(trx);
      return rows.length < POR_PAGINA ? rows : [...rows, ...(await desde(rows.at(-1)!.id))];
    };
    return desde("00000000-0000-0000-0000-000000000000");
  });
  return { marca, filas: resultado, quitados: [] };
}

// Solo lo que cambió desde la marca: los productos anotados, con su fila (la de uno dado de baja o
// unido dice que no está vigente) o, si ya no existe, entre los quitados. Una marca que esta base
// todavía no alcanzó es de otra base (una restaurada, otro ambiente): no sirve y devuelve null.
export async function leerCambiosDesde(marcaAnterior: string): Promise<LecturaDeLaCopia | null> {
  const { marca, resultado } = await enUnaFoto(async (trx, tope) => {
    if (BigInt(marcaAnterior) > BigInt(tope)) return null;
    const { rows: anotados } = await sql<{ producto_id: string }>`SELECT producto_id FROM cambio_de_producto WHERE transaccion >= ${marcaAnterior}::xid8`.execute(trx);
    const ids = anotados.map((r) => r.producto_id);
    const filas: FilaDeLaCopia[] = [];
    for (let i = 0; i < ids.length; i += POR_PAGINA) {
      const { rows } = await sql<FilaDeLaCopia>`${CONSULTA_DEL_CATALOGO} WHERE p.id = ANY(${ids.slice(i, i + POR_PAGINA)}::uuid[])`.execute(trx);
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
  const sets = Object.entries(cambios).map(([columna, valor]) => {
    if (!(COLUMNAS_QUE_SE_CAMBIAN as readonly string[]).includes(columna)) throw new Error(`No se cambia la columna ${columna} de un producto`);
    return sql`${sql.raw(columna)} = ${valor}`;
  });
  const r = await sql`UPDATE producto SET ${sql.join(sets)} WHERE id = ${id} AND activo`.execute(base);
  return Number(r.numAffectedRows) > 0;
}

// Las fotos de productos van al volumen de datos (junto a los Excel) con un nombre al azar.
export async function guardarFoto(contenido: Buffer, extension: string): Promise<string> {
  const nombre = `${randomUUID()}${extension}`;
  await archivos.guardar("fotos", nombre, contenido);
  return `/fotos/${nombre}`;
}
export const leerFoto = (nombre: string) => archivos.leer(archivos.ruta("fotos", nombre));
