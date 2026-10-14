import { Hono } from "hono";
import { exigirPermiso, exigirSesion, puede } from "../autenticacion.js";
import * as reglas from "../ventas/reglas.js";
import type { AnulacionDeVenta } from "../contratos/ventas.js";

// Ventas: la ruta solo traduce el pedido y la respuesta (ADR-018, etapa 5). Las reglas están en
// `ventas/reglas.ts` y el acceso a los datos en `ventas/datos.ts`.
export const ventas = new Hono();
ventas.use("/*", exigirSesion);

ventas.post("/", exigirPermiso("ventas.registrar"), async (c) => {
  const v = await c.req.json<reglas.VentaEntrada>().catch(() => ({}) as reglas.VentaEntrada);
  const error = reglas.validar(v);
  if (error) return c.json({ error }, 400);
  const r = await reglas.registrar(v, c.get("sesion").usuario.id);
  return r.repetida ? c.json(r) : c.json(r, 201);
});

ventas.get("/", exigirPermiso("ventas.ver", "negocio.numeros"), async (c) => c.json(await reglas.delDia(c.req.query("dia") || null)));

ventas.post("/:id/anular", exigirPermiso("ventas.anular", "ventas.anular_cualquiera"), async (c) => {
  const { motivo } = await c.req.json<AnulacionDeVenta>().catch(() => ({}) as AnulacionDeVenta);
  const usuario = c.get("sesion").usuario;
  const r = await reglas.anular(c.req.param("id"), motivo, usuario.id, puede(usuario, "ventas.anular_cualquiera"));
  if (r === "no-es-de-hoy") return c.json({ error: "Esa venta no es de hoy. Hace falta: Anular ventas de cualquier día", permiso: "ventas.anular_cualquiera" }, 403);
  if (r === "no-se-puede") return c.json({ error: "La venta no existe o ya está anulada" }, 409);
  return c.body(null, 204);
});

ventas.post("/:id/pagar", exigirPermiso("ventas.registrar"), async (c) => {
  if (!(await reglas.pagar(c.req.param("id"), c.get("sesion").usuario.id))) return c.json({ error: "La venta no es a cuenta corriente, está anulada o ya se pagó" }, 409);
  return c.body(null, 204);
});
