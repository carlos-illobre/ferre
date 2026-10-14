import { Hono } from "hono";
import { exigirPermiso, exigirSesion, puede } from "../autenticacion.js";
import * as reglas from "../deposito/reglas.js";
import { ajusteDeStock } from "../deposito/esquemas.js";
import { leerCuerpo } from "../validar.js";

// Stock: la ruta solo traduce (ADR-018); las reglas y los datos están en `deposito/`.
export const stock = new Hono();
stock.use("/*", exigirSesion);

// Stock y valor de todos los productos con movimientos. El cliente lo cruza con su catálogo.
stock.get("/", async (c) => c.json(await reglas.stockConValor(puede(c.get("sesion").usuario, "negocio.numeros"))));

stock.get("/:productoId/movimientos", async (c) => c.json(await reglas.movimientos(c.req.param("productoId"))));

stock.post("/:productoId/ajustes", exigirPermiso("deposito.stock"), async (c) => {
  const cuerpo = await leerCuerpo(c, ajusteDeStock);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return c.json(await reglas.ajustar(c.req.param("productoId"), cuerpo.datos.cantidad_real, cuerpo.datos.motivo, c.get("sesion").usuario.id));
});
