import { randomUUID } from "node:crypto";
import type pg from "pg";

// Sugerencias de "es el mismo artículo" (issue #29): mismo código de barras, o misma
// descripción normalizada (sin acentos, símbolos ni espacios) entre productos de
// proveedores distintos. Se guardan como pendientes; nunca se unen solas.
//
// Dos cruces por igualdad (uno por código, otro por descripción) para que la base use
// un hash join: un solo cruce con OR se volvía cuadrático y tardaba minutos con miles de
// productos nuevos.
const NORMALIZAR = "regexp_replace(lower(translate(descripcion, 'áéíóúñÁÉÍÓÚÑ', 'aeiounaeioun')), '[^a-z0-9]+', '', 'g')";

export async function sugerirEquivalencias(db: pg.Pool | pg.PoolClient, productoIds: string[] | null): Promise<number> {
  const soloNuevos = productoIds ? "AND (a.id = ANY($1::uuid[]) OR b.id = ANY($1::uuid[]))" : "";
  const params = productoIds ? [productoIds] : [];
  const { rows } = await db.query<{ a: string; b: string; motivo: string }>(
    `WITH activos AS (
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
     SELECT DISTINCT ON (a, b) a, b, motivo FROM (SELECT * FROM por_codigo UNION ALL SELECT * FROM por_descripcion) x ORDER BY a, b, motivo`,
    params,
  );
  if (rows.length === 0) return 0;
  // Un solo INSERT de muchas filas; las que ya existían no cuentan.
  let nuevas = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const lote = rows.slice(i, i + 500);
    const valores = lote.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`).join(", ");
    const { rowCount } = await db.query(
      `INSERT INTO equivalencia_sugerida (id, producto_a, producto_b, motivo) VALUES ${valores} ON CONFLICT (producto_a, producto_b) DO NOTHING`,
      lote.flatMap((r) => [randomUUID(), r.a, r.b, r.motivo]),
    );
    nuevas += rowCount ?? 0;
  }
  return nuevas;
}

// Unir: `conservar` sigue existiendo; `absorber` queda inactivo y todo lo suyo (precios,
// ventas, compras, stock, conteos, consultas) pasa a `conservar`. El proveedor preferido
// pasa a ser el más barato con lista reciente, salvo que ya estuviera fijado a mano.
//
// Devuelve exactamente qué se movió, y eso va al evento `producto.unido`: con ese registro
// la unión se puede deshacer (`separarProductos`) sin adivinar qué era de quién.
const TABLAS_MOVIBLES = ["precio_proveedor", "item_venta", "item_compra", "movimiento_stock", "consulta", "renglon_conteo"] as const;
export type Movidos = {
  movidos: Record<(typeof TABLAS_MOVIBLES)[number], string[]>;
  renglones_borrados: Record<string, unknown>[];
  conservado_antes: { codigo_barras: string | null; marca: string | null; sector_id: string | null; margen_elegido: number | null; proveedor_preferido_id: string | null };
  absorbido_antes: { proveedor_preferido_id: string | null };
};
export async function unirProductos(db: pg.PoolClient, conservar: string, absorber: string): Promise<Movidos> {
  if (conservar === absorber) throw new Error("Es el mismo producto");
  const antes = await db.query("SELECT id, codigo_barras, marca, sector_id, margen_elegido, proveedor_preferido_id FROM producto WHERE id IN ($1, $2)", [conservar, absorber]);
  const c0 = antes.rows.find((r) => r.id === conservar)!;
  const a0 = antes.rows.find((r) => r.id === absorber)!;
  // Renglones de conteo: si el mismo conteo tiene los dos, se queda con el del conservado.
  const borrados = await db.query(`DELETE FROM renglon_conteo r WHERE r.producto_id = $2 AND EXISTS (SELECT 1 FROM renglon_conteo x WHERE x.conteo_id = r.conteo_id AND x.producto_id = $1) RETURNING *`, [conservar, absorber]);
  const movidos = {} as Movidos["movidos"];
  for (const tabla of TABLAS_MOVIBLES) {
    const { rows } = await db.query<{ id: string }>(`UPDATE ${tabla} SET producto_id = $1 WHERE producto_id = $2 RETURNING id`, [conservar, absorber]);
    movidos[tabla] = rows.map((r) => r.id);
  }
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
  return {
    movidos, renglones_borrados: borrados.rows,
    conservado_antes: { codigo_barras: c0.codigo_barras, marca: c0.marca, sector_id: c0.sector_id, margen_elegido: c0.margen_elegido, proveedor_preferido_id: c0.proveedor_preferido_id },
    absorbido_antes: { proveedor_preferido_id: a0.proveedor_preferido_id },
  };
}

// Deshacer una unión: cada precio, venta, compra, movimiento, consulta y renglón vuelve al
// producto absorbido, que vuelve a estar activo. Lo que ambos productos hayan cambiado
// después de la unión (ventas nuevas al conservado, por ejemplo) se queda donde está.
export async function separarProductos(db: pg.PoolClient, conservar: string, absorbido: string, registro: Movidos): Promise<void> {
  for (const tabla of TABLAS_MOVIBLES) {
    const ids = registro.movidos[tabla] ?? [];
    if (ids.length) await db.query(`UPDATE ${tabla} SET producto_id = $1 WHERE id = ANY($2::uuid[]) AND producto_id = $3`, [absorbido, ids, conservar]);
  }
  if (registro.renglones_borrados.length) {
    await db.query(`INSERT INTO renglon_conteo SELECT * FROM jsonb_populate_recordset(NULL::renglon_conteo, $1::jsonb) ON CONFLICT DO NOTHING`, [JSON.stringify(registro.renglones_borrados)]);
  }
  const c = registro.conservado_antes;
  await db.query(
    `UPDATE producto SET codigo_barras = $2, marca = $3, sector_id = $4, margen_elegido = $5, proveedor_preferido_id = $6 WHERE id = $1`,
    [conservar, c.codigo_barras, c.marca, c.sector_id, c.margen_elegido, c.proveedor_preferido_id],
  );
  await db.query(`UPDATE producto SET activo = true, reemplazado_por = NULL, proveedor_preferido_id = $2 WHERE id = $1`, [absorbido, registro.absorbido_antes.proveedor_preferido_id]);
  await elegirPreferidoMasBarato(db, conservar);
  await elegirPreferidoMasBarato(db, absorbido);
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
