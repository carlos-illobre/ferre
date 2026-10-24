import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../sistema/reglas.js";
import { cambiosDeAjustes } from "../sistema/esquemas.js";
import { leerCuerpo } from "../validar.js";

// Más → Sistema (specs/020): lo que vale para todos los dispositivos. La ruta solo traduce
// (ADR-018); las reglas están en `sistema/`.
export const sistema = new Hono();
sistema.use("/*", exigirSesion, exigirPermiso("admin.sistema"));

sistema.get("/ajustes", async (c) => c.json(await reglas.ajustes()));
sistema.put("/ajustes", async (c) => {
  const cuerpo = await leerCuerpo(c, cambiosDeAjustes);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return c.json(await reglas.cambiar(cuerpo.datos, c.get("sesion").usuario.id));
});
