import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../ventas/reglas.js";

// Lo que preguntaron y no compraron (specs/003-ventas/research.md). La ruta solo traduce
// (ADR-018); las reglas y los datos están con los de ventas.
export const consultas = new Hono();
consultas.use("/*", exigirSesion);

consultas.post("/", exigirPermiso("ventas.registrar"), async (c) => {
  const cuerpo = await c.req.json<reglas.ConsultaEntrada>().catch(() => ({}) as reglas.ConsultaEntrada);
  if (!(await reglas.anotarConsultas(cuerpo))) return c.json({ error: "No hay nada que registrar" }, 400);
  return c.body(null, 204);
});

consultas.get("/", exigirPermiso("negocio.numeros"), async (c) => c.json(await reglas.consultas()));
