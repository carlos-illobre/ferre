import { randomUUID } from "node:crypto";
import type pg from "pg";

// Sugerencias de "es el mismo artículo" (issue #29): mismo código de barras, o misma
// descripción normalizada (sin acentos, símbolos ni espacios) entre productos de
// proveedores distintos. Se guardan como pendientes; nunca se unen solas.
const NORMALIZAR = "regexp_replace(lower(translate(descripcion, 'áéíóúñÁÉÍÓÚÑ', 'aeiounaeioun')), '[^a-z0-9]+', '', 'g')";

export async function sugerirEquivalencias(db: pg.Pool | pg.PoolClient, productoIds: string[] | null): Promise<number> {
  const filtro = productoIds ? "AND (a.id = ANY($1::uuid[]) OR b.id = ANY($1::uuid[]))" : "";
  const params = productoIds ? [productoIds] : [];
  const { rows } = await db.query<{ a: string; b: string; motivo: string }>(
    `WITH activos AS (
       SELECT id, codigo_barras, ${NORMALIZAR} AS clave, proveedor_preferido_id FROM producto WHERE activo AND reemplazado_por IS NULL
     )
     SELECT LEAST(a.id, b.id) AS a, GREATEST(a.id, b.id) AS b,
            CASE WHEN a.codigo_barras IS NOT NULL AND a.codigo_barras = b.codigo_barras THEN 'codigo_barras' ELSE 'descripcion' END AS motivo
       FROM activos a JOIN activos b ON a.id < b.id
      WHERE (a.proveedor_preferido_id IS DISTINCT FROM b.proveedor_preferido_id)
        AND ((a.codigo_barras IS NOT NULL AND a.codigo_barras = b.codigo_barras) OR (length(a.clave) >= 8 AND a.clave = b.clave))
        ${filtro}`,
    params,
  );
  let nuevas = 0;
  for (const r of rows) {
    const { rowCount } = await db.query(
      `INSERT INTO equivalencia_sugerida (id, producto_a, producto_b, motivo) VALUES ($1, $2, $3, $4) ON CONFLICT (producto_a, producto_b) DO NOTHING`,
      [randomUUID(), r.a, r.b, r.motivo],
    );
    nuevas += rowCount ?? 0;
  }
  return nuevas;
}

// Unir: `conservar` sigue existiendo; `absorber` queda inactivo y todo lo suyo (precios,
// ventas, compras, stock, conteos, consultas) pasa a `conservar`. El proveedor preferido
// pasa a ser el más barato con lista reciente, salvo que ya estuviera fijado a mano.
export async function unirProductos(db: pg.PoolClient, conservar: string, absorber: string): Promise<void> {
  if (conservar === absorber) throw new Error("Es el mismo producto");
  for (const [tabla, columna] of [["precio_proveedor", "producto_id"], ["item_venta", "producto_id"], ["item_compra", "producto_id"], ["movimiento_stock", "producto_id"], ["consulta", "producto_id"]] as const) {
    await db.query(`UPDATE ${tabla} SET ${columna} = $1 WHERE ${columna} = $2`, [conservar, absorber]);
  }
  // Renglones de conteo: si el mismo conteo tiene los dos, se queda con el del conservado.
  await db.query(`DELETE FROM renglon_conteo r WHERE r.producto_id = $2 AND EXISTS (SELECT 1 FROM renglon_conteo x WHERE x.conteo_id = r.conteo_id AND x.producto_id = $1)`, [conservar, absorber]);
  await db.query(`UPDATE renglon_conteo SET producto_id = $1 WHERE producto_id = $2`, [conservar, absorber]);
  await db.query(
    `UPDATE producto c SET
       codigo_barras = COALESCE(c.codigo_barras, a.codigo_barras),
       marca = COALESCE(c.marca, a.marca),
       sector_id = COALESCE(c.sector_id, a.sector_id),
       margen_elegido = COALESCE(c.margen_elegido, a.margen_elegido)
     FROM producto a WHERE c.id = $1 AND a.id = $2`,
    [conservar, absorber],
  );
  await db.query(`UPDATE producto SET activo = false, reemplazado_por = $1 WHERE id = $2`, [conservar, absorber]);
  await db.query(`UPDATE equivalencia_sugerida SET estado = 'rechazada', resuelto_en = now() WHERE estado = 'pendiente' AND (producto_a = $1 OR producto_b = $1)`, [absorber]);
  await elegirPreferidoMasBarato(db, conservar);
}

export async function elegirPreferidoMasBarato(db: pg.Pool | pg.PoolClient, productoId: string): Promise<void> {
  await db.query(
    `UPDATE producto SET proveedor_preferido_id = (
       SELECT proveedor_id FROM (
         SELECT DISTINCT ON (proveedor_id) proveedor_id, costo_neto, fecha_lista FROM precio_proveedor WHERE producto_id = $1 ORDER BY proveedor_id, fecha_lista DESC, creado_en DESC
       ) vigentes WHERE fecha_lista >= current_date - 120 ORDER BY costo_neto ASC LIMIT 1
     ) WHERE id = $1 AND (SELECT count(DISTINCT proveedor_id) FROM precio_proveedor WHERE producto_id = $1) > 0`,
    [productoId],
  );
}
