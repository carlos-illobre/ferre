import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../acceso/reglas.js";
import { responder } from "./sesiones.js";
import { diasDelVinculo, puestoNuevo, vinculacion } from "../acceso/esquemas.js";
import type { DiasDelVinculo } from "../contratos/puestos.js";
import { leerCuerpo } from "../validar.js";

// Vínculo computadora–celular (issue #52, decisiones 58, 60 y 73). La ruta solo traduce
// (ADR-018); las reglas están en `acceso/reglas.ts`. Lo que se mandan los dos va por el canal
// de cada uno (`/canal`, ADR-027 y ADR-030).
export const puestos = new Hono();
puestos.use("/*", exigirSesion);

// La laptop pide un código para el QR.
puestos.post("/", async (c) => {
  const cuerpo = await leerCuerpo(c, puestoNuevo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return c.json(await reglas.codigoParaVincular(c.get("sesion").id, cuerpo.datos.nombre), 201);
});

// El celular lee el QR y se vincula.
puestos.post("/:codigo/vincular", async (c) => {
  const cuerpo = await leerCuerpo(c, vinculacion);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return responder(c, await reglas.vincular(c.get("sesion"), c.req.param("codigo"), cuerpo.datos.dispositivo_id));
});

puestos.get("/mio", async (c) => c.json(await reglas.vinculosDe(c.get("sesion"), c.req.query("dispositivo"))));

// Cuántos días dura el vínculo: lo ve cualquiera con sesión. Se fija en Más → Sistema (specs/020);
// esta ruta queda para las aplicaciones de la versión anterior, con el mismo permiso.
puestos.get("/configuracion", async (c) => c.json({ dias: await reglas.diasDelVinculo() } satisfies DiasDelVinculo));
puestos.put("/configuracion", exigirPermiso("admin.sistema"), async (c) => {
  const cuerpo = await leerCuerpo(c, diasDelVinculo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return responder(c, await reglas.cambiarDiasDelVinculo(cuerpo.datos.dias, c.get("sesion").usuario.id));
});

// Soltar el emparejamiento, desde cualquiera de los dos.
puestos.delete("/:id", async (c) => {
  await reglas.soltar(c.req.param("id"), c.get("sesion"));
  return c.body(null, 204);
});

puestos.get("/:id", async (c) => {
  const p = await reglas.estadoDelPuesto(c.req.param("id"), c.get("sesion").id);
  return p ? c.json(p) : c.json({ error: "No existe ese puesto" }, 404);
});
