import { Hono } from "hono";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { exigirSesion, limitarIntentos, puede } from "../autenticacion.js";
import * as reglas from "../acceso/reglas.js";
import { responder } from "./sesiones.js";
import { entradaConHuella, huellaNueva } from "../acceso/esquemas.js";
import { leerCuerpo } from "../validar.js";

// Huellas (passkeys, ADR-011 enmienda). La ruta solo traduce (ADR-018).
export const credenciales = new Hono();

// ---- Vincular (con sesión) ----
credenciales.post("/registro/opciones", exigirSesion, async (c) => c.json(await reglas.opcionesParaVincularHuella(c.get("sesion").usuario)));

credenciales.post("/registro", exigirSesion, async (c) => {
  const cuerpo = await leerCuerpo(c, huellaNueva);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const { desafioId, respuesta, dispositivo } = cuerpo.datos;
  // La forma de la respuesta del celular la verifica la librería de passkeys.
  return responder(c, await reglas.vincularHuella(c.get("sesion").usuario.id, desafioId, respuesta as RegistrationResponseJSON | undefined, dispositivo, c.req.header("user-agent")));
});

credenciales.get("/", exigirSesion, async (c) => c.json(await reglas.celularesDe(c.get("sesion").usuario.id)));

// Quitar un celular: el propio, o cualquiera si administra.
credenciales.delete("/:id", exigirSesion, async (c) => {
  const { usuario } = c.get("sesion");
  return responder(c, await reglas.quitarCelular(c.req.param("id"), usuario.id, puede(usuario, "admin.sesiones")));
});

// ---- Entrar con la huella (sin sesión) ----
credenciales.post("/login/opciones", limitarIntentos(20), async (c) => c.json(await reglas.opcionesParaEntrarConHuella()));

credenciales.post("/login", limitarIntentos(20), async (c) => {
  const cuerpo = await leerCuerpo(c, entradaConHuella);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const { desafioId, respuesta, dispositivo } = cuerpo.datos;
  return responder(c, await reglas.entrarConHuella(desafioId, respuesta as AuthenticationResponseJSON | undefined, dispositivo));
});
