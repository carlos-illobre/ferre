import { Hono, type Context } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import type { BusquedaDeDuplicados } from "../contratos/equivalencias.js";
import { resolverSugerencia, separar, unirAMano } from "../duplicados/esquemas.js";
import { leerCuerpo } from "../validar.js";
import * as reglas from "../duplicados/reglas.js";

// Duplicados entre proveedores (issue #29). La ruta solo traduce (ADR-018); las reglas y los
// datos están en `duplicados/`.
export const equivalencias = new Hono();
equivalencias.use("/*", exigirSesion, exigirPermiso("catalogo.duplicados"));

const responder = (c: Context, r: reglas.Resultado) => (r.ok ? c.body(null, 204) : c.json({ error: r.error }, r.estado));

equivalencias.get("/", async (c) => c.json(await reglas.sugerencias()));
equivalencias.post("/buscar", async (c) => c.json({ nuevas: await reglas.buscar() } satisfies BusquedaDeDuplicados));

const resolver = (accion: "unir" | "rechazar") => async (c: Context) => {
  const cuerpo = await leerCuerpo(c, resolverSugerencia);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return responder(c, await reglas.resolver(c.req.param("id")!, accion, cuerpo.datos.conservar, c.get("sesion").usuario.id));
};
equivalencias.post("/:id/unir", resolver("unir"));
equivalencias.post("/:id/rechazar", resolver("rechazar"));

equivalencias.post("/unir", async (c) => {
  const cuerpo = await leerCuerpo(c, unirAMano);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return responder(c, await reglas.unirAMano(cuerpo.datos.conservar_id, cuerpo.datos.absorber_id, c.get("sesion").usuario.id));
});

equivalencias.get("/unidos", async (c) => c.json(await reglas.unidos()));

equivalencias.post("/separar", async (c) => {
  const cuerpo = await leerCuerpo(c, separar);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return responder(c, await reglas.separar(cuerpo.datos.absorbido_id, c.get("sesion").usuario.id));
});
