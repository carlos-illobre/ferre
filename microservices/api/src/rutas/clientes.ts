import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../clientes/reglas.js";

// Clientes de cuenta corriente. La ruta solo traduce (ADR-018).
export const clientes = new Hono();
clientes.use("/*", exigirSesion);

clientes.get("/", async (c) => c.json(await reglas.conDeuda()));

clientes.post("/", exigirPermiso("ventas.registrar"), async (c) => {
  const cuerpo = await c.req.json<reglas.ClienteEntrada>().catch(() => ({}) as reglas.ClienteEntrada);
  const nuevo = await reglas.alta(cuerpo, c.get("sesion").usuario.id);
  return nuevo ? c.json(nuevo, 201) : c.json({ error: "Hace falta el nombre del cliente" }, 400);
});
