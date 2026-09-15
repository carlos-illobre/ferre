import { Hono } from "hono";
import { pool } from "../db.js";
import { exigirAdministrador, exigirSesion } from "../autenticacion.js";

// Quién hizo qué. Es la tabla de eventos leída por el dueño, filtrable por usuario,
// tipo y fecha. Página de 100.
export const auditoria = new Hono();
auditoria.use("/*", exigirSesion, exigirAdministrador);

auditoria.get("/", async (c) => {
  const { usuario, tipo, desde, hasta, pagina } = c.req.query();
  // De a 10 por página (pedido del dueño): "quién hizo qué" crece todos los días y no se lee entero.
  const porPagina = 10;
  const nroPagina = Math.max(1, Number(pagina) || 1);
  const filtro = `WHERE ($1::uuid IS NULL OR e.usuario_id = $1)
        AND ($2::text IS NULL OR e.tipo LIKE $2 || '%')
        AND ($3::timestamptz IS NULL OR e.fecha >= $3)
        AND ($4::timestamptz IS NULL OR e.fecha < $4)`;
  const params = [usuario || null, tipo || null, desde || null, hasta || null];
  const [{ rows }, total] = await Promise.all([
    pool.query(
      `SELECT e.id, e.tipo, e.fecha, e.dispositivo_id, e.contenido, u.email, u.nombre
         FROM evento e LEFT JOIN usuario u ON u.id = e.usuario_id ${filtro}
        ORDER BY e.fecha DESC LIMIT ${porPagina} OFFSET ${(nroPagina - 1) * porPagina}`,
      params,
    ),
    pool.query<{ total: string }>(`SELECT count(*) AS total FROM evento e ${filtro}`, params),
  ]);
  return c.json({ eventos: rows, total: Number(total.rows[0]?.total ?? 0), pagina: nroPagina, por_pagina: porPagina });
});
