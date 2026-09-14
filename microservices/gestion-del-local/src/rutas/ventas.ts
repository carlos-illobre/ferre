import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirSesion } from "../autenticacion.js";

// La venta (issue #15): reemplaza el renglón del cuaderno. Cada ítem guarda costo, margen,
// precio y explicación DE ESE MOMENTO, así el precio se puede explicar para siempre aunque
// el costo cambie (#47). Cada ítem con producto descuenta stock (#33). El id lo genera el
// cliente: una venta hecha sin conexión se reenvía y no se duplica (#18).
export const ventas = new Hono();
ventas.use("/*", exigirSesion);

const MEDIOS = ["efectivo", "mercado_pago", "tarjeta", "cuenta_corriente"] as const;
type Medio = (typeof MEDIOS)[number];
type ItemEntrada = {
  producto_id?: string | null; descripcion: string; cantidad: number; precio_unitario: number;
  costo_neto?: number | null; margen_aplicado?: number | null; explicacion?: unknown; precio_proveedor_id?: string | null;
};
type VentaEntrada = { id?: string; fecha?: string; cliente_id?: string | null; medio_pago: Medio; items: ItemEntrada[]; dispositivo_id?: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validar(v: VentaEntrada): string | null {
  if (v.id && !UUID.test(v.id)) return "El id de la venta tiene que ser un UUID";
  if (!MEDIOS.includes(v.medio_pago)) return `El medio de pago es uno de ${MEDIOS.join(", ")}`;
  if (v.medio_pago === "cuenta_corriente" && !v.cliente_id) return "Una venta a cuenta corriente necesita el cliente";
  if (!Array.isArray(v.items) || v.items.length === 0) return "La venta no tiene productos";
  for (const [i, it] of v.items.entries()) {
    if (!it.descripcion?.trim()) return `El ítem ${i + 1} no tiene descripción`;
    if (!(it.cantidad > 0)) return `El ítem ${i + 1} tiene cantidad inválida`;
    if (!(it.precio_unitario >= 0)) return `El ítem ${i + 1} tiene precio inválido`;
  }
  return null;
}

ventas.post("/", async (c) => {
  const v = await c.req.json<VentaEntrada>().catch(() => ({}) as VentaEntrada);
  const error = validar(v);
  if (error) return c.json({ error }, 400);
  const id = v.id ?? randomUUID();
  const usuarioId = c.get("sesion").usuario.id;
  const total = v.items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rows: previa } = await cliente.query<{ id: string; total: string; estado: string }>("SELECT id, total, estado FROM venta WHERE id = $1", [id]);
    if (previa[0]) {
      // Reenvío de una venta ya guardada (sin conexión, reintento): no se duplica.
      await cliente.query("ROLLBACK");
      return c.json({ id, total: Number(previa[0].total), estado: previa[0].estado, repetida: true });
    }
    await cliente.query(
      `INSERT INTO venta (id, fecha, cliente_id, medio_pago, total, dispositivo_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, v.fecha ?? new Date().toISOString(), v.cliente_id ?? null, v.medio_pago, total.toFixed(2), v.dispositivo_id ?? null],
    );
    for (const [orden, it] of v.items.entries()) {
      await cliente.query(
        `INSERT INTO item_venta (id, venta_id, orden, producto_id, descripcion, cantidad, costo_neto, precio_proveedor_id, margen_aplicado, precio_unitario, explicacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [randomUUID(), id, orden + 1, it.producto_id ?? null, it.descripcion.trim(), it.cantidad, it.costo_neto ?? null, it.precio_proveedor_id ?? null,
          it.margen_aplicado ?? null, it.precio_unitario.toFixed(2), JSON.stringify(it.explicacion ?? {})],
      );
      if (it.producto_id) {
        await cliente.query(
          `INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, fecha) VALUES ($1, $2, 'venta', $3, 'venta', $4, $5)`,
          [randomUUID(), it.producto_id, -it.cantidad, id, v.fecha ?? new Date().toISOString()],
        );
      }
    }
    await registrarEvento(cliente, { tipo: "venta.registrada", usuarioId, dispositivoId: v.dispositivo_id ?? null, contenido: { id, total, medio_pago: v.medio_pago, cliente_id: v.cliente_id ?? null, items: v.items.length } });
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
  return c.json({ id, total, estado: "confirmada" }, 201);
});

// Ventas de un día (hoy por defecto) con sus ítems y el total por medio de pago.
ventas.get("/", async (c) => {
  // "Hoy" es el día del local (Buenos Aires), no el día UTC del servidor: a la noche difieren.
  const dia = c.req.query("dia") || null;
  const { rows } = await pool.query(
    `SELECT v.id, v.fecha, v.medio_pago, v.total, v.estado, v.pagada_en, cl.nombre AS cliente,
            COALESCE(json_agg(json_build_object('descripcion', i.descripcion, 'cantidad', i.cantidad, 'precio_unitario', i.precio_unitario, 'margen_aplicado', i.margen_aplicado, 'explicacion', i.explicacion) ORDER BY i.orden) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
       FROM venta v LEFT JOIN cliente cl ON cl.id = v.cliente_id LEFT JOIN item_venta i ON i.venta_id = v.id
      WHERE (v.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date = COALESCE($1::date, (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)
      GROUP BY v.id, cl.nombre ORDER BY v.fecha DESC`,
    [dia],
  );
  const totales: Record<string, number> = {};
  for (const v of rows) if (v.estado === "confirmada") totales[v.medio_pago] = (totales[v.medio_pago] ?? 0) + Number(v.total);
  return c.json({ dia: dia ?? new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10), ventas: rows, totales, total: Object.values(totales).reduce((a, b) => a + b, 0) });
});

// Anular: la venta queda marcada (no se borra) y el stock vuelve con un ajuste.
ventas.post("/:id/anular", async (c) => {
  const { motivo } = await c.req.json<{ motivo?: string }>().catch(() => ({}) as { motivo?: string });
  const id = c.req.param("id");
  const usuarioId = c.get("sesion").usuario.id;
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rowCount } = await cliente.query("UPDATE venta SET estado = 'anulada' WHERE id = $1 AND estado = 'confirmada'", [id]);
    if (!rowCount) { await cliente.query("ROLLBACK"); return c.json({ error: "La venta no existe o ya está anulada" }, 409); }
    await cliente.query(
      `INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, fecha, nota)
       SELECT gen_random_uuid(), producto_id, 'ajuste', cantidad, 'venta', $1, now(), 'anulación de venta'
         FROM item_venta WHERE venta_id = $1 AND producto_id IS NOT NULL`,
      [id],
    );
    await registrarEvento(cliente, { tipo: "venta.anulada", usuarioId, contenido: { id, motivo: motivo?.trim() || null } });
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
  return c.body(null, 204);
});

// Cuenta corriente: marcar una venta como pagada ("tachar el renglón").
ventas.post("/:id/pagar", async (c) => {
  const { rowCount } = await pool.query("UPDATE venta SET pagada_en = now() WHERE id = $1 AND medio_pago = 'cuenta_corriente' AND estado = 'confirmada' AND pagada_en IS NULL", [c.req.param("id")]);
  if (!rowCount) return c.json({ error: "La venta no es a cuenta corriente, está anulada o ya se pagó" }, 409);
  await registrarEvento(pool, { tipo: "venta.pagada", usuarioId: c.get("sesion").usuario.id, contenido: { id: c.req.param("id") } });
  return c.body(null, 204);
});
