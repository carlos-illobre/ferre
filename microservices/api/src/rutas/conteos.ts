import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../conteos/reglas.js";
import type { SectorCreado } from "../contratos/conteos.js";
import { cierreDeConteo, conteoNuevo, renglonContado, sectorNuevo } from "../conteos/esquemas.js";
import { leerCuerpo } from "../validar.js";

// Sectores y conteos (issue #31). La ruta solo traduce (ADR-018); las reglas y los datos están en `conteos/`.
export const sectores = new Hono();
export const conteos = new Hono();
sectores.use("/*", exigirSesion, exigirPermiso("deposito.stock"));
conteos.use("/*", exigirSesion, exigirPermiso("deposito.stock"));

sectores.get("/", async (c) => c.json(await reglas.sectores()));

sectores.post("/", async (c) => {
  const cuerpo = await leerCuerpo(c, sectorNuevo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const { nombre } = cuerpo.datos;
  const id = await reglas.crearSector(nombre, c.get("sesion").usuario.id);
  return id ? c.json({ id, nombre } satisfies SectorCreado, 201) : c.json({ error: `Ya existe un sector llamado ${nombre}` }, 409);
});

conteos.post("/", async (c) => {
  const cuerpo = await leerCuerpo(c, conteoNuevo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const r = await reglas.abrir(cuerpo.datos.sector_id, c.get("sesion").usuario.id);
  return r.retomado ? c.json(r) : c.json(r, 201);
});

conteos.get("/:id", async (c) => {
  const r = await reglas.conteo(c.req.param("id"));
  return r ? c.json(r) : c.json({ error: "No existe ese conteo" }, 404);
});

conteos.put("/:id/renglones/:productoId", async (c) => {
  const cuerpo = await leerCuerpo(c, renglonContado);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  if (!(await reglas.contar(c.req.param("id"), c.req.param("productoId"), cuerpo.datos.cantidad, c.get("sesion").usuario.id))) return c.json({ error: "El conteo no existe o ya se cerró" }, 409);
  return c.body(null, 204);
});

conteos.delete("/:id/renglones/:productoId", async (c) => {
  await reglas.descontar(c.req.param("id"), c.req.param("productoId"));
  return c.body(null, 204);
});

conteos.post("/:id/cerrar", async (c) => {
  const cuerpo = await leerCuerpo(c, cierreDeConteo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const r = await reglas.cerrar(c.req.param("id"), cuerpo.datos.faltantes_en_cero ?? false, c.get("sesion").usuario.id);
  return r ? c.json(r) : c.json({ error: "El conteo no existe o ya se cerró" }, 409);
});
