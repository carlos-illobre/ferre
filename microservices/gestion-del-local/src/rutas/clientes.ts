import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirSesion } from "../autenticacion.js";

// Solo los clientes importantes, los que compran a cuenta corriente. El de barrio no se carga.
export const clientes = new Hono();
clientes.use("/*", exigirSesion);

clientes.get("/", async (c) => {
  const { rows } = await pool.query(
    `SELECT cl.id, cl.nombre, cl.telefono, cl.cuenta_corriente,
            COALESCE(SUM(v.total) FILTER (WHERE v.medio_pago = 'cuenta_corriente' AND v.estado = 'confirmada' AND v.pagada_en IS NULL), 0) AS deuda
       FROM cliente cl LEFT JOIN venta v ON v.cliente_id = cl.id
      WHERE cl.activo GROUP BY cl.id ORDER BY cl.nombre`,
  );
  return c.json(rows);
});

clientes.post("/", async (c) => {
  const cuerpo = await c.req.json<{ nombre?: string; telefono?: string; cuenta_corriente?: boolean }>().catch(() => ({}) as Record<string, never>);
  if (!cuerpo.nombre?.trim()) return c.json({ error: "Hace falta el nombre del cliente" }, 400);
  const id = randomUUID();
  await pool.query("INSERT INTO cliente (id, nombre, telefono, cuenta_corriente) VALUES ($1, $2, $3, $4)", [id, cuerpo.nombre.trim(), cuerpo.telefono?.trim() || null, cuerpo.cuenta_corriente ?? true]);
  await registrarEvento(pool, { tipo: "cliente.creado", usuarioId: c.get("sesion").usuario.id, contenido: { id, nombre: cuerpo.nombre.trim() } });
  return c.json({ id, nombre: cuerpo.nombre.trim(), telefono: cuerpo.telefono?.trim() || null, cuenta_corriente: cuerpo.cuenta_corriente ?? true, deuda: "0" }, 201);
});
