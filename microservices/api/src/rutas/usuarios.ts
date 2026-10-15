import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../administracion/reglas.js";
import { responder } from "./roles.js";
import { cambiosDeUsuario, usuarioNuevo } from "../administracion/esquemas.js";
import { leerCuerpo } from "../validar.js";

// Usuarios autorizados (RF-70, RF-72, RF-75). La ruta solo traduce (ADR-018); las reglas y
// los datos están en `administracion/`.
export const usuarios = new Hono();
usuarios.use("/*", exigirSesion, exigirPermiso("admin.usuarios"));

usuarios.get("/", async (c) => c.json(await reglas.usuarios()));

usuarios.post("/", async (c) => {
  const cuerpo = await leerCuerpo(c, usuarioNuevo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return responder(c, await reglas.autorizar(cuerpo.datos, c.get("sesion").usuario.id));
});

usuarios.patch("/:id", async (c) => {
  const cuerpo = await leerCuerpo(c, cambiosDeUsuario);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return responder(c, await reglas.cambiarUsuario(c.req.param("id"), cuerpo.datos, c.get("sesion").usuario.id));
});
