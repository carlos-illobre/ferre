import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { pool } from "../db.js";
import { config } from "../config.js";
import { registrarEvento } from "../eventos.js";
import { exigirSesion, limitarIntentos } from "../autenticacion.js";
import { crearSesion } from "../sesiones.js";

// Passkeys (WebAuthn, ADR-011 enmienda): el usuario, ya entrado con Google, vincula su
// celular; desde entonces ese celular entra con la huella, sin Gmail. La clave privada
// vive en el teléfono; acá solo la pública. Atado al dominio del cliente web.
export const credenciales = new Hono();

const rpID = () => new URL(config.origenWeb).hostname;
const NOMBRE_APP = "ferre";

// Los desafíos esperan en memoria unos minutos (un solo proceso, ADR-001): si el proceso
// se reinicia en el medio, el celular vuelve a pedir uno.
const DESAFIO_MINUTOS = 5;
const desafios = new Map<string, { desafio: string; usuarioId: string | null; vence: number }>();
function guardarDesafio(desafio: string, usuarioId: string | null): string {
  const ahora = Date.now();
  for (const [k, v] of desafios) if (v.vence < ahora) desafios.delete(k);
  const id = randomUUID();
  desafios.set(id, { desafio, usuarioId, vence: ahora + DESAFIO_MINUTOS * 60_000 });
  return id;
}
function retirarDesafio(id: string | undefined): { desafio: string; usuarioId: string | null } | null {
  if (!id) return null;
  const d = desafios.get(id);
  desafios.delete(id);
  return d && d.vence > Date.now() ? d : null;
}

type Fila = { id: string; usuario_id: string; clave_publica: Buffer; contador: string; transportes: string[]; dispositivo: string | null; creada_en: string; ultimo_uso_en: string | null };

// ---- Vincular (con sesión) ----
credenciales.post("/registro/opciones", exigirSesion, async (c) => {
  const { usuario } = c.get("sesion");
  const { rows } = await pool.query<Pick<Fila, "id" | "transportes">>("SELECT id, transportes FROM credencial WHERE usuario_id = $1 AND revocada_en IS NULL", [usuario.id]);
  const opciones = await generateRegistrationOptions({
    rpName: NOMBRE_APP, rpID: rpID(),
    userName: usuario.email, userDisplayName: usuario.nombre,
    attestationType: "none",
    excludeCredentials: rows.map((r) => ({ id: r.id, transports: r.transportes as never })),
    // Clave descubrible con verificación del usuario: entra con la huella sin decir quién es.
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  return c.json({ desafioId: guardarDesafio(opciones.challenge, usuario.id), opciones });
});

credenciales.post("/registro", exigirSesion, async (c) => {
  const { usuario } = c.get("sesion");
  const cuerpo = await c.req.json<{ desafioId?: string; respuesta?: RegistrationResponseJSON; dispositivo?: string }>().catch(() => ({}) as Record<string, never>);
  const pendiente = retirarDesafio(cuerpo.desafioId);
  if (!pendiente || pendiente.usuarioId !== usuario.id || !cuerpo.respuesta) return c.json({ error: "El pedido venció: probá vincular de nuevo" }, 400);
  let verificacion;
  try {
    verificacion = await verifyRegistrationResponse({ response: cuerpo.respuesta, expectedChallenge: pendiente.desafio, expectedOrigin: config.origenWeb, expectedRPID: rpID(), requireUserVerification: true });
  } catch (e) {
    return c.json({ error: `El celular no pudo crear la clave: ${(e as Error).message}` }, 400);
  }
  if (!verificacion.verified || !verificacion.registrationInfo) return c.json({ error: "No se pudo verificar la clave del celular" }, 400);
  const { credential, credentialDeviceType } = verificacion.registrationInfo;
  const dispositivo = (cuerpo.dispositivo?.trim() || c.req.header("user-agent") || "celular").slice(0, 120);
  await pool.query(
    "INSERT INTO credencial (id, usuario_id, clave_publica, contador, transportes, dispositivo) VALUES ($1, $2, $3, $4, $5, $6)",
    [credential.id, usuario.id, Buffer.from(credential.publicKey), credential.counter, credential.transports ?? [], dispositivo],
  );
  await registrarEvento(pool, { tipo: "credencial.vinculada", usuarioId: usuario.id, contenido: { id: credential.id, dispositivo, tipo: credentialDeviceType } });
  return c.json({ id: credential.id, dispositivo }, 201);
});

credenciales.get("/", exigirSesion, async (c) => {
  const { rows } = await pool.query<Fila>("SELECT id, dispositivo, creada_en, ultimo_uso_en FROM credencial WHERE usuario_id = $1 AND revocada_en IS NULL ORDER BY creada_en", [c.get("sesion").usuario.id]);
  return c.json(rows);
});

// Quitar un celular: el propio, o cualquiera si administra.
credenciales.delete("/:id", exigirSesion, async (c) => {
  const { usuario } = c.get("sesion");
  const administra = usuario.rol === "dueño" || usuario.rol === "admin";
  const { rowCount } = await pool.query(
    "UPDATE credencial SET revocada_en = now() WHERE id = $1 AND revocada_en IS NULL AND ($3 OR usuario_id = $2)",
    [c.req.param("id"), usuario.id, administra],
  );
  if (!rowCount) return c.json({ error: "No existe ese celular vinculado" }, 404);
  await registrarEvento(pool, { tipo: "credencial.quitada", usuarioId: usuario.id, contenido: { id: c.req.param("id") } });
  return c.body(null, 204);
});

// ---- Entrar con la huella (sin sesión) ----
credenciales.post("/login/opciones", limitarIntentos(20), async (c) => {
  const opciones = await generateAuthenticationOptions({ rpID: rpID(), userVerification: "required", allowCredentials: [] });
  return c.json({ desafioId: guardarDesafio(opciones.challenge, null), opciones });
});

credenciales.post("/login", limitarIntentos(20), async (c) => {
  const cuerpo = await c.req.json<{ desafioId?: string; respuesta?: AuthenticationResponseJSON; dispositivo?: string }>().catch(() => ({}) as Record<string, never>);
  const pendiente = retirarDesafio(cuerpo.desafioId);
  if (!pendiente || !cuerpo.respuesta) return c.json({ error: "El pedido venció: probá de nuevo" }, 400);
  const { rows } = await pool.query<Fila & { email: string; nombre: string; rol: string; activo: boolean }>(
    `SELECT cr.*, u.email, u.nombre, u.rol, u.activo FROM credencial cr JOIN usuario u ON u.id = cr.usuario_id WHERE cr.id = $1 AND cr.revocada_en IS NULL`,
    [cuerpo.respuesta.id],
  );
  const cred = rows[0];
  if (!cred) return c.json({ error: "Este celular no está vinculado a ninguna cuenta. Entrá con Google y vinculalo desde Administración." }, 401);
  if (!cred.activo) return c.json({ error: "Tu usuario está desactivado" }, 403);
  let verificacion;
  try {
    verificacion = await verifyAuthenticationResponse({
      response: cuerpo.respuesta, expectedChallenge: pendiente.desafio, expectedOrigin: config.origenWeb, expectedRPID: rpID(), requireUserVerification: true,
      credential: { id: cred.id, publicKey: new Uint8Array(cred.clave_publica), counter: Number(cred.contador), transports: cred.transportes as never },
    });
  } catch (e) {
    return c.json({ error: `La huella no se pudo verificar: ${(e as Error).message}` }, 401);
  }
  if (!verificacion.verified) return c.json({ error: "La huella no se pudo verificar" }, 401);
  await pool.query("UPDATE credencial SET contador = $2, ultimo_uso_en = now() WHERE id = $1", [cred.id, verificacion.authenticationInfo.newCounter]);
  const dispositivo = (cuerpo.dispositivo?.trim() || cred.dispositivo || "celular").slice(0, 120);
  const sesion = await crearSesion(pool, cred.usuario_id, dispositivo);
  await registrarEvento(pool, { tipo: "sesion.iniciada", usuarioId: cred.usuario_id, contenido: { sesionId: sesion.id, dispositivo, medio: "huella", credencial: cred.id } });
  return c.json({ token: sesion.token, usuario: { id: cred.usuario_id, email: cred.email, nombre: cred.nombre, rol: cred.rol } }, 201);
});
