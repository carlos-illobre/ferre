import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../ventas/reglas.js";
import { consultaNueva } from "../ventas/esquemas.js";
import { leerCuerpo } from "../validar.js";

// Lo que preguntaron y no compraron (specs/003-ventas/research.md). La ruta solo traduce
// (ADR-018); las reglas y los datos están con los de ventas.
export const consultas = new Hono();
consultas.use("/*", exigirSesion);

consultas.post("/", exigirPermiso("ventas.registrar"), async (c) => {
  const cuerpo = await leerCuerpo(c, consultaNueva);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  await reglas.anotarConsultas(cuerpo.datos);
  return c.body(null, 204);
});

consultas.get("/", exigirPermiso("negocio.numeros"), async (c) => c.json(await reglas.consultas()));
