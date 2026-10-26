import { randomUUID } from "node:crypto";
import { sql, type Sql } from "kysely";
import type { Ejecutor } from "./transaccion.js";
import type { Pedido as PedidoDelContrato } from "../contratos/pedidos.js";
import type { Enviable } from "../enviable.js";

// Pedidos a proveedores: el acceso a los datos (ADR-018). Consultas escritas a mano con Kysely
// (`sql`), con el tipo de lo que devuelven; los valores van como parámetros.
export type Pedido = Enviable<PedidoDelContrato>;

const seleccion = (donde: ReturnType<Sql["raw"]> | ReturnType<typeof sql>) => sql<Pedido>`
  SELECT pe.id, pe.estado, pe.proveedor_id, pr.nombre AS proveedor, pr.whatsapp, pe.creado_en, pe.enviado_en, pe.cerrado_en,
         pe.enviado_por_nombre AS enviado_por, pe.cerrado_por_nombre AS cerrado_por,
         COALESCE((SELECT json_agg(json_build_object(
                     'producto_id', i.producto_id, 'descripcion', p.descripcion, 'marca', p.marca, 'unidad', p.unidad,
                     'codigo_proveedor', (SELECT pp.codigo_proveedor FROM precio_proveedor pp WHERE pp.producto_id = i.producto_id AND pp.proveedor_id = pe.proveedor_id ORDER BY pp.fecha_lista DESC, pp.creado_en DESC LIMIT 1),
                     'cantidad', i.cantidad, 'costo_estimado', i.costo_estimado, 'recibido', i.recibido) ORDER BY i.orden)
                     FROM item_pedido i JOIN producto p ON p.id = i.producto_id WHERE i.pedido_id = pe.id), '[]'::json) AS items
    FROM pedido pe JOIN proveedor pr ON pr.id = pe.proveedor_id ${donde}`;

// Todos, o solo los que están en esos estados; los últimos 100.
export const lista = (e: Ejecutor, estados: string[] | null) =>
  seleccion(estados ? sql`WHERE pe.estado = ANY(${estados}) ORDER BY COALESCE(pe.enviado_en, pe.creado_en) DESC LIMIT 100` : sql`ORDER BY COALESCE(pe.enviado_en, pe.creado_en) DESC LIMIT 100`).execute(e).then((r) => r.rows);
export const uno = (e: Ejecutor, id: string) => seleccion(sql`WHERE pe.id = ${id}`).execute(e).then((r) => r.rows[0] ?? null);

export async function proveedorActivo(e: Ejecutor, id: string): Promise<boolean> {
  return (await sql`SELECT nombre FROM proveedor WHERE id = ${id} AND activo`.execute(e)).rows.length > 0;
}
export async function estadoTrabado(e: Ejecutor, id: string): Promise<string | null> {
  const { rows } = await sql<{ estado: string }>`SELECT estado FROM pedido WHERE id = ${id} FOR UPDATE`.execute(e);
  return rows[0]?.estado ?? null;
}
export const cambiarProveedor = (e: Ejecutor, id: string, proveedorId: string) => sql`UPDATE pedido SET proveedor_id = ${proveedorId} WHERE id = ${id}`.execute(e);
export const crear = (e: Ejecutor, id: string, proveedorId: string, usuarioId: string) => sql`INSERT INTO pedido (id, proveedor_id, creado_por) VALUES (${id}, ${proveedorId}, ${usuarioId})`.execute(e);

// Los renglones se guardan con el costo de la última lista de ese proveedor, que es el estimado.
export async function reemplazarRenglones(e: Ejecutor, pedidoId: string, proveedorId: string, items: { producto_id: string; cantidad: number }[]) {
  await sql`DELETE FROM item_pedido WHERE pedido_id = ${pedidoId}`.execute(e);
  for (const [orden, it] of items.entries()) {
    await sql`INSERT INTO item_pedido (id, pedido_id, orden, producto_id, cantidad, costo_estimado)
       SELECT ${randomUUID()}, ${pedidoId}, ${orden + 1}, v.producto_id, ${it.cantidad}, (SELECT pp.costo_neto FROM precio_proveedor pp WHERE pp.producto_id = v.producto_id AND pp.proveedor_id = ${proveedorId} ORDER BY pp.fecha_lista DESC, pp.creado_en DESC LIMIT 1)
         FROM (SELECT ${it.producto_id}::uuid AS producto_id) v`.execute(e);
  }
}

export async function borrarBorrador(e: Ejecutor, id: string): Promise<boolean> {
  return Number((await sql`DELETE FROM pedido WHERE id = ${id} AND estado = 'borrador'`.execute(e)).numAffectedRows) > 0;
}

export async function paraMandar(e: Ejecutor, id: string) {
  const { rows } = await sql<{ estado: string; proveedor_id: string; proveedor: string; renglones: string }>`
    SELECT pe.estado, pe.proveedor_id, pr.nombre AS proveedor, (SELECT count(*) FROM item_pedido i WHERE i.pedido_id = pe.id) AS renglones
      FROM pedido pe JOIN proveedor pr ON pr.id = pe.proveedor_id WHERE pe.id = ${id} FOR UPDATE OF pe`.execute(e);
  return rows[0] ?? null;
}
// Quién lo envió o lo cerró va con su nombre del momento (specs/029).
export const marcarEnviado = (e: Ejecutor, id: string, usuarioId: string, nombre: string | null) => sql`UPDATE pedido SET estado = 'enviado', enviado_por = ${usuarioId}, enviado_por_nombre = ${nombre}, enviado_en = now() WHERE id = ${id}`.execute(e);
export const guardarWhatsapp = (e: Ejecutor, proveedorId: string, numero: string) => sql`UPDATE proveedor SET whatsapp = ${numero} WHERE id = ${proveedorId}`.execute(e);

export async function pasarDeEstado(e: Ejecutor, id: string, desde: string, hasta: string, usuarioId: string, nombre: string | null): Promise<boolean> {
  return Number((await sql`UPDATE pedido SET estado = ${hasta}, cerrado_por = ${usuarioId}, cerrado_por_nombre = ${nombre}, cerrado_en = now() WHERE id = ${id} AND estado = ${desde}`.execute(e)).numAffectedRows) > 0;
}
