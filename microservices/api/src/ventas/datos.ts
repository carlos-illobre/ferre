import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Ejecutor } from "../base.js";
import type { ItemDeVenta } from "../contratos/ventas.js";

// Ventas: el acceso a los datos (ADR-018, etapa 5). Solo lee y escribe; las reglas están en
// `reglas.ts`. «Hoy» es el día del local (Buenos Aires), no el del servidor: a la noche difieren.
const ZONA = "America/Argentina/Buenos_Aires";
const delDiaDelLocal = (columna: string) => sql<string>`(${sql.ref(columna)} AT TIME ZONE ${ZONA})::date`;
const hoyDelLocal = sql<string>`(now() AT TIME ZONE ${ZONA})::date`;

export const ventaPorId = (e: Ejecutor, id: string) =>
  e.selectFrom("venta").select(["id", "total", "estado"]).where("id", "=", id).executeTakeFirst();

export type VentaNueva = { id: string; fecha: string; cliente_id: string | null; medio_pago: "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente"; total: string; dispositivo_id: string | null };
// El orden de las columnas es el de siempre: id, fecha, cliente, medio, total, dispositivo.
export const insertarVenta = (e: Ejecutor, v: VentaNueva) => e.insertInto("venta").values(v).execute();

export type RenglonNuevo = {
  venta_id: string; orden: number; producto_id: string | null; descripcion: string; cantidad: number; costo_neto: number | null;
  precio_proveedor_id: string | null; margen_aplicado: number | null; precio_unitario: string; explicacion: string;
};
export const insertarRenglon = (e: Ejecutor, r: RenglonNuevo) => e.insertInto("item_venta").values({ id: randomUUID(), ...r }).execute();

export { stockDe } from "../deposito/datos.js";

export const descontarStock = (e: Ejecutor, m: { producto_id: string; cantidad: number; venta_id: string; fecha: string }) =>
  e.insertInto("movimiento_stock").values({ id: randomUUID(), producto_id: m.producto_id, tipo: "venta", cantidad: -m.cantidad, referencia_tipo: "venta", referencia_id: m.venta_id, fecha: m.fecha }).execute();

// La venta de algo que el sistema no tenía en stock (RF-59). La cantidad es el quinto valor.
export const anotarFaltante = (e: Ejecutor, a: { producto_id: string; usuario_id: string; venta_id: string; cantidad: number; detalle: string }) =>
  e.insertInto("anomalia").values({ id: randomUUID(), producto_id: a.producto_id, usuario_id: a.usuario_id, venta_id: a.venta_id, cantidad: a.cantidad, detalle: a.detalle, tipo: "venta_sin_stock" }).execute();

export type FilaDelDia = { id: string; fecha: Date; medio_pago: "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente"; total: string; estado: "confirmada" | "anulada"; pagada_en: Date | null; cliente: string | null; items: Omit<ItemDeVenta, "subtotal">[] };

// Las ventas de un día (sin día, hoy), las más nuevas primero, cada una con sus renglones en orden.
export function ventasDelDia(e: Ejecutor, dia: string | null): Promise<FilaDelDia[]> {
  return e.selectFrom("venta as v")
    .leftJoin("cliente as cl", "cl.id", "v.cliente_id")
    .leftJoin("item_venta as i", "i.venta_id", "v.id")
    .leftJoin("producto as p", "p.id", "i.producto_id")
    .select(["v.id", "v.fecha", "v.medio_pago", "v.total", "v.estado", "v.pagada_en", "cl.nombre as cliente"])
    .select(sql<Omit<ItemDeVenta, "subtotal">[]>`COALESCE(json_agg(json_build_object('descripcion', i.descripcion, 'cantidad', i.cantidad, 'precio_unitario', i.precio_unitario, 'margen_aplicado', i.margen_aplicado, 'explicacion', i.explicacion, 'foto_url', p.foto_url) ORDER BY i.orden) FILTER (WHERE i.id IS NOT NULL), '[]')`.as("items"))
    .where(delDiaDelLocal("v.fecha"), "=", sql<string>`COALESCE(${dia}::date, ${hoyDelLocal})`)
    .groupBy(["v.id", "cl.nombre"])
    .orderBy("v.fecha", "desc")
    .execute();
}

// Los productos de las últimas ventas confirmadas, del más reciente al más viejo, sin repetir:
// para la venta vacía (decisión 133). Una sola consulta corta: no recorre días.
export async function ultimosProductosVendidos(e: Ejecutor, cuantos: number): Promise<string[]> {
  const filas = await e.selectFrom("item_venta as i").innerJoin("venta as v", "v.id", "i.venta_id")
    .select(["i.producto_id", sql<Date>`max(v.fecha)`.as("ultima")])
    .where("v.estado", "=", "confirmada").where("i.producto_id", "is not", null)
    .groupBy("i.producto_id").orderBy("ultima", "desc").limit(cuantos).execute();
  return filas.map((f) => f.producto_id!);
}

export async function esDeHoy(e: Ejecutor, id: string): Promise<boolean | null> {
  const fila = await e.selectFrom("venta").select(sql<boolean>`${delDiaDelLocal("fecha")} = ${hoyDelLocal}`.as("de_hoy")).where("id", "=", id).executeTakeFirst();
  return fila ? fila.de_hoy : null;
}

// Marca anulada una venta confirmada; dice si había una para anular.
export async function marcarAnulada(e: Ejecutor, id: string): Promise<boolean> {
  const r = await e.updateTable("venta").set({ estado: "anulada" }).where("id", "=", id).where("estado", "=", "confirmada").executeTakeFirst();
  return r.numUpdatedRows > 0n;
}

// Devuelve al stock lo que la venta descontó de verdad, que puede ser menos de lo vendido.
export const devolverStock = (e: Ejecutor, ventaId: string) =>
  e.insertInto("movimiento_stock")
    .columns(["id", "producto_id", "tipo", "cantidad", "referencia_tipo", "referencia_id", "fecha", "nota"])
    .expression((eb) => eb.selectFrom("movimiento_stock")
      .select([sql<string>`gen_random_uuid()`.as("id"), "producto_id", sql<"ajuste">`'ajuste'`.as("tipo"), sql<string>`-cantidad`.as("cantidad"), sql<string>`'venta'`.as("referencia_tipo"), sql<string>`${ventaId}::uuid`.as("referencia_id"), sql<Date>`now()`.as("fecha"), sql<string>`'anulación de venta'`.as("nota")])
      .where("referencia_tipo", "=", "venta").where("referencia_id", "=", ventaId).where("tipo", "=", "venta"))
    .execute();

// Cuenta corriente: marca pagada una venta confirmada a cuenta corriente que no se pagó; dice si había.
export async function marcarPagada(e: Ejecutor, id: string): Promise<boolean> {
  const r = await e.updateTable("venta").set({ pagada_en: sql<Date>`now()` }).where("id", "=", id)
    .where("medio_pago", "=", "cuenta_corriente").where("estado", "=", "confirmada").where("pagada_en", "is", null).executeTakeFirst();
  return r.numUpdatedRows > 0n;
}

// Lo que preguntaron y no se llevaron: demanda que hoy se pierde.
export const anotarConsulta = (e: Ejecutor, c: { producto_id: string | null; descripcion: string; precio_ofrecido: number | null; motivo: string | null; dispositivo_id: string | null }) =>
  e.insertInto("consulta").values({ id: randomUUID(), fecha: sql<Date>`now()`, ...c }).execute();

export const ultimasConsultas = (e: Ejecutor) =>
  e.selectFrom("consulta").select(["id", "fecha", "descripcion", "precio_ofrecido", "motivo"]).orderBy("fecha", "desc").limit(200).execute();
