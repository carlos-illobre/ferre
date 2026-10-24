import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { numero } from "./conexion.js";
import { enUnaFoto, type Ejecutor } from "./transaccion.js";

// Stock: el acceso a los datos (ADR-018). El stock no es un número guardado: es la suma de los
// movimientos (compras +, ventas −, ajustes ±), así siempre se puede explicar de dónde sale (#47).
export async function stockDe(e: Ejecutor, productoId: string): Promise<number> {
  return numero(await e.selectFrom("movimiento_stock").select(sql<string>`COALESCE(SUM(cantidad), 0)`.as("stock")).where("producto_id", "=", productoId).execute(), "stock");
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

// El stock que cambió desde una marca, para la descarga a mano (specs/018, historia 5): el de los
// productos con algún movimiento anotado desde entonces (sin marca, el de todos los que tienen
// movimientos). Todo en una sola foto: la marca nueva es su «xmin», así un movimiento que confirma
// tarde se lee la próxima vez.
export async function stockQueCambio(marcaAnterior: string | null): Promise<{ marca: string; stock: Record<string, string> }> {
  const { marca, resultado } = await enUnaFoto((trx) => (marcaAnterior === null
    ? sql<{ producto_id: string; stock: string }>`SELECT producto_id, SUM(cantidad)::text AS stock FROM movimiento_stock GROUP BY producto_id`
    : sql<{ producto_id: string; stock: string }>`SELECT producto_id, SUM(cantidad)::text AS stock FROM movimiento_stock WHERE producto_id IN (SELECT producto_id FROM movimiento_stock WHERE transaccion >= ${marcaAnterior}::xid8) GROUP BY producto_id`
  ).execute(trx));
  return { marca, stock: Object.fromEntries(resultado.rows.map((r) => [r.producto_id, r.stock])) };
}

export type FilaDeStock = { id: string; stock: string; costo_neto: string | null; proveedor: string | null; valor: string; ultimo_movimiento: Date | null };

// El stock de cada producto con movimientos y su último movimiento. El costo y el proveedor no se
// leen de acá: los tiene la copia del catálogo del servidor (specs/018, revisión 1.6).
export async function movimientosPorProducto(e: Ejecutor): Promise<{ id: string; stock: string; ultimo_movimiento: Date | null }[]> {
  const { rows } = await sql<{ id: string; stock: string; ultimo_movimiento: Date | null }>`
    SELECT producto_id AS id, SUM(cantidad)::text AS stock, MAX(fecha) AS ultimo_movimiento FROM movimiento_stock GROUP BY producto_id`.execute(e);
  return rows;
}

// La explicación del stock de un producto: sus últimos 200 movimientos, del más nuevo al más viejo.
export const movimientosDe = (e: Ejecutor, productoId: string) =>
  e.selectFrom("movimiento_stock").select(["id", "tipo", "cantidad", "referencia_tipo", "referencia_id", "fecha", "nota"])
    .where("producto_id", "=", productoId).orderBy("fecha", "desc").orderBy("creado_en", "desc").limit(200).execute();

export const anotarAjuste = (e: Ejecutor, a: { producto_id: string; cantidad: number; nota: string }) =>
  e.insertInto("movimiento_stock").values({ id: randomUUID(), producto_id: a.producto_id, tipo: "ajuste", cantidad: a.cantidad, referencia_tipo: "conteo", referencia_id: null, fecha: sql<Date>`now()`, nota: a.nota }).execute();
