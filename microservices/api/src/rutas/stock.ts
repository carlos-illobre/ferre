import { Hono } from "hono";
import { exigirPermiso, exigirSesion, puede } from "../autenticacion.js";
import * as reglas from "../deposito/reglas.js";

// Stock: la ruta solo traduce (ADR-018); las reglas y los datos están en `deposito/`.
export const stock = new Hono();
stock.use("/*", exigirSesion);

// Stock y valor de todos los productos con movimientos. El cliente lo cruza con su catálogo.
stock.get("/", async (c) => c.json(await reglas.stockConValor(puede(c.get("sesion").usuario, "negocio.numeros"))));

stock.get("/:productoId/movimientos", async (c) => c.json(await reglas.movimientos(c.req.param("productoId"))));

stock.post("/:productoId/ajustes", exigirPermiso("deposito.stock"), async (c) => {
  const cuerpo = await c.req.json<{ cantidad_real?: number; motivo?: string }>().catch(() => ({}) as Record<string, never>);
  const r = await reglas.ajustar(c.req.param("productoId"), cuerpo.cantidad_real, cuerpo.motivo, c.get("sesion").usuario.id);
  return "error" in r ? c.json(r, 400) : c.json(r);
});
