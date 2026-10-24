import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { base } from "./conexion.js";
import type { Ejecutor } from "./transaccion.js";

// Sugerencias de "es el mismo artículo" (issue #29): mismo código de barras, o misma
// descripción normalizada (sin acentos, símbolos ni espacios) entre productos de
// proveedores distintos. Se guardan como pendientes; nunca se unen solas.
//
// Dos cruces por igualdad (uno por código, otro por descripción) para que la base use
// un hash join: un solo cruce con OR se volvía cuadrático y tardaba minutos con miles de
// productos nuevos.
// Con alias: la prueba del SQL con parámetros reconoce `sql<Tipo>` sin anidar.
type Fila = Record<string, unknown>;

const NORMALIZAR = sql.raw("regexp_replace(lower(translate(descripcion, 'áéíóúñÁÉÍÓÚÑ', 'aeiounaeioun')), '[^a-z0-9]+', '', 'g')");

export async function sugerirEquivalencias(e: Ejecutor, productoIds: string[] | null): Promise<number> {
  const soloNuevos = productoIds ? sql`AND (a.id = ANY(${productoIds}::uuid[]) OR b.id = ANY(${productoIds}::uuid[]))` : sql``;
  const { rows } = await sql<{ a: string; b: string; motivo: string }>`
    WITH activos AS (
       SELECT id, codigo_barras, ${NORMALIZAR} AS clave, proveedor_preferido_id FROM producto WHERE activo AND reemplazado_por IS NULL
     ),
     por_codigo AS (
       SELECT LEAST(a.id, b.id) AS a, GREATEST(a.id, b.id) AS b, 'codigo_barras' AS motivo
         FROM activos a JOIN activos b ON a.codigo_barras = b.codigo_barras AND a.id < b.id
        WHERE a.codigo_barras IS NOT NULL AND a.proveedor_preferido_id IS DISTINCT FROM b.proveedor_preferido_id ${soloNuevos}
     ),
     por_descripcion AS (
       SELECT LEAST(a.id, b.id) AS a, GREATEST(a.id, b.id) AS b, 'descripcion' AS motivo
         FROM activos a JOIN activos b ON a.clave = b.clave AND a.id < b.id
        WHERE length(a.clave) >= 8 AND a.proveedor_preferido_id IS DISTINCT FROM b.proveedor_preferido_id ${soloNuevos}
     )
     SELECT DISTINCT ON (a, b) a, b, motivo FROM (SELECT * FROM por_codigo UNION ALL SELECT * FROM por_descripcion) x ORDER BY a, b, motivo`.execute(e);
  // De a 500 por INSERT; las que ya existían no cuentan.
  let nuevas = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const lote = rows.slice(i, i + 500).map((r) => sql`(${randomUUID()}, ${r.a}, ${r.b}, ${r.motivo})`);
    const r = await sql`INSERT INTO equivalencia_sugerida (id, producto_a, producto_b, motivo) VALUES ${sql.join(lote)} ON CONFLICT (producto_a, producto_b) DO NOTHING`.execute(e);
    nuevas += Number(r.numAffectedRows);
  }
  return nuevas;
}

// Las sugerencias pendientes, las más nuevas primero, y lo que se muestra de cada producto.
export const pendientes = () => sql<{ id: string; producto_a: string; producto_b: string; motivo: string; creado_en: string }>`
  SELECT id, producto_a, producto_b, motivo, creado_en FROM equivalencia_sugerida WHERE estado = 'pendiente' ORDER BY creado_en DESC LIMIT 100`.execute(base).then((r) => r.rows);

export const resumenDe = (id: string) => sql<Fila>`
  SELECT p.id, p.descripcion, p.marca, p.codigo_barras, pr.nombre AS proveedor, pp.costo_neto, pp.fecha_lista::text
    FROM producto p
    LEFT JOIN LATERAL (SELECT * FROM precio_proveedor x WHERE x.producto_id = p.id ORDER BY x.fecha_lista DESC, x.creado_en DESC LIMIT 1) pp ON true
    LEFT JOIN proveedor pr ON pr.id = pp.proveedor_id
   WHERE p.id = ${id}`.execute(base).then((r) => r.rows[0]);

// Una sugerencia pendiente, trabada hasta el final de la transacción: se resuelve una sola vez.
export const sugerenciaPendiente = (e: Ejecutor, id: string) => sql<{ producto_a: string; producto_b: string }>`
  SELECT producto_a, producto_b FROM equivalencia_sugerida WHERE id = ${id} AND estado = 'pendiente' FOR UPDATE`.execute(e).then((r) => r.rows[0]);

export const resolverSugerencia = (e: Ejecutor, id: string, estado: "unida" | "rechazada", usuarioId: string) =>
  sql`UPDATE equivalencia_sugerida SET estado = ${estado}, resuelto_en = now(), resuelto_por = ${usuarioId} WHERE id = ${id}`.execute(e);

// Cuántos de los dos productos existen y siguen activos.
export const activos = (e: Ejecutor, a: string, b: string) =>
  sql<{ id: string }>`SELECT id FROM producto WHERE id IN (${a}, ${b}) AND activo`.execute(e).then((r) => r.rows.length);

// Las uniones hechas, mientras el absorbido siga dentro del conservado: se pueden separar.
export const unidos = () => sql<{ absorbido_id: string; absorbido: string; conservado_id: string; conservado: string; marca: string | null; foto_url: string | null; unido_en: Date; proveedores: string | null }>`
  SELECT a.id AS absorbido_id, a.descripcion AS absorbido, c.id AS conservado_id, c.descripcion AS conservado, c.marca, c.foto_url, a.modificado_en AS unido_en,
          (SELECT string_agg(DISTINCT pr.nombre, ', ') FROM precio_proveedor pp JOIN proveedor pr ON pr.id = pp.proveedor_id WHERE pp.producto_id = c.id) AS proveedores
     FROM producto a JOIN producto c ON c.id = a.reemplazado_por
    WHERE a.reemplazado_por IS NOT NULL
    ORDER BY a.modificado_en DESC LIMIT 100`.execute(base).then((r) => r.rows);

// Con qué producto está unido, trabado hasta el final de la transacción.
export const reemplazoDe = (e: Ejecutor, id: string) =>
  sql<{ reemplazado_por: string | null }>`SELECT reemplazado_por FROM producto WHERE id = ${id} FOR UPDATE`.execute(e).then((r) => r.rows[0]?.reemplazado_por ?? null);

// El registro de la última unión de un producto (el evento `producto.unido`).
export const ultimaUnion = (e: Ejecutor, absorbido: string) =>
  sql<{ contenido: Movidos & { conservar: string } }>`SELECT contenido FROM evento WHERE tipo = 'producto.unido' AND contenido->>'absorber' = ${absorbido} ORDER BY fecha DESC LIMIT 1`
    .execute(e).then((r) => r.rows[0]?.contenido);

// Unir: `conservar` sigue existiendo; `absorber` queda inactivo y todo lo suyo (precios,
// ventas, compras, stock, conteos, consultas) pasa a `conservar`. El proveedor preferido
// pasa a ser el más barato con lista reciente, salvo que ya estuviera fijado a mano.
//
// Devuelve exactamente qué se movió, y eso va al evento `producto.unido`: con ese registro
// la unión se puede deshacer (`separarProductos`) sin adivinar qué era de quién.
const TABLAS_MOVIBLES = ["precio_proveedor", "item_venta", "item_compra", "movimiento_stock", "consulta", "renglon_conteo"] as const;
type AntesDelConservado = { codigo_barras: string | null; codigo_leido_en: string | null; marca: string | null; sector_id: string | null; margen_elegido: number | null; proveedor_preferido_id: string | null };
export type Movidos = {
  movidos: Record<(typeof TABLAS_MOVIBLES)[number], string[]>;
  renglones_borrados: Fila[];
  conservado_antes: AntesDelConservado;
  absorbido_antes: { proveedor_preferido_id: string | null };
};
export async function unirProductos(e: Ejecutor, conservar: string, absorber: string): Promise<Movidos> {
  const { rows: antes } = await sql<AntesDelConservado & { id: string }>`SELECT id, codigo_barras, codigo_leido_en, marca, sector_id, margen_elegido, proveedor_preferido_id FROM producto WHERE id IN (${conservar}, ${absorber})`.execute(e);
  const { id: _c, ...conservado_antes } = antes.find((r) => r.id === conservar)!;
  const absorbido = antes.find((r) => r.id === absorber)!;
  // Renglones de conteo: si el mismo conteo tiene los dos, se queda con el del conservado.
  const borrados = await sql<Fila>`DELETE FROM renglon_conteo r WHERE r.producto_id = ${absorber} AND EXISTS (SELECT 1 FROM renglon_conteo x WHERE x.conteo_id = r.conteo_id AND x.producto_id = ${conservar}) RETURNING *`.execute(e);
  const movidos = {} as Movidos["movidos"];
  for (const tabla of TABLAS_MOVIBLES) {
    const { rows } = await sql<{ id: string }>`UPDATE ${sql.raw(tabla)} SET producto_id = ${conservar} WHERE producto_id = ${absorber} RETURNING id`.execute(e);
    movidos[tabla] = rows.map((r) => r.id);
  }
  await sql`
    UPDATE producto c SET
       codigo_barras = COALESCE(c.codigo_barras, a.codigo_barras),
       -- El código que pasa del absorbido trae su última lectura (specs/016).
       codigo_leido_en = CASE WHEN c.codigo_barras IS NULL THEN a.codigo_leido_en ELSE c.codigo_leido_en END,
       marca = COALESCE(c.marca, a.marca),
       sector_id = COALESCE(c.sector_id, a.sector_id),
       margen_elegido = COALESCE(c.margen_elegido, a.margen_elegido)
     FROM producto a WHERE c.id = ${conservar} AND a.id = ${absorber}`.execute(e);
  await sql`UPDATE producto SET activo = false, reemplazado_por = ${conservar} WHERE id = ${absorber}`.execute(e);
  await sql`UPDATE equivalencia_sugerida SET estado = 'rechazada', resuelto_en = now() WHERE estado = 'pendiente' AND (producto_a = ${absorber} OR producto_b = ${absorber})`.execute(e);
  await elegirPreferidoMasBarato(e, conservar);
  return { movidos, renglones_borrados: borrados.rows, conservado_antes, absorbido_antes: { proveedor_preferido_id: absorbido.proveedor_preferido_id } };
}

// Deshacer una unión: cada precio, venta, compra, movimiento, consulta y renglón vuelve al
// producto absorbido, que vuelve a estar activo. Lo que ambos productos hayan cambiado
// después de la unión (ventas nuevas al conservado, por ejemplo) se queda donde está.
export async function separarProductos(e: Ejecutor, conservar: string, absorbido: string, registro: Movidos): Promise<void> {
  for (const tabla of TABLAS_MOVIBLES) {
    await sql`UPDATE ${sql.raw(tabla)} SET producto_id = ${absorbido} WHERE id = ANY(${registro.movidos[tabla]}::uuid[]) AND producto_id = ${conservar}`.execute(e);
  }
  await sql`INSERT INTO renglon_conteo SELECT * FROM jsonb_populate_recordset(NULL::renglon_conteo, ${JSON.stringify(registro.renglones_borrados)}::jsonb) ON CONFLICT DO NOTHING`.execute(e);
  const c = registro.conservado_antes;
  await sql`UPDATE producto SET codigo_barras = ${c.codigo_barras}, marca = ${c.marca}, sector_id = ${c.sector_id}, margen_elegido = ${c.margen_elegido}, proveedor_preferido_id = ${c.proveedor_preferido_id}, codigo_leido_en = ${c.codigo_leido_en} WHERE id = ${conservar}`.execute(e);
  await sql`UPDATE producto SET activo = true, reemplazado_por = NULL, proveedor_preferido_id = ${registro.absorbido_antes.proveedor_preferido_id} WHERE id = ${absorbido}`.execute(e);
  await elegirPreferidoMasBarato(e, conservar);
  await elegirPreferidoMasBarato(e, absorbido);
}

export async function elegirPreferidoMasBarato(e: Ejecutor, productoId: string): Promise<void> {
  await sql`
    UPDATE producto SET proveedor_preferido_id = (
       SELECT proveedor_id FROM (
         SELECT DISTINCT ON (proveedor_id) proveedor_id, costo_neto, fecha_lista FROM precio_proveedor WHERE producto_id = ${productoId} ORDER BY proveedor_id, fecha_lista DESC, creado_en DESC
       ) vigentes WHERE fecha_lista >= current_date - 120 ORDER BY costo_neto ASC LIMIT 1
     ) WHERE id = ${productoId} AND (SELECT count(DISTINCT proveedor_id) FROM precio_proveedor WHERE producto_id = ${productoId}) > 0`.execute(e);
}
