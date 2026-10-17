import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../catalogo/reglas.js";
import type { ProveedorCreado } from "../contratos/proveedores.js";
import { cambiosDeProveedor, proveedorNuevo } from "../catalogo/esquemas.js";
import { leerCuerpo } from "../validar.js";

// Proveedores: la ruta solo traduce (ADR-018); las reglas y los datos están en `catalogo/`.
export const proveedores = new Hono();
proveedores.use("/*", exigirSesion);

proveedores.get("/", async (c) => c.json(await reglas.proveedores()));

proveedores.post("/", exigirPermiso("catalogo.listas"), async (c) => {
  const cuerpo = await leerCuerpo(c, proveedorNuevo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const id = await reglas.alta(cuerpo.datos, c.get("sesion").usuario.id);
  return id ? c.json({ id } satisfies ProveedorCreado, 201) : c.json({ error: `Ya existe un proveedor llamado ${cuerpo.datos.nombre}` }, 409);
});

proveedores.patch("/:id", exigirPermiso("catalogo.listas"), async (c) => {
  const cuerpo = await leerCuerpo(c, cambiosDeProveedor);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  if (!(await reglas.modificar(c.req.param("id"), cuerpo.datos, c.get("sesion").usuario.id))) return c.json({ error: "No existe ese proveedor" }, 404);
  return c.body(null, 204);
});
