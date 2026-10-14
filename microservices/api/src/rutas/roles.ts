import { Hono, type Context } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import { PERMISOS } from "../permisos.js";
import * as reglas from "../administracion/reglas.js";

// Roles y permisos (RF-75, ADR-017). La ruta solo traduce (ADR-018); las reglas y los datos
// están en `administracion/`.
export const roles = new Hono();
export const permisos = new Hono();
permisos.use("/*", exigirSesion);
roles.use("/*", exigirSesion);

export function responder(c: Context, r: reglas.Resultado) {
  if (!r.ok) return c.json({ error: r.error }, r.estado);
  return r.cuerpo !== undefined ? c.json(r.cuerpo, r.estado ?? 200) : c.body(null, 204);
}

// La lista de permisos, para armar un rol. La ve quien administra roles o usuarios.
permisos.get("/", exigirPermiso("admin.roles", "admin.usuarios"), (c) => c.json(PERMISOS));

// Los roles con sus permisos y cuántas personas activas los tienen.
roles.get("/", exigirPermiso("admin.roles", "admin.usuarios"), async (c) => c.json(await reglas.roles()));

roles.post("/", exigirPermiso("admin.roles"), async (c) => {
  const cuerpo = await c.req.json<reglas.RolEntrada>().catch(() => ({}) as reglas.RolEntrada);
  const error = reglas.validarRol(cuerpo, false);
  if (error) return c.json({ error }, 400);
  return responder(c, await reglas.crearRol(cuerpo, c.get("sesion").usuario.id));
});

roles.patch("/:id", exigirPermiso("admin.roles"), async (c) => {
  const cuerpo = await c.req.json<reglas.RolEntrada>().catch(() => ({}) as reglas.RolEntrada);
  const error = reglas.validarRol(cuerpo, true);
  if (error) return c.json({ error }, 400);
  return responder(c, await reglas.cambiarRol(c.req.param("id"), cuerpo, c.get("sesion").usuario.id));
});

roles.delete("/:id", exigirPermiso("admin.roles"), async (c) => responder(c, await reglas.borrarRol(c.req.param("id"), c.get("sesion").usuario.id)));
