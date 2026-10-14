import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../conteos/reglas.js";

// Sectores y conteos (issue #31). La ruta solo traduce (ADR-018); las reglas y los datos están en `conteos/`.
export const sectores = new Hono();
export const conteos = new Hono();
sectores.use("/*", exigirSesion, exigirPermiso("deposito.stock"));
conteos.use("/*", exigirSesion, exigirPermiso("deposito.stock"));

sectores.get("/", async (c) => c.json(await reglas.sectores()));

sectores.post("/", async (c) => {
  const nombre = (await c.req.json<{ nombre?: string }>().catch(() => ({}) as { nombre?: string })).nombre?.trim();
  if (!nombre) return c.json({ error: "Hace falta el nombre del sector (por ejemplo: Estantería 1)" }, 400);
  const id = await reglas.crearSector(nombre, c.get("sesion").usuario.id);
  return id ? c.json({ id, nombre }, 201) : c.json({ error: `Ya existe un sector llamado ${nombre}` }, 409);
});

conteos.post("/", async (c) => {
  const { sector_id } = await c.req.json<{ sector_id?: string }>().catch(() => ({}) as { sector_id?: string });
  if (!sector_id) return c.json({ error: "Elegí el sector" }, 400);
  const r = await reglas.abrir(sector_id, c.get("sesion").usuario.id);
  return r.retomado ? c.json(r) : c.json(r, 201);
});

conteos.get("/:id", async (c) => {
  const r = await reglas.conteo(c.req.param("id"));
  return r ? c.json(r) : c.json({ error: "No existe ese conteo" }, 404);
});

conteos.put("/:id/renglones/:productoId", async (c) => {
  const { cantidad } = await c.req.json<{ cantidad?: number }>().catch(() => ({}) as { cantidad?: number });
  if (typeof cantidad !== "number" || !Number.isFinite(cantidad) || cantidad < 0) return c.json({ error: "Decí cuántas hay (un número mayor o igual a cero)" }, 400);
  if (!(await reglas.contar(c.req.param("id"), c.req.param("productoId"), cantidad, c.get("sesion").usuario.id))) return c.json({ error: "El conteo no existe o ya se cerró" }, 409);
  return c.body(null, 204);
});

conteos.delete("/:id/renglones/:productoId", async (c) => {
  await reglas.descontar(c.req.param("id"), c.req.param("productoId"));
  return c.body(null, 204);
});

conteos.post("/:id/cerrar", async (c) => {
  const { faltantes_en_cero } = await c.req.json<{ faltantes_en_cero?: boolean }>().catch(() => ({}) as { faltantes_en_cero?: boolean });
  const r = await reglas.cerrar(c.req.param("id"), Boolean(faltantes_en_cero), c.get("sesion").usuario.id);
  return r ? c.json(r) : c.json({ error: "El conteo no existe o ya se cerró" }, 409);
});
