import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { pool } from "../db.js";

// Productos: el acceso a los datos (ADR-018). La consulta del catálogo se arma a mano porque
// sus filtros son opcionales; los valores van siempre como parámetros, nunca pegados al texto.
export type ProductoCatalogo = {
  id: string; descripcion: string; marca: string | null; codigo_barras: string | null; unidad: string;
  margen_elegido: number | null;
  proveedor_id: string | null; proveedor: string | null; codigo_proveedor: string | null;
  costo_neto: string | null; iva: string | null; fecha_lista: string | null; lista_importada_id: string | null; explicacion_costo: string[];
  modificado_en: string;
};

// El texto de un producto como lo compara la búsqueda: minúsculas, sin acentos y con todo lo
// que no es letra ni número convertido en espacio.
const TEXTO_NORMALIZADO = "regexp_replace(translate(lower(p.descripcion || ' ' || coalesce(p.marca, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g')";
export function normalizarBusqueda(texto: string): string[] {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

export type FiltrosDelCatalogo = { limite?: string; desde?: string; buscar?: string; codigo?: string; ids?: string };

// El catálogo, entero o por tandas (`limite` y `desde`), y con tres filtros para el celular que
// no guarda el catálogo y busca acá (RF-85): por texto, por código exacto y por lista de ids.
export async function catalogo(q: FiltrosDelCatalogo): Promise<ProductoCatalogo[]> {
  const limite = Math.floor(Number(q.limite));
  const desde = Math.min(Math.max(0, Math.floor(Number(q.desde) || 0)), 10_000_000);
  const conTanda = Number.isFinite(limite) && limite > 0;
  // Tres filtros para el celular que no guarda el catálogo y busca acá (RF-85): por texto
  // (`buscar`), por código de barras o de proveedor exacto (`codigo`) y por una lista de
  // productos (`ids`). Los valores van siempre como parámetros de la consulta.
  const parametros: unknown[] = [];
  const filtros: string[] = [];
  const palabras = normalizarBusqueda(q.buscar ?? "").slice(0, 8);
  for (const palabra of palabras) {
    parametros.push(palabra);
    const n = parametros.length;
    // Como en la aplicación: cada palabra es el comienzo de una palabra de la descripción o
    // la marca, o el comienzo de un código.
    filtros.push(`((' ' || ${TEXTO_NORMALIZADO}) LIKE '% ' || $${n} || '%'
      OR lower(coalesce(p.codigo_barras, '')) LIKE $${n} || '%'
      OR EXISTS (SELECT 1 FROM precio_proveedor c WHERE c.producto_id = p.id AND lower(coalesce(c.codigo_proveedor, '')) LIKE $${n} || '%'))`);
  }
  const codigo = (q.codigo ?? "").trim();
  if (codigo) {
    parametros.push(codigo);
    filtros.push(`(p.codigo_barras = $${parametros.length} OR EXISTS (SELECT 1 FROM precio_proveedor c WHERE c.producto_id = p.id AND c.codigo_proveedor = $${parametros.length}))`);
  }
  const ids = (q.ids ?? "").split(",").map((x) => x.trim()).filter((x) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)).slice(0, 300);
  if (q.ids !== undefined) { parametros.push(ids); filtros.push(`p.id = ANY($${parametros.length}::uuid[])`); }
  const donde = filtros.map((f) => ` AND ${f}`).join("");
  let tanda = "";
  if (conTanda) { parametros.push(Math.min(limite, 20000), desde); tanda = `, p.id LIMIT $${parametros.length - 1} OFFSET $${parametros.length}`; }
  // Una búsqueda trae primero las descripciones más cortas, que es lo que la aplicación muestra arriba.
  const orden = palabras.length ? "length(p.descripcion), p.descripcion" : "p.descripcion";
  const { rows } = await pool.query<ProductoCatalogo>(
    `SELECT p.id, p.descripcion, p.marca, p.codigo_barras, p.unidad, p.margen_elegido, p.modificado_en, p.sector_id, p.foto_url,
            pp.proveedor_id, pr.nombre AS proveedor, pp.codigo_proveedor, pp.costo_neto, pp.iva, pp.fecha_lista::text, pp.lista_importada_id,
            COALESCE(pp.descuentos->'explicacion', '[]'::jsonb) AS explicacion_costo,
            COALESCE(prov.lista, '[]'::json) AS proveedores
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
       ) prov ON true
      WHERE p.activo AND p.reemplazado_por IS NULL${donde}
      ORDER BY ${orden}${tanda}`,
    parametros,
  );
  return rows;
}

// Las únicas columnas de un producto que se cambian desde la aplicación. El nombre de la
// columna va pegado al SQL, así que solo se aceptan estas: cualquier otra hace fallar.
const COLUMNAS_QUE_SE_CAMBIAN = ["margen_elegido", "unidad", "codigo_barras", "proveedor_preferido_id", "foto_url"] as const;
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
