import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Ejecutor } from "../base.js";

// Stock: el acceso a los datos (ADR-018). El stock no es un número guardado: es la suma de los
// movimientos (compras +, ventas −, ajustes ±), así siempre se puede explicar de dónde sale (#47).
export async function stockDe(e: Ejecutor, productoId: string): Promise<number> {
  const fila = await e.selectFrom("movimiento_stock").select(sql<string>`COALESCE(SUM(cantidad), 0)`.as("stock")).where("producto_id", "=", productoId).executeTakeFirst();
  return Number(fila?.stock ?? 0);
}

// El stock de unos productos puntuales: los de una página de la búsqueda (specs/018). Los que
// nunca tuvieron movimientos no vienen.
export async function stockDeProductos(e: Ejecutor, ids: readonly string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const filas = await e.selectFrom("movimiento_stock").select(["producto_id", sql<string>`SUM(cantidad)::text`.as("stock")])
    .where("producto_id", "in", ids).groupBy("producto_id").execute();
  return Object.fromEntries(filas.map((f) => [f.producto_id, f.stock]));
}

// Qué productos tienen stock, para el filtro «con stock» / «sin stock» del Catálogo (specs/018).
export async function productosConStock(e: Ejecutor): Promise<Set<string>> {
  const filas = await e.selectFrom("movimiento_stock").select("producto_id").groupBy("producto_id").having(sql`SUM(cantidad)`, ">", 0).execute();
  return new Set(filas.map((f) => f.producto_id));
}

export type FilaDeStock = { id: string; stock: string; costo_neto: string | null; proveedor: string | null; valor: string; ultimo_movimiento: Date | null };

// Cada producto activo con movimientos: su stock, su costo vigente (el del proveedor preferido,
// o el más reciente) y el valor, stock × costo.
export async function stockDeTodos(e: Ejecutor): Promise<FilaDeStock[]> {
  const { rows } = await sql<FilaDeStock>`
    WITH movimientos AS (
       SELECT producto_id, SUM(cantidad) AS stock, MAX(fecha) AS ultimo_movimiento FROM movimiento_stock GROUP BY producto_id
     ), costos AS (
       SELECT DISTINCT ON (pp.producto_id) pp.producto_id, pp.costo_neto, pp.proveedor_id, pr.nombre AS proveedor
         FROM precio_proveedor pp JOIN producto p ON p.id = pp.producto_id JOIN proveedor pr ON pr.id = pp.proveedor_id
        WHERE p.proveedor_preferido_id IS NULL OR pp.proveedor_id = p.proveedor_preferido_id
        ORDER BY pp.producto_id, pp.fecha_lista DESC, pp.creado_en DESC
     )
     SELECT p.id, COALESCE(m.stock, 0) AS stock, co.costo_neto, co.proveedor,
            ROUND(COALESCE(m.stock, 0) * COALESCE(co.costo_neto, 0), 2) AS valor, m.ultimo_movimiento
       FROM producto p LEFT JOIN movimientos m ON m.producto_id = p.id LEFT JOIN costos co ON co.producto_id = p.id
      WHERE p.activo AND (m.producto_id IS NOT NULL)`.execute(e);
  return rows;
}

// La explicación del stock de un producto: sus últimos 200 movimientos, del más nuevo al más viejo.
export const movimientosDe = (e: Ejecutor, productoId: string) =>
  e.selectFrom("movimiento_stock").select(["id", "tipo", "cantidad", "referencia_tipo", "referencia_id", "fecha", "nota"])
    .where("producto_id", "=", productoId).orderBy("fecha", "desc").orderBy("creado_en", "desc").limit(200).execute();

export const anotarAjuste = (e: Ejecutor, a: { producto_id: string; cantidad: number; nota: string }) =>
  e.insertInto("movimiento_stock").values({ id: randomUUID(), producto_id: a.producto_id, tipo: "ajuste", cantidad: a.cantidad, referencia_tipo: "conteo", referencia_id: null, fecha: sql<Date>`now()`, nota: a.nota }).execute();
