import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { emailVerificadoPorGoogle, exigirAdministrador, exigirSesion, limitarIntentos } from "../autenticacion.js";
import { crearSesion, generarToken, hashear, revocarSesion } from "../sesiones.js";

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

// ---- Login por QR (como WhatsApp Web): la laptop crea una vinculación y muestra el
// código en un QR; el celular, ya autenticado, lo lee y aprueba; la laptop retira su
// sesión una sola vez. El código es el secreto: solo lo ve quien tiene la pantalla delante.
const VINCULACION_MINUTOS = 2;

// El token aprobado espera en memoria hasta que la laptop lo retira (un solo proceso,
// ADR-001). Si el proceso se reinicia en esos segundos, la laptop genera otro QR.
const tokensPendientes = new Map<string, string>();

sesiones.post("/vinculaciones", limitarIntentos(20), async (c) => {
  const cuerpo = await c.req.json<{ dispositivo?: string }>().catch(() => ({}) as { dispositivo?: string });
  const codigo = generarToken();
  await pool.query(
    `INSERT INTO vinculacion (id, codigo_hash, dispositivo, expira_en) VALUES ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [randomUUID(), hashear(codigo), dispositivoDe(c.req.header("user-agent"), cuerpo.dispositivo), String(VINCULACION_MINUTOS)],
  );
  return c.json({ codigo, expiraEnSegundos: VINCULACION_MINUTOS * 60 }, 201);
});

sesiones.post("/vinculaciones/:codigo/aprobar", exigirSesion, async (c) => {
  const { usuario } = c.get("sesion");
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rows } = await cliente.query<{ id: string; dispositivo: string | null }>(
      `SELECT id, dispositivo FROM vinculacion
        WHERE codigo_hash = $1 AND aprobada_en IS NULL AND expira_en > now() FOR UPDATE`,
      [hashear(c.req.param("codigo"))],
    );
    const vinculacion = rows[0];
    if (!vinculacion) {
      await cliente.query("ROLLBACK");
      return c.json({ error: "El código venció o ya se usó. Generá uno nuevo en la laptop." }, 404);
    }
    const sesion = await crearSesion(cliente, usuario.id, vinculacion.dispositivo);
    await cliente.query(`UPDATE vinculacion SET aprobada_en = now(), aprobada_por = $2, sesion_id = $3 WHERE id = $1`, [vinculacion.id, usuario.id, sesion.id]);
    await registrarEvento(cliente, { tipo: "sesion.iniciada", usuarioId: usuario.id, contenido: { sesionId: sesion.id, dispositivo: vinculacion.dispositivo, medio: "qr" } });
    await cliente.query("COMMIT");
    tokensPendientes.set(vinculacion.id, sesion.token);
    return c.json({ ok: true, dispositivo: vinculacion.dispositivo });
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
});

// La laptop consulta cada pocos segundos hasta que el celular aprueba.
sesiones.get("/vinculaciones/:codigo", async (c) => {
  const { rows } = await pool.query<{ id: string; aprobada_en: Date | null; retirada_en: Date | null; expira_en: Date }>(
    `SELECT id, aprobada_en, retirada_en, expira_en FROM vinculacion WHERE codigo_hash = $1`,
    [hashear(c.req.param("codigo"))],
  );
  const v = rows[0];
  if (!v) return c.json({ estado: "vencida" }, 404);
  if (v.aprobada_en) {
    if (v.retirada_en) return c.json({ estado: "retirada" });
    const token = tokensPendientes.get(v.id);
    if (!token) return c.json({ estado: "vencida" }, 404); // el proceso se reinició: generar otro QR
    tokensPendientes.delete(v.id);
    await pool.query(`UPDATE vinculacion SET retirada_en = now() WHERE id = $1`, [v.id]);
    return c.json({ estado: "aprobada", token });
  }
  return c.json({ estado: v.expira_en.getTime() < Date.now() ? "vencida" : "pendiente" });
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
