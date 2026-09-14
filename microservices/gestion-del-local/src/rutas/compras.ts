import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirSesion } from "../autenticacion.js";

// Ingreso de mercadería (issue #30): reemplaza el papel semanal de gastos y es la mitad
// del stock (lo que entra). Cada renglón suma stock; si el costo de la factura difiere
// del de la lista, pasa a ser el costo vigente de ese producto para ese proveedor, con la
// explicación "según factura", porque el precio de venta sigue la realidad, no la lista.
export const compras = new Hono();
compras.use("/*", exigirSesion);

const COMPROBANTES = ["factura", "remito", "sin_comprobante"] as const;
type ItemEntrada = { producto_id?: string | null; descripcion: string; marca?: string | null; cantidad: number; costo_unitario: number };
type CompraEntrada = { id?: string; proveedor_id: string; fecha?: string; comprobante_tipo: (typeof COMPROBANTES)[number]; comprobante_numero?: string | null; nota?: string | null; items: ItemEntrada[] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validar(v: CompraEntrada): string | null {
  if (v.id && !UUID.test(v.id)) return "El id de la compra tiene que ser un UUID";
  if (!v.proveedor_id || !UUID.test(v.proveedor_id)) return "Elegí el proveedor";
  if (!COMPROBANTES.includes(v.comprobante_tipo)) return `El comprobante es uno de ${COMPROBANTES.join(", ")}`;
  if (v.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(v.fecha)) return "La fecha tiene que ser AAAA-MM-DD";
  if (!Array.isArray(v.items) || v.items.length === 0) return "La compra no tiene productos";
  for (const [i, it] of v.items.entries()) {
    if (!it.descripcion?.trim()) return `El renglón ${i + 1} no tiene descripción`;
    if (!(it.cantidad > 0)) return `El renglón ${i + 1} tiene cantidad inválida`;
    if (!(it.costo_unitario >= 0)) return `El renglón ${i + 1} tiene costo inválido`;
  }
  return null;
}

function fechaLegible(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

compras.post("/", async (c) => {
  const v = await c.req.json<CompraEntrada>().catch(() => ({}) as CompraEntrada);
  const error = validar(v);
  if (error) return c.json({ error }, 400);
  const id = v.id ?? randomUUID();
  const fecha = v.fecha ?? new Date().toISOString().slice(0, 10);
  const usuarioId = c.get("sesion").usuario.id;
  const total = v.items.reduce((s, it) => s + it.cantidad * it.costo_unitario, 0);
  const resultado = { productos_nuevos: 0, costos_actualizados: 0 };

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rows: previa } = await cliente.query<{ id: string; total: string }>("SELECT id, total FROM compra WHERE id = $1", [id]);
    if (previa[0]) { await cliente.query("ROLLBACK"); return c.json({ id, total: Number(previa[0].total), repetida: true }); }
    const { rows: prov } = await cliente.query<{ nombre: string }>("SELECT nombre FROM proveedor WHERE id = $1 AND activo", [v.proveedor_id]);
    if (!prov[0]) { await cliente.query("ROLLBACK"); return c.json({ error: "No existe ese proveedor" }, 404); }
    const comprobante = v.comprobante_tipo === "sin_comprobante" ? "sin comprobante" : `${v.comprobante_tipo} ${v.comprobante_numero?.trim() || "s/n"}`;

    await cliente.query(
      `INSERT INTO compra (id, proveedor_id, fecha, comprobante_tipo, comprobante_numero, total, nota) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, v.proveedor_id, fecha, v.comprobante_tipo, v.comprobante_numero?.trim() || null, total.toFixed(2), v.nota?.trim() || null],
    );
    for (const [orden, it] of v.items.entries()) {
      let productoId = it.producto_id ?? null;
      let codigo: string | null = null;
      if (!productoId) {
        // Producto que no estaba en ninguna lista: nace acá, preferido de este proveedor.
        productoId = randomUUID();
        await cliente.query(`INSERT INTO producto (id, descripcion, marca, proveedor_preferido_id) VALUES ($1, $2, $3, $4)`, [productoId, it.descripcion.trim(), it.marca?.trim() || null, v.proveedor_id]);
        resultado.productos_nuevos++;
      }
      await cliente.query(
        `INSERT INTO item_compra (id, compra_id, orden, producto_id, cantidad, costo_unitario) VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomUUID(), id, orden + 1, productoId, it.cantidad, it.costo_unitario.toFixed(4)],
      );
      await cliente.query(
        `INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, fecha) VALUES ($1, $2, 'compra', $3, 'compra', $4, $5)`,
        [randomUUID(), productoId, it.cantidad, id, fecha],
      );
      // Costo vigente de este producto para este proveedor: si la factura dice otra cosa, manda la factura.
      const { rows: vig } = await cliente.query<{ costo_neto: string; codigo_proveedor: string; iva: string }>(
        `SELECT costo_neto, codigo_proveedor, iva FROM precio_proveedor WHERE producto_id = $1 AND proveedor_id = $2 ORDER BY fecha_lista DESC, creado_en DESC LIMIT 1`,
        [productoId, v.proveedor_id],
      );
      codigo = vig[0]?.codigo_proveedor ?? null;
      const costoVigente = vig[0] ? Number(vig[0].costo_neto) : null;
      if (costoVigente === null || Math.abs(costoVigente - it.costo_unitario) > 0.005) {
        await cliente.query(
          `INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, descripcion_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [randomUUID(), productoId, v.proveedor_id, codigo ?? it.descripcion.trim().slice(0, 60), it.descripcion.trim(), it.costo_unitario.toFixed(4),
            JSON.stringify({ pasos: [], explicacion: [`Costo ${it.costo_unitario.toFixed(2)} según ${comprobante} de ${prov[0].nombre} del ${fechaLegible(fecha)}${costoVigente !== null ? ` (la lista decía ${costoVigente.toFixed(2)})` : ""}`] }),
            it.costo_unitario.toFixed(4), vig[0]?.iva ?? "0.21", fecha],
        );
        resultado.costos_actualizados++;
      }
    }
    await registrarEvento(cliente, { tipo: "compra.registrada", usuarioId, contenido: { id, proveedor: prov[0].nombre, fecha, comprobante, total, items: v.items.length, ...resultado } });
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
  return c.json({ id, total, ...resultado }, 201);
});

compras.get("/", async (c) => {
  const { rows } = await pool.query(
    `SELECT co.id, co.fecha::text, co.comprobante_tipo, co.comprobante_numero, co.total, co.estado, co.nota, co.creado_en, pr.nombre AS proveedor,
            (SELECT count(*) FROM item_compra i WHERE i.compra_id = co.id) AS renglones,
            COALESCE((SELECT json_agg(json_build_object('descripcion', p.descripcion, 'cantidad', i.cantidad, 'costo_unitario', i.costo_unitario) ORDER BY i.orden)
                        FROM item_compra i JOIN producto p ON p.id = i.producto_id WHERE i.compra_id = co.id), '[]'::json) AS items
       FROM compra co JOIN proveedor pr ON pr.id = co.proveedor_id
      ORDER BY co.fecha DESC, co.creado_en DESC LIMIT 50`,
  );
  return c.json(rows);
});

// El papel de gastos de la semana, que ya no se tira: total por proveedor, últimos 7 días.
compras.get("/semana", async (c) => {
  const { rows } = await pool.query(
    `SELECT pr.nombre AS proveedor, SUM(co.total) AS total, count(*) AS compras
       FROM compra co JOIN proveedor pr ON pr.id = co.proveedor_id
      WHERE co.estado = 'confirmada' AND co.fecha >= current_date - 6
      GROUP BY pr.nombre ORDER BY SUM(co.total) DESC`,
  );
  return c.json({ desde: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), por_proveedor: rows, total: rows.reduce((s, r) => s + Number(r.total), 0) });
});

compras.get("/:id", async (c) => {
  const { rows } = await pool.query(
    `SELECT i.orden, i.cantidad, i.costo_unitario, p.descripcion, p.marca FROM item_compra i JOIN producto p ON p.id = i.producto_id WHERE i.compra_id = $1 ORDER BY i.orden`,
    [c.req.param("id")],
  );
  return c.json(rows);
});

// Anular: la compra queda marcada y el stock vuelve con un ajuste. El costo que se
// registró por la factura no se toca: fue real aunque la compra se haya anulado.
compras.post("/:id/anular", async (c) => {
  const { motivo } = await c.req.json<{ motivo?: string }>().catch(() => ({}) as { motivo?: string });
  const id = c.req.param("id");
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rowCount } = await cliente.query("UPDATE compra SET estado = 'anulada' WHERE id = $1 AND estado = 'confirmada'", [id]);
    if (!rowCount) { await cliente.query("ROLLBACK"); return c.json({ error: "La compra no existe o ya está anulada" }, 409); }
    await cliente.query(
      `INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, fecha, nota)
       SELECT gen_random_uuid(), producto_id, 'ajuste', -cantidad, 'compra', $1, now(), 'anulación de compra' FROM item_compra WHERE compra_id = $1`,
      [id],
    );
    await registrarEvento(cliente, { tipo: "compra.anulada", usuarioId: c.get("sesion").usuario.id, contenido: { id, motivo: motivo?.trim() || null } });
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
  return c.body(null, 204);
});
