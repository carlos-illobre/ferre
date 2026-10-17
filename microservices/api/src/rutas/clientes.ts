import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../clientes/reglas.js";
import { clienteNuevo } from "../clientes/esquemas.js";
import { leerCuerpo } from "../validar.js";

// Clientes de cuenta corriente. La ruta solo traduce (ADR-018).
export const clientes = new Hono();
clientes.use("/*", exigirSesion);

clientes.get("/", async (c) => c.json(await reglas.conDeuda()));

clientes.post("/", exigirPermiso("ventas.registrar"), async (c) => {
  const cuerpo = await leerCuerpo(c, clienteNuevo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return c.json(await reglas.alta(cuerpo.datos, c.get("sesion").usuario.id), 201);
});
