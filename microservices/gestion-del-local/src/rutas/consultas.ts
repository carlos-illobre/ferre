import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { exigirSesion } from "../autenticacion.js";

// Lo que preguntaron y no compraron: demanda que hoy se pierde (docs/proceso-actual.md).
export const consultas = new Hono();
consultas.use("/*", exigirSesion);

consultas.post("/", async (c) => {
  const cuerpo = await c.req.json<{ items?: { producto_id?: string | null; descripcion: string; precio_ofrecido?: number | null }[]; motivo?: string; dispositivo_id?: string | null }>().catch(() => ({}) as Record<string, never>);
  if (!cuerpo.items?.length) return c.json({ error: "No hay nada que registrar" }, 400);
  for (const it of cuerpo.items) {
    if (!it.descripcion?.trim()) continue;
    await pool.query(
      `INSERT INTO consulta (id, fecha, producto_id, descripcion, precio_ofrecido, motivo, dispositivo_id) VALUES ($1, now(), $2, $3, $4, $5, $6)`,
      [randomUUID(), it.producto_id ?? null, it.descripcion.trim(), it.precio_ofrecido ?? null, cuerpo.motivo?.trim() || null, cuerpo.dispositivo_id ?? null],
    );
  }
  return c.body(null, 204);
});

consultas.get("/", async (c) => {
  const { rows } = await pool.query("SELECT id, fecha, descripcion, precio_ofrecido, motivo FROM consulta ORDER BY fecha DESC LIMIT 200");
  return c.json(rows);
});
