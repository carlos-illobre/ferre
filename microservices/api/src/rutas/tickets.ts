import { Hono } from "hono";
import { exigirSesion } from "../autenticacion.js";
import * as reglas from "../tickets/reglas.js";
import type { TicketCreado } from "../contratos/tickets.js";
import { resolucionDeTicket } from "../tickets/esquemas.js";
import { leerCuerpo } from "../validar.js";


// Tickets: la ruta solo traduce (ADR-018); las reglas y los datos están en `tickets/`.
export const tickets = new Hono();
tickets.use("/*", exigirSesion);

tickets.get("/", async (c) => c.json(await reglas.ultimos()));

// Crear: un formulario con los datos y las fotos (campo `fotos`, repetido).
tickets.post("/", async (c) => {
  const cuerpo = await c.req.parseBody({ all: true });
  const texto = (clave: string) => (typeof cuerpo[clave] === "string" ? (cuerpo[clave] as string).trim() : "");
  const ticket = { id: texto("id"), tipo: texto("tipo"), descripcion: texto("descripcion"), dispositivo: texto("dispositivo"), version: texto("version"), fotos: ([] as unknown[]).concat(cuerpo["fotos"] ?? []).filter((f): f is File => f instanceof File) };
  const rechazo = reglas.validar(ticket);
  if (rechazo) return c.json({ error: rechazo.error }, rechazo.estado);
  const r = await reglas.crear(ticket, c.get("sesion").usuario.id);
  return r === "repetido" ? c.json({ id: ticket.id, repetido: true } satisfies TicketCreado) : c.json({ id: ticket.id } satisfies TicketCreado, 201);
});

tickets.post("/:id/resolver", async (c) => {
  const cuerpo = await leerCuerpo(c, resolucionDeTicket);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  if (!(await reglas.resolver(c.req.param("id"), cuerpo.datos.nota, c.get("sesion").usuario.id))) return c.json({ error: "Ese ticket no existe o ya está resuelto" }, 409);
  return c.body(null, 204);
});

tickets.post("/:id/reabrir", async (c) => {
  if (!(await reglas.reabrir(c.req.param("id"), c.get("sesion").usuario.id))) return c.json({ error: "Ese ticket no existe o ya está abierto" }, 409);
  return c.body(null, 204);
});

tickets.get("/fotos/:nombre", async (c) => {
  const f = await reglas.foto(c.req.param("nombre"));
  if (!f) return c.json({ error: "No existe esa foto" }, 404);
  return c.body(f.contenido, 200, { "Content-Type": f.tipo, "Cache-Control": "private, max-age=31536000, immutable" });
});
