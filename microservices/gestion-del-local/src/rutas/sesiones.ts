import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { emailVerificadoPorGoogle, exigirPermiso, exigirSesion, limitarIntentos } from "../autenticacion.js";
import { randomUUID } from "node:crypto";
import { anotarDispositivo, cortarVinculosDe, emparejar } from "../emparejamiento.js";
import { crearSesion, generarToken, hashear, revocarSesion, usuarioConPermisos } from "../sesiones.js";

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
  const { rows } = await pool.query<{ id: string }>("SELECT id FROM usuario WHERE email = $1 AND activo", [email]);
  const usuario = rows[0] ? await usuarioConPermisos(pool, rows[0].id) : null;
  if (!usuario) return c.json({ error: `${email} no está autorizado. Pedile a quien administra los usuarios que te dé de alta.` }, 403);
  const dispositivo = dispositivoDe(c.req.header("user-agent"), cuerpo.dispositivo);
  const sesion = await crearSesion(pool, usuario.id, dispositivo);
  await registrarEvento(pool, { tipo: "sesion.iniciada", usuarioId: usuario.id, contenido: { sesionId: sesion.id, dispositivo, medio: "google" } });
  return c.json({ token: sesion.token, usuario }, 201);
});

// ---------- Entrar a la computadora con el celular (RF-76, decisión 57) ----------
// La computadora pide un código y lo muestra como QR. Quien lo lee con el celular y tiene (o
// abre ahí) una sesión, lo aprueba; la computadora, que consulta cada pocos segundos, retira
// entonces su propia sesión, con ese mismo usuario. El código vence a los 5 minutos y sirve
// una sola vez. No hay paso de confirmar: leerlo y entrar con la huella es la confirmación.
const VIGENCIA_DEL_CODIGO_S = 300;
const SIN_CODIGO = "Ese código venció o ya se usó. Leé el que la computadora muestra ahora.";

sesiones.post("/vinculaciones", limitarIntentos(30, "codigo-nuevo"), async (c) => {
  const cuerpo = await c.req.json<{ dispositivo?: string }>().catch(() => ({}) as { dispositivo?: string });
  const id = randomUUID();
  const codigo = generarToken(); // va en el QR
  const clave = generarToken();  // queda en la computadora: con ella retira la sesión
  await pool.query(
    "INSERT INTO vinculacion (id, codigo_hash, clave_hash, dispositivo, expira_en) VALUES ($1, $2, $3, $4, now() + ($5 || ' seconds')::interval)",
    [id, hashear(codigo), hashear(clave), dispositivoDe(c.req.header("user-agent"), cuerpo.dispositivo), String(VIGENCIA_DEL_CODIGO_S)],
  );
  return c.json({ id, codigo, clave, expiraEnSegundos: VIGENCIA_DEL_CODIGO_S }, 201);
});

// El celular, con sesión, aprueba el código que leyó.
sesiones.post("/vinculaciones/aprobar", exigirSesion, async (c) => {
  const { codigo, dispositivo_id } = await c.req.json<{ codigo?: string; dispositivo_id?: string }>().catch(() => ({}) as { codigo?: string; dispositivo_id?: string });
  if (!codigo) return c.json({ error: "Falta el código" }, 400);
  await anotarDispositivo(pool, c.get("sesion").id, dispositivo_id);
  const { rows } = await pool.query<{ id: string; dispositivo: string | null }>(
    "UPDATE vinculacion SET aprobada_en = now(), aprobada_por = $1, celular_sesion_id = $3 WHERE codigo_hash = $2 AND aprobada_en IS NULL AND expira_en > now() RETURNING id, dispositivo",
    [c.get("sesion").usuario.id, hashear(codigo), c.get("sesion").id],
  );
  if (!rows[0]) return c.json({ error: SIN_CODIGO }, 410);
  return c.json({ dispositivo: rows[0].dispositivo });
});

// La computadora pregunta cómo va su código. Cuando fue aprobado, retira la sesión: una sola vez.
sesiones.post("/vinculaciones/:id/estado", limitarIntentos(240, "codigo-estado"), async (c) => {
  const { clave, dispositivo_id } = await c.req.json<{ clave?: string; dispositivo_id?: string }>().catch(() => ({}) as { clave?: string; dispositivo_id?: string });
  if (!clave) return c.json({ error: "Falta la clave" }, 400);
  const id = c.req.param("id");
  type Aprobada = { aprobada_por: string; dispositivo: string | null; celular_sesion_id: string | null };
  const { rows: lista } = await pool.query<Aprobada>(
    "UPDATE vinculacion SET retirada_en = now() WHERE id = $1 AND clave_hash = $2 AND aprobada_en IS NOT NULL AND retirada_en IS NULL RETURNING aprobada_por, dispositivo, celular_sesion_id",
    [id, hashear(clave)],
  ).catch(() => ({ rows: [] as Aprobada[] }));
  if (lista[0]) {
    const usuario = await usuarioConPermisos(pool, lista[0].aprobada_por);
    if (!usuario) return c.json({ estado: "vencida" });
    const sesion = await crearSesion(pool, usuario.id, lista[0].dispositivo);
    await pool.query("UPDATE vinculacion SET sesion_id = $1 WHERE id = $2", [sesion.id, id]);
    await anotarDispositivo(pool, sesion.id, dispositivo_id);
    await registrarEvento(pool, { tipo: "sesion.iniciada", usuarioId: usuario.id, contenido: { sesionId: sesion.id, dispositivo: lista[0].dispositivo, medio: "celular" } });
    // El celular que la dejó entrar queda emparejado con esta computadora (decisión 58).
    const puesto = lista[0].celular_sesion_id ? await emparejar(pool, sesion.id, lista[0].celular_sesion_id, lista[0].dispositivo).catch(() => null) : null;
    if (puesto) await registrarEvento(pool, { tipo: "puesto.vinculado", usuarioId: usuario.id, contenido: { puestoId: puesto.id, medio: "entrada" } });
    return c.json({ estado: "aprobada", token: sesion.token, usuario, puesto });
  }
  const { rows } = await pool.query<{ vigente: boolean }>("SELECT expira_en > now() AND retirada_en IS NULL AS vigente FROM vinculacion WHERE id = $1 AND clave_hash = $2", [id, hashear(clave)])
    .catch(() => ({ rows: [] as { vigente: boolean }[] }));
  return c.json({ estado: rows[0]?.vigente ? "pendiente" : "vencida" });
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
sesiones.get("/", exigirSesion, exigirPermiso("admin.sesiones"), async (c) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.dispositivo, s.creada_en, s.ultimo_uso_en, s.expira_en, u.email, u.nombre
       FROM sesion s JOIN usuario u ON u.id = s.usuario_id
      WHERE s.revocada_en IS NULL AND s.expira_en > now()
      ORDER BY s.ultimo_uso_en DESC`,
  );
  return c.json(rows);
});

sesiones.delete("/:id", exigirSesion, exigirPermiso("admin.sesiones"), async (c) => {
  await revocarSesion(pool, c.req.param("id"));
  // Cerrar a distancia la sesión de un dispositivo corta también su vínculo (decisión 73).
  await cortarVinculosDe(pool, c.req.param("id"));
  await registrarEvento(pool, { tipo: "sesion.revocada", usuarioId: c.get("sesion").usuario.id, contenido: { sesionId: c.req.param("id") } });
  return c.body(null, 204);
});
