import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirAdministrador, exigirSesion } from "../autenticacion.js";

// El dueño y el admin dan de alta, cambian de rol o desactivan usuarios; el admin no
// puede tocar dueños ni dar ese rol. No hay contraseñas: autorizar es agregar el Gmail.
export const usuarios = new Hono();
usuarios.use("/*", exigirSesion, exigirAdministrador);

usuarios.get("/", async (c) => {
  const { rows } = await pool.query("SELECT id, email, nombre, rol, activo, creado_en FROM usuario ORDER BY creado_en");
  return c.json(rows);
});

usuarios.post("/", async (c) => {
  const cuerpo = await c.req.json<{ email?: string; nombre?: string; rol?: string }>().catch(() => ({}) as Record<string, string>);
  const email = cuerpo.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return c.json({ error: "Hace falta un correo válido" }, 400);
  if (!cuerpo.nombre?.trim()) return c.json({ error: "Hace falta el nombre" }, 400);
  if (cuerpo.rol !== "dueño" && cuerpo.rol !== "admin" && cuerpo.rol !== "mostrador") return c.json({ error: "El rol es dueño, admin o mostrador" }, 400);
  if (c.get("sesion").usuario.rol === "admin" && cuerpo.rol === "dueño") return c.json({ error: "Un admin no puede crear dueños" }, 403);
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
  const actor = c.get("sesion").usuario;
  const propio = actor.id === id;
  if (propio && (cuerpo.activo === false || (cuerpo.rol && cuerpo.rol !== actor.rol))) {
    return c.json({ error: "No podés desactivarte ni cambiarte el rol a vos mismo" }, 400);
  }
  if (cuerpo.rol !== undefined && !["dueño", "admin", "mostrador"].includes(cuerpo.rol)) return c.json({ error: "El rol es dueño, admin o mostrador" }, 400);
  if (actor.rol === "admin") {
    // El admin no toca dueños ni da ese rol.
    const { rows } = await pool.query<{ rol: string }>("SELECT rol FROM usuario WHERE id = $1", [id]);
    if (rows[0]?.rol === "dueño") return c.json({ error: "Un admin no puede cambiar a un dueño" }, 403);
    if (cuerpo.rol === "dueño") return c.json({ error: "Un admin no puede dar el rol de dueño" }, 403);
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
