import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { emailVerificadoPorGoogle, exigirAdministrador, exigirSesion, limitarIntentos } from "../autenticacion.js";
import { crearSesion, revocarSesion } from "../sesiones.js";

export const sesiones = new Hono();

function dispositivoDe(userAgent: string | undefined, dado?: string): string {
  return (dado?.trim() || userAgent || "desconocido").slice(0, 120);
}

// Entrar con Google: el cliente manda la credencial del botón de Google; si el correo
// está autorizado y activo, se abre una sesión y se devuelve el token opaco.
sesiones.post("/google", limitarIntentos(10), async (c) => {
  const cuerpo = await c.req.json<{ credencial?: string; dispositivo?: string }>().catch(() => ({}) as { credencial?: string; dispositivo?: string });
  if (!cuerpo.credencial) return c.json({ error: "Falta la credencial de Google" }, 400);
  const email = await emailVerificadoPorGoogle(cuerpo.credencial);
  if (!email) return c.json({ error: "Google no pudo verificar la cuenta" }, 401);
  const { rows } = await pool.query<{ id: string; nombre: string; rol: string }>(
    "SELECT id, nombre, rol FROM usuario WHERE email = $1 AND activo",
    [email],
  );
  const usuario = rows[0];
  if (!usuario) return c.json({ error: `${email} no está autorizado. Pedile al dueño que te dé de alta.` }, 403);
  const dispositivo = dispositivoDe(c.req.header("user-agent"), cuerpo.dispositivo);
  const sesion = await crearSesion(pool, usuario.id, dispositivo);
  await registrarEvento(pool, { tipo: "sesion.iniciada", usuarioId: usuario.id, contenido: { sesionId: sesion.id, dispositivo, medio: "google" } });
  return c.json({ token: sesion.token, usuario: { id: usuario.id, email, nombre: usuario.nombre, rol: usuario.rol } }, 201);
});

sesiones.get("/actual", exigirSesion, (c) => {
  const { id, usuario } = c.get("sesion");
  return c.json({ id, usuario });
});

sesiones.delete("/actual", exigirSesion, async (c) => {
  const { id, usuario } = c.get("sesion");
  await revocarSesion(pool, id);
  await registrarEvento(pool, { tipo: "sesion.cerrada", usuarioId: usuario.id, contenido: { sesionId: id } });
  return c.body(null, 204);
});

// El dueño ve y revoca cualquier sesión abierta.
sesiones.get("/", exigirSesion, exigirAdministrador, async (c) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.dispositivo, s.creada_en, s.ultimo_uso_en, s.expira_en, u.email, u.nombre
       FROM sesion s JOIN usuario u ON u.id = s.usuario_id
      WHERE s.revocada_en IS NULL AND s.expira_en > now()
      ORDER BY s.ultimo_uso_en DESC`,
  );
  return c.json(rows);
});

sesiones.delete("/:id", exigirSesion, exigirAdministrador, async (c) => {
  await revocarSesion(pool, c.req.param("id"));
  await registrarEvento(pool, { tipo: "sesion.revocada", usuarioId: c.get("sesion").usuario.id, contenido: { sesionId: c.req.param("id") } });
  return c.body(null, 204);
});
