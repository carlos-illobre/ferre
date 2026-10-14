import { Hono, type Context } from "hono";
import { exigirPermiso, exigirSesion, puede } from "../autenticacion.js";
import * as reglas from "../pedidos/reglas.js";

// Pedidos a proveedores (RF-55, decisión 52). La ruta solo traduce (ADR-018); las reglas y
// los datos están en `pedidos/`. Armar, mandar, cancelar y cerrar pide «Encargar compras».
export const pedidos = new Hono();
pedidos.use("/*", exigirSesion);

const responder = (c: Context, r: reglas.Resultado) => (r.ok ? c.body(null, 204) : c.json({ error: r.error }, r.estado));
const todos = (c: Context) => puede(c.get("sesion").usuario, "deposito.pedidos");

pedidos.get("/", exigirPermiso("deposito.pedidos", "deposito.ingresos"), async (c) => c.json(await reglas.lista(todos(c))));

pedidos.get("/:id", exigirPermiso("deposito.pedidos", "deposito.ingresos"), async (c) => {
  const p = await reglas.uno(c.req.param("id"), todos(c));
  return p ? c.json(p) : c.json({ error: "No existe ese pedido" }, 404);
});

pedidos.put("/:id", exigirPermiso("deposito.pedidos"), async (c) => {
  const v = { ...(await c.req.json<reglas.Entrada>().catch(() => ({}) as reglas.Entrada)), id: c.req.param("id") };
  const error = reglas.validar(v);
  if (error) return c.json({ error }, 400);
  const r = await reglas.guardarBorrador(v, c.get("sesion").usuario.id);
  return r.ok ? c.json({ id: v.id }, 200) : responder(c, r);
});

pedidos.delete("/:id", exigirPermiso("deposito.pedidos"), async (c) => responder(c, await reglas.borrar(c.req.param("id"))));

pedidos.post("/:id/enviar", exigirPermiso("deposito.pedidos"), async (c) => {
  const { whatsapp } = await c.req.json<{ whatsapp?: string }>().catch(() => ({}) as { whatsapp?: string });
  return responder(c, await reglas.mandar(c.req.param("id"), whatsapp, c.get("sesion").usuario.id));
});

pedidos.post("/:id/cancelar", exigirPermiso("deposito.pedidos"), async (c) => responder(c,
  await reglas.terminar(c.req.param("id"), "enviado", "cancelado", "pedido.cancelado", "Solo se cancela un pedido enviado que todavía no recibió mercadería", c.get("sesion").usuario.id)));
pedidos.post("/:id/cerrar", exigirPermiso("deposito.pedidos"), async (c) => responder(c,
  await reglas.terminar(c.req.param("id"), "recibido_parcial", "cerrado_incompleto", "pedido.cerrado", "Solo se cierra un pedido que llegó incompleto", c.get("sesion").usuario.id)));
