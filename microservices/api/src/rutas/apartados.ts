import { Hono } from "hono";
import { exigirPermiso, exigirSesion, limitarIntentos, tokenDe } from "../autenticacion.js";
import { leerCuerpo } from "../validar.js";
import { cambiosParaApartar } from "../apartados/esquemas.js";
import * as reglas from "../apartados/reglas.js";

// Lo apartado de alguien a quien desactivaron (014, ADR-021). La ruta solo traduce (ADR-018).
export const apartados = new Hono();

// Lo sube el dispositivo con el token de la sesión cerrada: no pasa por exigir la sesión.
apartados.post("/", limitarIntentos(30, "apartados"), async (c) => {
  const cuerpo = await leerCuerpo(c, cambiosParaApartar);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const r = await reglas.subir(tokenDe(c), cuerpo.datos.cambios);
  return r.ok ? c.json(r.cuerpo) : c.json({ error: r.error }, r.estado);
});

apartados.get("/", exigirSesion, exigirPermiso("admin.usuarios"), async (c) => c.json(await reglas.paraRevisar()));

apartados.post("/:id/aceptar", exigirSesion, exigirPermiso("admin.usuarios"), async (c) => {
  const r = await reglas.aceptar(c.req.param("id"), c.get("sesion").usuario);
  return r.ok ? c.json(r.cuerpo) : c.json({ error: r.error }, r.estado);
});

apartados.post("/:id/descartar", exigirSesion, exigirPermiso("admin.usuarios"), async (c) => {
  const r = await reglas.descartar(c.req.param("id"), c.get("sesion").usuario);
  return r.ok ? c.json(r.cuerpo) : c.json({ error: r.error }, r.estado);
});
