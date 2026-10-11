import { Hono } from "hono";
import { pool } from "../db.js";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";

// Anomalías (RF-59): el registro de cada vez que el sistema y la realidad no coincidieron.
// Se anotan solas (hoy, al vender algo que según el sistema no tenía stock) y no se editan
// ni se borran: son una auditoría. Más adelante van a disparar avisos.
export const anomalias = new Hono();
anomalias.use("/*", exigirSesion, exigirPermiso("negocio.anomalias"));

const POR_PAGINA = 50;
anomalias.get("/", async (c) => {
  const pagina = Math.max(1, Math.floor(Number(c.req.query("pagina") ?? 1)) || 1);
  const { rows } = await pool.query(
    `SELECT a.id, a.tipo, a.cantidad, a.detalle, a.creado_en, a.venta_id, a.producto_id, p.descripcion AS producto, p.unidad, COALESCE(u.nombre, u.email) AS usuario
       FROM anomalia a JOIN producto p ON p.id = a.producto_id LEFT JOIN usuario u ON u.id = a.usuario_id
      ORDER BY a.creado_en DESC, a.id LIMIT $1 OFFSET $2`,
    [POR_PAGINA + 1, (pagina - 1) * POR_PAGINA],
  );
  return c.json({ pagina, hay_mas: rows.length > POR_PAGINA, anomalias: rows.slice(0, POR_PAGINA) });
});
