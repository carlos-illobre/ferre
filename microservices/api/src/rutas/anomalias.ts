import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../anomalias/reglas.js";

// Anomalías (RF-59). La ruta solo traduce (ADR-018).
export const anomalias = new Hono();
anomalias.use("/*", exigirSesion, exigirPermiso("negocio.anomalias"));

anomalias.get("/", async (c) => c.json(await reglas.pagina(c.req.query("pagina"))));
