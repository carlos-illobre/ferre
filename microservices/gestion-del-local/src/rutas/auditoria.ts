import { Hono } from "hono";
import { pool } from "../db.js";
import { exigirAdministrador, exigirSesion } from "../autenticacion.js";

// Quién hizo qué. Es la tabla de eventos leída por el dueño, filtrable por usuario,
// tipo y fecha. Página de 100.
export const auditoria = new Hono();
auditoria.use("/*", exigirSesion, exigirAdministrador);

auditoria.get("/", async (c) => {
  const { usuario, tipo, desde, hasta } = c.req.query();
  const { rows } = await pool.query(
    `SELECT e.id, e.tipo, e.fecha, e.dispositivo_id, e.contenido, u.email, u.nombre
       FROM evento e LEFT JOIN usuario u ON u.id = e.usuario_id
      WHERE ($1::uuid IS NULL OR e.usuario_id = $1)
        AND ($2::text IS NULL OR e.tipo LIKE $2 || '%')
        AND ($3::timestamptz IS NULL OR e.fecha >= $3)
        AND ($4::timestamptz IS NULL OR e.fecha < $4)
      ORDER BY e.fecha DESC LIMIT 100`,
    [usuario || null, tipo || null, desde || null, hasta || null],
  );
  return c.json(rows);
});
