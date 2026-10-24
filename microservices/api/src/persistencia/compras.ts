import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import * as archivos from "./archivos.js";
import { numero } from "./conexion.js";
import type { Ejecutor } from "./transaccion.js";
import type { CompraReciente, RenglonDeCompra } from "../contratos/compras.js";
import type { Enviable } from "../enviable.js";

// Los tipos van con alias: la prueba del SQL con parámetros reconoce `sql<Tipo>` sin anidar.
type Reciente = Enviable<CompraReciente>;
type Renglon = Enviable<RenglonDeCompra>;

// Compras (ingreso de mercadería): el acceso a los datos (ADR-018). Consultas escritas a mano
// con Kysely (`sql`), con el tipo de lo que devuelven; los valores van como parámetros. Las
// fotos de los comprobantes son archivos en una carpeta propia.

export async function guardarFoto(e: Ejecutor, contenido: Buffer, extension: string, usuarioId: string): Promise<string> {
  const archivo = `${randomUUID()}${extension}`;
  await archivos.guardar("comprobantes", archivo, contenido);
  await sql`INSERT INTO foto_comprobante (archivo, usuario_id) VALUES (${archivo}, ${usuarioId})`.execute(e);
  return archivo;
}
export const leerFoto = (archivo: string) => archivos.leer(archivos.ruta("comprobantes", archivo));

export async function compraPorId(e: Ejecutor, id: string): Promise<{ id: string; total: string } | null> {
  return (await sql<{ id: string; total: string }>`SELECT id, total FROM compra WHERE id = ${id}`.execute(e)).rows[0] ?? null;
}
export async function nombreDelProveedorActivo(e: Ejecutor, id: string): Promise<string | null> {
  return (await sql<{ nombre: string }>`SELECT nombre FROM proveedor WHERE id = ${id} AND activo`.execute(e)).rows[0]?.nombre ?? null;
}
export async function pedidoTrabado(e: Ejecutor, id: string): Promise<{ estado: string; proveedor_id: string } | null> {
  return (await sql<{ estado: string; proveedor_id: string }>`SELECT estado, proveedor_id FROM pedido WHERE id = ${id} FOR UPDATE`.execute(e)).rows[0] ?? null;
}

export type CompraNueva = { id: string; proveedor_id: string; fecha: string; comprobante_tipo: string; comprobante_numero: string | null; total: string; nota: string | null; pedido_id: string | null };
export const insertarCompra = (e: Ejecutor, c: CompraNueva) =>
  sql`INSERT INTO compra (id, proveedor_id, fecha, comprobante_tipo, comprobante_numero, total, nota, pedido_id) VALUES (${c.id}, ${c.proveedor_id}, ${c.fecha}, ${c.comprobante_tipo}, ${c.comprobante_numero}, ${c.total}, ${c.nota}, ${c.pedido_id})`.execute(e);
export const tomarFoto = (e: Ejecutor, compraId: string, archivo: string) =>
  sql`UPDATE foto_comprobante SET compra_id = ${compraId} WHERE archivo = ${archivo} AND compra_id IS NULL`.execute(e);

// Producto que no estaba en ninguna lista: nace acá, preferido de este proveedor.
export async function productoNuevo(e: Ejecutor, descripcion: string, marca: string | null, proveedorId: string): Promise<string> {
  const id = randomUUID();
  await sql`INSERT INTO producto (id, descripcion, marca, proveedor_preferido_id) VALUES (${id}, ${descripcion}, ${marca}, ${proveedorId})`.execute(e);
  return id;
}
export async function renglonYStock(e: Ejecutor, compraId: string, orden: number, productoId: string, cantidad: number, costo: string, fecha: string) {
  await sql`INSERT INTO item_compra (id, compra_id, orden, producto_id, cantidad, costo_unitario) VALUES (${randomUUID()}, ${compraId}, ${orden}, ${productoId}, ${cantidad}, ${costo})`.execute(e);
  await sql`INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, fecha) VALUES (${randomUUID()}, ${productoId}, 'compra', ${cantidad}, 'compra', ${compraId}, ${fecha})`.execute(e);
}

// El costo vigente de un producto para un proveedor: la fila más reciente de su lista.
export async function costoVigente(e: Ejecutor, productoId: string, proveedorId: string) {
  return (await sql<{ costo_neto: string; codigo_proveedor: string; iva: string }>`SELECT costo_neto, codigo_proveedor, iva FROM precio_proveedor WHERE producto_id = ${productoId} AND proveedor_id = ${proveedorId} ORDER BY fecha_lista DESC, creado_en DESC LIMIT 1`.execute(e)).rows[0] ?? null;
}
export const nuevoCosto = (e: Ejecutor, p: { productoId: string; proveedorId: string; codigo: string; descripcion: string; costo: string; descuentos: string; iva: string; fecha: string }) =>
  sql`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, descripcion_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista)
      VALUES (${randomUUID()}, ${p.productoId}, ${p.proveedorId}, ${p.codigo}, ${p.descripcion}, ${p.costo}, ${p.descuentos}, ${p.costo}, ${p.iva}, ${p.fecha})`.execute(e);

export const recibidoEnPedido = (e: Ejecutor, pedidoId: string, productoId: string, cantidad: number) =>
  sql`UPDATE item_pedido SET recibido = recibido + ${cantidad} WHERE pedido_id = ${pedidoId} AND producto_id = ${productoId}`.execute(e);
export async function renglonesQueFaltan(e: Ejecutor, pedidoId: string): Promise<number> {
  return numero((await sql<{ faltan: string }>`SELECT count(*) AS faltan FROM item_pedido WHERE pedido_id = ${pedidoId} AND recibido < cantidad`.execute(e)).rows, "faltan");
}
export const estadoDelPedido = (e: Ejecutor, pedidoId: string, estado: string) => sql`UPDATE pedido SET estado = ${estado} WHERE id = ${pedidoId}`.execute(e);

export const recientes = (e: Ejecutor) => sql<Reciente>`SELECT co.id, co.fecha::text, co.comprobante_tipo, co.comprobante_numero, co.total, co.estado, co.nota, co.creado_en, pr.nombre AS proveedor,
        (SELECT '/compras/fotos/' || f.archivo FROM foto_comprobante f WHERE f.compra_id = co.id ORDER BY f.creado_en LIMIT 1) AS foto,
        (SELECT count(*) FROM item_compra i WHERE i.compra_id = co.id) AS renglones,
        COALESCE((SELECT json_agg(json_build_object('descripcion', p.descripcion, 'cantidad', i.cantidad, 'unidad', p.unidad, 'costo_unitario', i.costo_unitario) ORDER BY i.orden)
                    FROM item_compra i JOIN producto p ON p.id = i.producto_id WHERE i.compra_id = co.id), '[]'::json) AS items
   FROM compra co JOIN proveedor pr ON pr.id = co.proveedor_id
  ORDER BY co.fecha DESC, co.creado_en DESC LIMIT 50`.execute(e).then((r) => r.rows);

export const gastosDeLaSemana = (e: Ejecutor) => sql<{ proveedor: string; total: string; compras: string }>`SELECT pr.nombre AS proveedor, SUM(co.total) AS total, count(*) AS compras
   FROM compra co JOIN proveedor pr ON pr.id = co.proveedor_id
  WHERE co.estado = 'confirmada' AND co.fecha >= current_date - 6
  GROUP BY pr.nombre ORDER BY SUM(co.total) DESC`.execute(e).then((r) => r.rows);

export const renglonesDe = (e: Ejecutor, compraId: string) =>
  sql<Renglon>`SELECT i.orden, i.cantidad, i.costo_unitario, p.descripcion, p.marca, p.unidad FROM item_compra i JOIN producto p ON p.id = i.producto_id WHERE i.compra_id = ${compraId} ORDER BY i.orden`.execute(e).then((r) => r.rows);

export async function marcarAnulada(e: Ejecutor, id: string): Promise<boolean> {
  return Number((await sql`UPDATE compra SET estado = 'anulada' WHERE id = ${id} AND estado = 'confirmada'`.execute(e)).numAffectedRows) > 0;
}
// El stock vuelve con un ajuste por cada renglón.
export const devolverStock = (e: Ejecutor, compraId: string) =>
  sql`INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, fecha, nota)
      SELECT gen_random_uuid(), producto_id, 'ajuste', -cantidad, 'compra', ${compraId}, now(), 'anulación de compra' FROM item_compra WHERE compra_id = ${compraId}`.execute(e);
