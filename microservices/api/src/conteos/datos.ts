import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Ejecutor } from "../base.js";

// Sectores y conteos: el acceso a los datos (ADR-018). Consultas escritas a mano con Kysely
// (`sql`), con el tipo de lo que devuelven; los valores van como parámetros.
const stockTeorico = (columna: string) => sql<string>`COALESCE((SELECT sum(cantidad) FROM movimiento_stock m WHERE m.producto_id = ${sql.ref(columna)}), 0)`;

export const sectores = (e: Ejecutor) => sql<{ id: string; nombre: string; orden: number; productos: string; ultimo_conteo: Date | null; conteo_abierto: string | null }>`
  SELECT s.id, s.nombre, s.orden,
         (SELECT count(*) FROM producto p WHERE p.sector_id = s.id AND p.activo) AS productos,
         (SELECT max(cerrado_en) FROM conteo co WHERE co.sector_id = s.id AND co.estado = 'cerrado') AS ultimo_conteo,
         (SELECT id FROM conteo co WHERE co.sector_id = s.id AND co.estado = 'abierto') AS conteo_abierto
    FROM sector s WHERE s.activo ORDER BY s.orden, s.nombre`.execute(e).then((r) => r.rows);

// Va al final de la lista de sectores.
export const insertarSector = (e: Ejecutor, id: string, nombre: string) =>
  sql`INSERT INTO sector (id, nombre, orden) VALUES (${id}, ${nombre}, (SELECT COALESCE(max(orden), 0) + 1 FROM sector))`.execute(e);

export async function conteoAbiertoDe(e: Ejecutor, sectorId: string): Promise<string | null> {
  const { rows } = await sql<{ id: string }>`SELECT id FROM conteo WHERE sector_id = ${sectorId} AND estado = 'abierto'`.execute(e);
  return rows[0]?.id ?? null;
}
export const abrirConteo = (e: Ejecutor, id: string, sectorId: string, usuarioId: string) =>
  sql`INSERT INTO conteo (id, sector_id, abierto_por) VALUES (${id}, ${sectorId}, ${usuarioId})`.execute(e);

export type Cabecera = { id: string; estado: string; abierto_en: Date; cerrado_en: Date | null; resumen: unknown; sector_id: string; sector: string };
export async function cabecera(e: Ejecutor, id: string): Promise<Cabecera | null> {
  const { rows } = await sql<Cabecera>`SELECT co.id, co.estado, co.abierto_en, co.cerrado_en, co.resumen, s.id AS sector_id, s.nombre AS sector
    FROM conteo co JOIN sector s ON s.id = co.sector_id WHERE co.id = ${id}`.execute(e);
  return rows[0] ?? null;
}

export const contados = (e: Ejecutor, conteoId: string) => sql<{ producto_id: string; cantidad_contada: string; contado_en: Date; descripcion: string; marca: string | null; unidad: string; stock_teorico: string }>`
  SELECT r.producto_id, r.cantidad_contada, r.contado_en, p.descripcion, p.marca, p.unidad, ${stockTeorico("r.producto_id")} AS stock_teorico
    FROM renglon_conteo r JOIN producto p ON p.id = r.producto_id WHERE r.conteo_id = ${conteoId} ORDER BY r.contado_en DESC`.execute(e).then((r) => r.rows);

// Productos del sector todavía no contados en este conteo.
export const sinContar = (e: Ejecutor, conteoId: string, sectorId: string) => sql<{ producto_id: string; descripcion: string; marca: string | null; unidad: string; stock_teorico: string }>`
  SELECT p.id AS producto_id, p.descripcion, p.marca, p.unidad, ${stockTeorico("p.id")} AS stock_teorico
    FROM producto p WHERE p.sector_id = ${sectorId} AND p.activo AND p.id NOT IN (SELECT producto_id FROM renglon_conteo WHERE conteo_id = ${conteoId})
   ORDER BY p.descripcion`.execute(e).then((r) => r.rows);

export async function sectorDelConteoAbierto(e: Ejecutor, conteoId: string): Promise<string | null> {
  const { rows } = await sql<{ sector_id: string }>`SELECT sector_id FROM conteo WHERE id = ${conteoId} AND estado = 'abierto'`.execute(e);
  return rows[0]?.sector_id ?? null;
}

// Anota lo contado (o lo corrige) y el producto pasa a ser de ese sector.
export async function contar(e: Ejecutor, conteoId: string, productoId: string, cantidad: number, usuarioId: string, sectorId: string) {
  await sql`INSERT INTO renglon_conteo (id, conteo_id, producto_id, cantidad_contada, contado_por) VALUES (${randomUUID()}, ${conteoId}, ${productoId}, ${cantidad}, ${usuarioId})
     ON CONFLICT (conteo_id, producto_id) DO UPDATE SET cantidad_contada = EXCLUDED.cantidad_contada, contado_en = now(), contado_por = EXCLUDED.contado_por`.execute(e);
  await sql`UPDATE producto SET sector_id = ${sectorId} WHERE id = ${productoId} AND (sector_id IS NULL OR sector_id <> ${sectorId})`.execute(e);
}

export const descontar = (e: Ejecutor, conteoId: string, productoId: string) =>
  sql`DELETE FROM renglon_conteo WHERE conteo_id = ${conteoId} AND producto_id = ${productoId} AND EXISTS (SELECT 1 FROM conteo WHERE id = ${conteoId} AND estado = 'abierto')`.execute(e);

// El conteo abierto, trabado hasta terminar la transacción (para cerrarlo una sola vez).
export async function abiertoParaCerrar(e: Ejecutor, id: string): Promise<{ sector_id: string; sector: string } | null> {
  const { rows } = await sql<{ sector_id: string; sector: string }>`SELECT co.sector_id, s.nombre AS sector FROM conteo co JOIN sector s ON s.id = co.sector_id WHERE co.id = ${id} AND co.estado = 'abierto' FOR UPDATE`.execute(e);
  return rows[0] ?? null;
}

export const contadosParaCerrar = (e: Ejecutor, conteoId: string) => sql<{ producto_id: string; cantidad_contada: string; stock_teorico: string }>`
  SELECT r.producto_id, r.cantidad_contada, ${stockTeorico("r.producto_id")} AS stock_teorico FROM renglon_conteo r WHERE r.conteo_id = ${conteoId}`.execute(e).then((r) => r.rows);

export const sinContarParaCerrar = (e: Ejecutor, conteoId: string, sectorId: string) => sql<{ id: string; stock_teorico: string }>`
  SELECT p.id, ${stockTeorico("p.id")} AS stock_teorico
    FROM producto p WHERE p.sector_id = ${sectorId} AND p.activo AND p.id NOT IN (SELECT producto_id FROM renglon_conteo WHERE conteo_id = ${conteoId})`.execute(e).then((r) => r.rows);

export const ajuste = (e: Ejecutor, productoId: string, cantidad: number, conteoId: string, nota: string) =>
  e.insertInto("movimiento_stock").values({ id: randomUUID(), producto_id: productoId, tipo: "ajuste", cantidad, referencia_tipo: "conteo", referencia_id: conteoId, fecha: sql<Date>`now()`, nota }).execute();

export const marcarCerrado = (e: Ejecutor, id: string, usuarioId: string, resumen: unknown) =>
  sql`UPDATE conteo SET estado = 'cerrado', cerrado_en = now(), cerrado_por = ${usuarioId}, resumen = ${JSON.stringify(resumen)} WHERE id = ${id}`.execute(e);
