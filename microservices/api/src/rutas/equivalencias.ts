import { Hono, type Context } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../duplicados/reglas.js";

// Duplicados entre proveedores (issue #29). La ruta solo traduce (ADR-018); las reglas y los
// datos están en `duplicados/`.
export const equivalencias = new Hono();
equivalencias.use("/*", exigirSesion, exigirPermiso("catalogo.duplicados"));

const responder = (c: Context, r: reglas.Resultado) => (r.ok ? c.body(null, 204) : c.json({ error: r.error }, r.estado));

equivalencias.get("/", async (c) => c.json(await reglas.sugerencias()));
equivalencias.post("/buscar", async (c) => c.json({ nuevas: await reglas.buscar() }));

const resolver = (accion: "unir" | "rechazar") => async (c: Context) => {
  const { conservar } = await c.req.json<{ conservar?: "a" | "b" }>().catch(() => ({}) as { conservar?: "a" | "b" });
  return responder(c, await reglas.resolver(c.req.param("id")!, accion, conservar, c.get("sesion").usuario.id));
};
equivalencias.post("/:id/unir", resolver("unir"));
equivalencias.post("/:id/rechazar", resolver("rechazar"));

equivalencias.post("/unir", async (c) => {
  const cuerpo = await c.req.json<{ conservar_id?: string; absorber_id?: string }>().catch(() => ({}) as Record<string, never>);
  return responder(c, await reglas.unirAMano(cuerpo.conservar_id, cuerpo.absorber_id, c.get("sesion").usuario.id));
});

equivalencias.get("/unidos", async (c) => c.json(await reglas.unidos()));

equivalencias.post("/separar", async (c) => {
  const cuerpo = await c.req.json<{ absorbido_id?: string }>().catch(() => ({}) as Record<string, never>);
  return responder(c, await reglas.separar(cuerpo.absorbido_id, c.get("sesion").usuario.id));
});
