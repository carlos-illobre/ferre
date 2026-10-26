import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Ejecutor } from "./transaccion.js";
import type { EstadoDeDocumento, MedioPago, TipoDeMovimientoDeDinero } from "./tablas.js";
import type { ItemDeVenta } from "../contratos/ventas.js";

// Ventas: el acceso a los datos (ADR-018, etapa 5). Solo lee y escribe; las reglas están en
// `reglas.ts`. «Hoy» es el día del local (Buenos Aires), no el del servidor: a la noche difieren.
const ZONA = "America/Argentina/Buenos_Aires";
const delDiaDelLocal = (columna: string) => sql<string>`(${sql.ref(columna)} AT TIME ZONE ${ZONA})::date`;
const hoyDelLocal = sql<string>`(now() AT TIME ZONE ${ZONA})::date`;

export const ventaPorId = (e: Ejecutor, id: string) =>
  e.selectFrom("venta").select(["id", "total", "estado"]).where("id", "=", id).executeTakeFirst();

export type VentaNueva = { id: string; fecha: string; cliente_id: string | null; medio_pago: MedioPago; total: string; dispositivo_id: string | null };
// El orden de las columnas es el de siempre: id, fecha, cliente, medio, total, dispositivo.
export const insertarVenta = (e: Ejecutor, v: VentaNueva) => e.insertInto("venta").values(v).execute();

export type RenglonNuevo = {
  venta_id: string; orden: number; producto_id: string | null; descripcion: string; cantidad: number; costo_neto: number | null;
  precio_proveedor_id: string | null; margen_aplicado: number | null; precio_unitario: string; explicacion: string;
};
export const insertarRenglon = (e: Ejecutor, r: RenglonNuevo) => e.insertInto("item_venta").values({ id: randomUUID(), ...r }).execute();

export { stockDe } from "./deposito.js";

export const descontarStock = (e: Ejecutor, m: { producto_id: string; cantidad: number; venta_id: string; fecha: string }) =>
  e.insertInto("movimiento_stock").values({ id: randomUUID(), producto_id: m.producto_id, tipo: "venta", cantidad: -m.cantidad, referencia_tipo: "venta", referencia_id: m.venta_id, fecha: m.fecha }).execute();

// La venta de algo que el sistema no tenía en stock (RF-59). La cantidad es el quinto valor.
// Quién la dejó va con su nombre del momento (specs/029).
export const anotarFaltante = (e: Ejecutor, a: { producto_id: string; usuario_id: string; usuario_nombre: string | null; venta_id: string; cantidad: number; detalle: string }) =>
  e.insertInto("anomalia").values({ id: randomUUID(), producto_id: a.producto_id, usuario_id: a.usuario_id, usuario_nombre: a.usuario_nombre, venta_id: a.venta_id, cantidad: a.cantidad, detalle: a.detalle, tipo: "venta_sin_stock" }).execute();

export type FilaDelDia = { id: string; fecha: Date; medio_pago: MedioPago; total: string; estado: EstadoDeDocumento; pagada_en: Date | null; cliente: string | null; cliente_id: string | null; version: Date; correcciones: number; items: Omit<ItemDeVenta, "subtotal">[] };

// Las ventas de un día (sin día, hoy), las más nuevas primero, cada una con sus renglones en orden.
export function ventasDelDia(e: Ejecutor, dia: string | null): Promise<FilaDelDia[]> {
  return e.selectFrom("venta as v")
    .leftJoin("cliente as cl", "cl.id", "v.cliente_id")
    // Un renglón quitado por una corrección no cuenta (019): sigue en la base, en la foto de la corrección.
    .leftJoin("item_venta as i", (j) => j.onRef("i.venta_id", "=", "v.id").on("i.quitado_por", "is", null))
    .leftJoin("producto as p", "p.id", "i.producto_id")
    .select(["v.id", "v.fecha", "v.medio_pago", "v.total", "v.estado", "v.pagada_en", "cl.nombre as cliente", "v.cliente_id", "v.modificado_en as version"])
    // Cuántas veces se corrigió (019): la lista la marca «corregida».
    .select(sql<number>`(SELECT COUNT(*) FROM correccion_venta k WHERE k.venta_id = v.id)::int`.as("correcciones"))
    .select(sql<Omit<ItemDeVenta, "subtotal">[]>`COALESCE(json_agg(json_build_object('id', i.id, 'producto_id', i.producto_id, 'devuelto', i.devuelto, 'descripcion', i.descripcion, 'cantidad', i.cantidad, 'precio_unitario', i.precio_unitario, 'margen_aplicado', i.margen_aplicado, 'explicacion', i.explicacion, 'foto_url', p.foto_url, 'unidad', COALESCE(p.unidad, 'unidad')) ORDER BY i.orden) FILTER (WHERE i.id IS NOT NULL), '[]')`.as("items"))
    .where(delDiaDelLocal("v.fecha"), "=", sql<string>`COALESCE(${dia}::date, ${hoyDelLocal})`)
    .groupBy(["v.id", "cl.nombre"])
    .orderBy("v.fecha", "desc")
    .execute();
}

// La plata que entró o salió en un día por correcciones y cambios (019, ADR-024). `suma` dice si va a
// los totales del día: una corrección hecha el mismo día de la venta ya está en el total de la venta
// (que quedó corregido); una de otro día, o un cambio (que no toca la venta original), se suma aparte.
export function movimientosDelDia(e: Ejecutor, dia: string | null) {
  return e.selectFrom("movimiento_dinero as m").innerJoin("venta as v", "v.id", "m.venta_id")
    .select(["m.id", "m.fecha", "m.tipo", "m.medio_pago", "m.importe", "m.venta_id", "m.correccion_id", "m.cambio_id",
      sql<boolean>`(m.cambio_id IS NOT NULL OR ${delDiaDelLocal("v.fecha")} <> ${delDiaDelLocal("m.fecha")})`.as("suma")])
    // La plata de una venta anulada deja de contar, también la de sus cambios y correcciones (E32).
    .where("v.estado", "=", "confirmada")
    .where(delDiaDelLocal("m.fecha"), "=", sql<string>`COALESCE(${dia}::date, ${hoyDelLocal})`)
    .orderBy("m.fecha", "desc").execute();
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
      // Lo de la venta, sus correcciones y sus cambios (019, E32): queda como si no hubiera existido.
      .where("referencia_tipo", "=", "venta").where("referencia_id", "=", ventaId).where("tipo", "in", ["venta", "correccion", "cambio"]))
    .execute();

// Lo que volvió fallado en un cambio no vuelve al stock al anular: se descuenta de lo que devuelve la anulación.
export const dejarAfueraLoFallado = (e: Ejecutor, ventaId: string) =>
  e.insertInto("movimiento_stock")
    .columns(["id", "producto_id", "tipo", "cantidad", "referencia_tipo", "referencia_id", "fecha", "nota"])
    .expression((eb) => eb.selectFrom("cambio_renglon as r").innerJoin("cambio as c", "c.id", "r.cambio_id")
      .select([sql<string>`gen_random_uuid()`.as("id"), "r.producto_id", sql<"ajuste">`'ajuste'`.as("tipo"), sql<string>`-r.cantidad`.as("cantidad"), sql<string>`'venta'`.as("referencia_tipo"), sql<string>`${ventaId}::uuid`.as("referencia_id"), sql<Date>`now()`.as("fecha"), sql<string>`'anulación de venta: lo fallado no vuelve'`.as("nota")])
      .where("c.venta_id", "=", ventaId).where("r.lado", "=", "vuelve").where("r.fallado", "=", true).where("r.producto_id", "is not", null))
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

// --- Corregir y cambiar (019, ADR-024) ---

// La venta a corregir, bloqueada hasta el final de la transacción (dos personas a la vez no se pisan).
export const ventaParaCorregir = (e: Ejecutor, id: string) =>
  e.selectFrom("venta").select(["id", "fecha", "estado", "total", "medio_pago", "cliente_id", "pagada_en", "modificado_en",
    sql<boolean>`${delDiaDelLocal("fecha")} = ${hoyDelLocal}`.as("de_hoy")]).where("id", "=", id).forUpdate().executeTakeFirst();

// Los renglones que cuentan (no quitados por una corrección), en orden.
export const renglonesVigentes = (e: Ejecutor, ventaId: string) =>
  e.selectFrom("item_venta").select(["id", "orden", "producto_id", "descripcion", "cantidad", "precio_unitario", "margen_aplicado", "devuelto"])
    .where("venta_id", "=", ventaId).where("quitado_por", "is", null).orderBy("orden").execute();

export const ultimoOrden = async (e: Ejecutor, ventaId: string): Promise<number> =>
  Number((await e.selectFrom("item_venta").select(sql<number>`COALESCE(MAX(orden), 0)`.as("n")).where("venta_id", "=", ventaId).executeTakeFirstOrThrow()).n);

export const clienteConCuentaCorriente = async (e: Ejecutor, id: string): Promise<boolean> =>
  Boolean(await e.selectFrom("cliente").select("id").where("id", "=", id).where("cuenta_corriente", "=", true).where("activo", "=", true).executeTakeFirst());

export const insertarCorreccion = (e: Ejecutor, c: { id: string; venta_id: string; usuario_id: string; dispositivo_id: string | null; antes: unknown; despues: unknown; diferencia: number; resuelta: "cobrada" | "devuelta" | "cuenta_corriente" | "sin_diferencia" }) =>
  e.insertInto("correccion_venta").values({ ...c, fecha: sql<Date>`now()`, antes: JSON.stringify(c.antes), despues: JSON.stringify(c.despues), diferencia: c.diferencia.toFixed(2) }).execute();

export const actualizarRenglon = (e: Ejecutor, id: string, r: { cantidad: number; precio_unitario: number; margen_aplicado: number | null }) =>
  e.updateTable("item_venta").set({ cantidad: r.cantidad, precio_unitario: r.precio_unitario.toFixed(2), margen_aplicado: r.margen_aplicado }).where("id", "=", id).execute();

export const quitarRenglon = (e: Ejecutor, id: string, correccionId: string) =>
  e.updateTable("item_venta").set({ quitado_por: correccionId }).where("id", "=", id).execute();

export const actualizarVenta = (e: Ejecutor, id: string, v: { total: number; medio_pago: MedioPago; cliente_id: string | null }) =>
  e.updateTable("venta").set({ total: v.total.toFixed(2), medio_pago: v.medio_pago, cliente_id: v.cliente_id }).where("id", "=", id).execute();

// Un movimiento de stock por una corrección o un cambio: positivo vuelve, negativo sale.
// La unidad en que se vende un producto («unidad», «kg», «m», «l»), para los textos de las anomalías.
export const unidadDe = async (e: Ejecutor, productoId: string): Promise<string> =>
  (await e.selectFrom("producto").select("unidad").where("id", "=", productoId).executeTakeFirst())?.unidad ?? "unidad";

export const moverStock = (e: Ejecutor, m: { producto_id: string; cantidad: number; tipo: "correccion" | "cambio"; venta_id: string; nota: string }) =>
  e.insertInto("movimiento_stock").values({ id: randomUUID(), producto_id: m.producto_id, tipo: m.tipo, cantidad: m.cantidad, referencia_tipo: "venta", referencia_id: m.venta_id, fecha: sql<Date>`now()`, nota: m.nota }).execute();

export const anotarDevueltoFallado = (e: Ejecutor, a: { producto_id: string; usuario_id: string; usuario_nombre: string | null; venta_id: string; cantidad: number; detalle: string }) =>
  e.insertInto("anomalia").values({ id: randomUUID(), tipo: "devuelto_fallado", ...a }).execute();

export const insertarMovimientoDeDinero = (e: Ejecutor, m: { tipo: TipoDeMovimientoDeDinero; medio_pago: MedioPago; cliente_id: string | null; importe: number; venta_id: string; correccion_id?: string; cambio_id?: string; usuario_id: string }) =>
  e.insertInto("movimiento_dinero").values({ id: randomUUID(), fecha: sql<Date>`now()`, ...m, importe: m.importe.toFixed(2), correccion_id: m.correccion_id ?? null, cambio_id: m.cambio_id ?? null }).execute();

// Las ventas de los últimos 15 días con un producto que coincide con lo buscado (019, E11): sin
// distinguir mayúsculas ni tildes, las más nuevas primero, de a 20.
const sinTildes = (x: unknown) => sql<string>`translate(lower(${x}), 'áéíóúüñ', 'aeiouun')`;
export function ventasParaCambio(e: Ejecutor, buscado: string, dias: number) {
  const patron = `%${buscado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}%`;
  return e.selectFrom("venta as v")
    .leftJoin("cliente as cl", "cl.id", "v.cliente_id")
    .innerJoin("item_venta as i", (j) => j.onRef("i.venta_id", "=", "v.id").on("i.quitado_por", "is", null))
    .leftJoin("producto as p", "p.id", "i.producto_id")
    .select(["v.id", "v.fecha", "v.medio_pago", "v.total", "cl.nombre as cliente"])
    .select(sql<{ id: string; producto_id: string | null; descripcion: string; cantidad: string; precio_unitario: string; margen_aplicado: number | null; devuelto: string; foto_url: string | null; unidad: string }[]>`json_agg(json_build_object('id', i.id, 'producto_id', i.producto_id, 'descripcion', i.descripcion, 'cantidad', i.cantidad, 'precio_unitario', i.precio_unitario, 'margen_aplicado', i.margen_aplicado, 'devuelto', i.devuelto, 'foto_url', p.foto_url, 'unidad', COALESCE(p.unidad, 'unidad')) ORDER BY i.orden)`.as("items"))
    .where("v.estado", "=", "confirmada")
    .where("v.fecha", ">=", sql<Date>`now() - make_interval(days => ${dias})`)
    .where((w) => w.exists(w.selectFrom("item_venta as b").select("b.id").whereRef("b.venta_id", "=", "v.id").where("b.quitado_por", "is", null)
      .where(sinTildes(sql.ref("b.descripcion")), "like", patron)))
    .groupBy(["v.id", "cl.nombre"])
    .orderBy("v.fecha", "desc").limit(20).execute();
}

export const insertarCambio = (e: Ejecutor, c: { id: string; venta_id: string; usuario_id: string; dispositivo_id: string | null; diferencia: number; resuelto: "cobrado" | "devuelto" | "cuenta_corriente" | "sin_diferencia" }) =>
  e.insertInto("cambio").values({ ...c, fecha: sql<Date>`now()`, diferencia: c.diferencia.toFixed(2) }).execute();

export const insertarRenglonDeCambio = (e: Ejecutor, r: { cambio_id: string; lado: "vuelve" | "se_lleva"; item_venta_id: string | null; producto_id: string | null; descripcion: string; cantidad: number; precio_unitario: number; margen_aplicado: number | null; fallado: boolean }) =>
  e.insertInto("cambio_renglon").values({ id: randomUUID(), ...r, precio_unitario: r.precio_unitario.toFixed(2) }).execute();

export const sumarDevuelto = (e: Ejecutor, itemId: string, cantidad: number) =>
  e.updateTable("item_venta").set({ devuelto: sql`devuelto + ${cantidad}` }).where("id", "=", itemId).execute();
