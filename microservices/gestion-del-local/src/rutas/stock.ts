import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirSesion } from "../autenticacion.js";

// Stock actual y valorización (issue #33). El stock no es un número guardado: es la suma
// de los movimientos (compras +, ventas −, ajustes ±), así siempre se puede explicar de
// dónde sale (#47). El valor es stock × costo vigente.
export const stock = new Hono();
stock.use("/*", exigirSesion);

// Stock y valor de todos los productos con movimientos o costo. El cliente lo cruza con
// el catálogo que ya tiene en memoria.
stock.get("/", async (c) => {
  const { rows } = await pool.query(
    `WITH movimientos AS (
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
      WHERE p.activo AND (m.producto_id IS NOT NULL)`,
  );
  const porProveedor: Record<string, { unidades: number; valor: number; productos: number }> = {};
  let total = 0;
  for (const r of rows) {
    const nombre = r.proveedor ?? "sin proveedor";
    const entrada = (porProveedor[nombre] ??= { unidades: 0, valor: 0, productos: 0 });
    entrada.unidades += Number(r.stock);
    entrada.valor += Number(r.valor);
    entrada.productos += 1;
    total += Number(r.valor);
  }
  return c.json({ productos: rows, valor_total: Math.round(total * 100) / 100, por_proveedor: porProveedor });
});

// La explicación del stock de un producto: cada movimiento, del más nuevo al más viejo.
stock.get("/:productoId/movimientos", async (c) => {
  const { rows } = await pool.query(
    `SELECT id, tipo, cantidad, referencia_tipo, referencia_id, fecha, nota FROM movimiento_stock WHERE producto_id = $1 ORDER BY fecha DESC, creado_en DESC LIMIT 200`,
    [c.req.param("productoId")],
  );
  return c.json(rows);
});

// Ajuste rápido: "hay tantas". Se registra la diferencia contra el stock actual, con motivo.
stock.post("/:productoId/ajustes", async (c) => {
  const cuerpo = await c.req.json<{ cantidad_real?: number; motivo?: string }>().catch(() => ({}) as Record<string, never>);
  if (typeof cuerpo.cantidad_real !== "number" || !Number.isFinite(cuerpo.cantidad_real) || cuerpo.cantidad_real < 0) return c.json({ error: "Decí cuántas hay (un número mayor o igual a cero)" }, 400);
  const productoId = c.req.param("productoId");
  const { rows } = await pool.query<{ stock: string }>("SELECT COALESCE(SUM(cantidad), 0) AS stock FROM movimiento_stock WHERE producto_id = $1", [productoId]);
  const actual = Number(rows[0]!.stock);
  const diferencia = cuerpo.cantidad_real - actual;
  if (Math.abs(diferencia) < 0.0005) return c.json({ stock: actual, diferencia: 0 });
  const id = randomUUID();
  await pool.query(
    `INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, fecha, nota) VALUES ($1, $2, 'ajuste', $3, 'conteo', NULL, now(), $4)`,
    [id, productoId, diferencia, `había ${actual}, hay ${cuerpo.cantidad_real}${cuerpo.motivo?.trim() ? `: ${cuerpo.motivo.trim()}` : ""}`],
  );
  await registrarEvento(pool, { tipo: "stock.ajustado", usuarioId: c.get("sesion").usuario.id, contenido: { productoId, antes: actual, despues: cuerpo.cantidad_real, motivo: cuerpo.motivo?.trim() || null } });
  return c.json({ stock: cuerpo.cantidad_real, diferencia });
});
