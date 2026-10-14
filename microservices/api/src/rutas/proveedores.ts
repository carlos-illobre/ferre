import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../catalogo/reglas.js";

// Proveedores: la ruta solo traduce (ADR-018); las reglas y los datos están en `catalogo/`.
export const proveedores = new Hono();
proveedores.use("/*", exigirSesion);

proveedores.get("/", async (c) => c.json(await reglas.proveedores()));

proveedores.post("/", exigirPermiso("catalogo.listas"), async (c) => {
  const cuerpo = await c.req.json<reglas.ProveedorEntrada>().catch(() => ({}) as reglas.ProveedorEntrada);
  const error = reglas.validar(cuerpo, true);
  if (error) return c.json({ error }, 400);
  const id = await reglas.alta(cuerpo, c.get("sesion").usuario.id);
  return id ? c.json({ id }, 201) : c.json({ error: `Ya existe un proveedor llamado ${cuerpo.nombre}` }, 409);
});

proveedores.patch("/:id", exigirPermiso("catalogo.listas"), async (c) => {
  const cuerpo = await c.req.json<reglas.ProveedorEntrada>().catch(() => ({}) as reglas.ProveedorEntrada);
  const error = reglas.validar(cuerpo, false);
  if (error) return c.json({ error }, 400);
  if (!(await reglas.modificar(c.req.param("id"), cuerpo, c.get("sesion").usuario.id))) return c.json({ error: "No existe ese proveedor" }, 404);
  return c.body(null, 204);
});
