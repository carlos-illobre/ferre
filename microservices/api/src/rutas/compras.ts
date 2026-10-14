import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../compras/reglas.js";
import type { AnulacionDeCompra } from "../contratos/compras.js";

export { carpetaComprobantes } from "../compras/reglas.js";

// Ingreso de mercadería (issue #30). La ruta solo traduce (ADR-018); las reglas y los datos
// están en `compras/`.
export const compras = new Hono();
compras.use("/*", exigirSesion);

compras.post("/fotos", exigirPermiso("deposito.ingresos"), async (c) => {
  const r = await reglas.subirFoto((await c.req.parseBody()).foto, c.get("sesion").usuario.id);
  return "error" in r ? c.json(r, 400) : c.json(r, 201);
});

compras.get("/fotos/:archivo", exigirPermiso("deposito.compras", "deposito.ingresos"), async (c) => {
  const f = await reglas.foto(c.req.param("archivo"));
  return f ? c.body(f.contenido, 200, { "Content-Type": f.tipo, "Cache-Control": "private, max-age=86400" }) : c.json({ error: "No existe esa foto" }, 404);
});

compras.post("/", exigirPermiso("deposito.ingresos"), async (c) => {
  const v = await c.req.json<reglas.CompraEntrada>().catch(() => ({}) as reglas.CompraEntrada);
  const error = reglas.validar(v);
  if (error) return c.json({ error }, 400);
  const r = await reglas.registrar(v, c.get("sesion").usuario.id);
  if ("estado" in r && "error" in r) return c.json({ error: r.error }, r.estado as 400 | 404 | 409);
  return "repetida" in r ? c.json(r) : c.json(r, 201);
});

compras.get("/", exigirPermiso("deposito.compras", "deposito.ingresos"), async (c) => c.json(await reglas.recientes()));
compras.get("/semana", exigirPermiso("negocio.numeros"), async (c) => c.json(await reglas.semana()));
compras.get("/:id", exigirPermiso("deposito.compras", "deposito.ingresos"), async (c) => c.json(await reglas.renglones(c.req.param("id"))));

compras.post("/:id/anular", exigirPermiso("deposito.ingresos"), async (c) => {
  const { motivo } = await c.req.json<AnulacionDeCompra>().catch(() => ({}) as AnulacionDeCompra);
  return (await reglas.anular(c.req.param("id"), motivo, c.get("sesion").usuario.id)) ? c.body(null, 204) : c.json({ error: "La compra no existe o ya está anulada" }, 409);
});
