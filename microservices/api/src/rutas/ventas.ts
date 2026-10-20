import { Hono } from "hono";
import { exigirPermiso, exigirSesion, puede } from "../autenticacion.js";
import * as reglas from "../ventas/reglas.js";
import { anulacionDeVenta, correccionDeVenta, ventaNueva } from "../ventas/esquemas.js";
import { leerCuerpo } from "../validar.js";

// Ventas: la ruta solo traduce el pedido y la respuesta (ADR-018, etapa 5). Las reglas están en
// `ventas/reglas.ts` y el acceso a los datos en `ventas/datos.ts`.
export const ventas = new Hono();
ventas.use("/*", exigirSesion);

ventas.post("/", exigirPermiso("ventas.registrar"), async (c) => {
  const cuerpo = await leerCuerpo(c, ventaNueva);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const r = await reglas.registrar(cuerpo.datos, c.get("sesion").usuario.id);
  return r.repetida ? c.json(r) : c.json(r, 201);
});

// Los productos de las últimas ventas, para la venta vacía (decisión 133): los pide quien vende,
// aunque no pueda ver las ventas. Va antes de «/:id».
ventas.get("/ultimos-productos", exigirPermiso("ventas.registrar"), async (c) => c.json({ productos: await reglas.ultimosProductos() }));

// El día, en AAAA-MM-DD; uno mal escrito no llega a la base (specs/017, «Cambiar fecha»).
ventas.get("/", exigirPermiso("ventas.ver", "negocio.ventas"), async (c) => {
  const dia = c.req.query("dia") || null;
  if (dia !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return c.json({ error: "El día se escribe AAAA-MM-DD, por ejemplo 2026-10-15" }, 400);
  return c.json(await reglas.delDia(dia));
});

ventas.post("/:id/anular", exigirPermiso("ventas.anular", "ventas.anular_cualquiera"), async (c) => {
  const cuerpo = await leerCuerpo(c, anulacionDeVenta);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const usuario = c.get("sesion").usuario;
  const r = await reglas.anular(c.req.param("id"), cuerpo.datos.motivo, usuario.id, puede(usuario, "ventas.anular_cualquiera"));
  if (r === "no-es-de-hoy") return c.json({ error: "Esa venta no es de hoy. Hace falta: Anular ventas de cualquier día", permiso: "ventas.anular_cualquiera" }, 403);
  if (r === "no-se-puede") return c.json({ error: "La venta no existe o ya está anulada" }, 409);
  return c.body(null, 204);
});

// Corregir una venta (019, RF-126 a RF-128): con el permiso de anular las del día (si es de hoy) o
// las de cualquier día. El servidor rehace la cuenta y resuelve la diferencia.
ventas.post("/:id/corregir", exigirPermiso("ventas.anular", "ventas.anular_cualquiera"), async (c) => {
  const cuerpo = await leerCuerpo(c, correccionDeVenta);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const usuario = c.get("sesion").usuario;
  const r = await reglas.corregir(c.req.param("id"), cuerpo.datos, usuario.id, puede(usuario, "ventas.anular_cualquiera"));
  if (r === "no-existe") return c.json({ error: "La venta o uno de sus renglones no existe" }, 404);
  if (r === "anulada") return c.json({ error: "La venta está anulada: no se corrige" }, 409);
  if (r === "no-es-de-hoy") return c.json({ error: "Esa venta no es de hoy. Hace falta: Anular ventas de cualquier día", permiso: "ventas.anular_cualquiera" }, 403);
  if (r === "cambio") return c.json({ error: "Alguien cambió esta venta mientras la corregías: volvé a abrirla" }, 409);
  if (r === "devuelve-de-mas") return c.json({ error: "Un renglón no puede quedar por debajo de lo que ya volvió por un cambio" }, 409);
  if (r === "cliente") return c.json({ error: "El cliente no existe o no tiene cuenta corriente" }, 400);
  return c.json(r);
});

ventas.post("/:id/pagar", exigirPermiso("ventas.registrar"), async (c) => {
  if (!(await reglas.pagar(c.req.param("id"), c.get("sesion").usuario.id))) return c.json({ error: "La venta no es a cuenta corriente, está anulada o ya se pagó" }, 409);
  return c.body(null, 204);
});
