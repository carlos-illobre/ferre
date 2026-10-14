import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../actividad/reglas.js";

// Quién hizo qué. La ruta solo traduce (ADR-018).
export const auditoria = new Hono();
auditoria.use("/*", exigirSesion, exigirPermiso("negocio.actividad"));

auditoria.get("/", async (c) => {
  const { usuario, tipo, desde, hasta, pagina } = c.req.query();
  return c.json(await reglas.pagina({ usuario: usuario || null, tipo: tipo || null, desde: desde || null, hasta: hasta || null }, pagina));
});
