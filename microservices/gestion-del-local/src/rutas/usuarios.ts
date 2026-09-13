import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirRol, exigirSesion } from "../autenticacion.js";

// Solo el dueño da de alta, cambia de rol o desactiva usuarios. No hay contraseñas:
// autorizar es agregar el correo de Google.
export const usuarios = new Hono();
usuarios.use("/*", exigirSesion, exigirRol("dueño"));

usuarios.get("/", async (c) => {
  const { rows } = await pool.query("SELECT id, email, nombre, rol, activo, creado_en FROM usuario ORDER BY creado_en");
  return c.json(rows);
});

usuarios.post("/", async (c) => {
  const cuerpo = await c.req.json<{ email?: string; nombre?: string; rol?: string }>().catch(() => ({}) as Record<string, string>);
  const email = cuerpo.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return c.json({ error: "Hace falta un correo válido" }, 400);
  if (!cuerpo.nombre?.trim()) return c.json({ error: "Hace falta el nombre" }, 400);
  if (cuerpo.rol !== "dueño" && cuerpo.rol !== "mostrador") return c.json({ error: "El rol es dueño o mostrador" }, 400);
  const id = randomUUID();
  try {
    await pool.query("INSERT INTO usuario (id, email, nombre, rol) VALUES ($1, $2, $3, $4)", [id, email, cuerpo.nombre.trim(), cuerpo.rol]);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return c.json({ error: `${email} ya existe` }, 409);
    throw error;
  }
  await registrarEvento(pool, { tipo: "usuario.creado", usuarioId: c.get("sesion").usuario.id, contenido: { id, email, rol: cuerpo.rol } });
  return c.json({ id, email, nombre: cuerpo.nombre.trim(), rol: cuerpo.rol, activo: true }, 201);
});

usuarios.patch("/:id", async (c) => {
  const cuerpo = await c.req.json<{ rol?: string; activo?: boolean; nombre?: string }>().catch(() => ({}) as Record<string, never>);
  const id = c.req.param("id");
  const propio = c.get("sesion").usuario.id === id;
  if (propio && (cuerpo.activo === false || (cuerpo.rol && cuerpo.rol !== "dueño"))) {
    return c.json({ error: "No podés desactivarte ni quitarte el rol de dueño a vos mismo" }, 400);
  }
  const { rowCount } = await pool.query(
    `UPDATE usuario SET rol = COALESCE($2, rol), activo = COALESCE($3, activo), nombre = COALESCE($4, nombre) WHERE id = $1`,
    [id, cuerpo.rol ?? null, cuerpo.activo ?? null, cuerpo.nombre?.trim() || null],
  );
  if (!rowCount) return c.json({ error: "No existe ese usuario" }, 404);
  if (cuerpo.activo === false) await pool.query("UPDATE sesion SET revocada_en = now() WHERE usuario_id = $1 AND revocada_en IS NULL", [id]);
  await registrarEvento(pool, { tipo: "usuario.modificado", usuarioId: c.get("sesion").usuario.id, contenido: { id, cambios: cuerpo } });
  return c.body(null, 204);
});
