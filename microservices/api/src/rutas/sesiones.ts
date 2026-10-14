import { Hono, type Context } from "hono";
import { emailVerificadoPorGoogle, exigirPermiso, exigirSesion, limitarIntentos } from "../autenticacion.js";
import * as reglas from "../acceso/reglas.js";

// Sesiones: entrar con Google o con el celular, salir y las sesiones de todos. La ruta solo
// traduce (ADR-018); las reglas están en `acceso/reglas.ts`.
export const sesiones = new Hono();

export function responder(c: Context, r: reglas.Resultado) {
  if (!r.ok) return c.json({ error: r.error }, r.estado);
  return r.cuerpo !== undefined ? c.json(r.cuerpo, r.estado ?? 200) : c.body(null, 204);
}

sesiones.post("/google", limitarIntentos(10), async (c) => {
  const cuerpo = await c.req.json<{ credencial?: string; dispositivo?: string }>().catch(() => ({}) as { credencial?: string; dispositivo?: string });
  if (!cuerpo.credencial) return c.json({ error: "Falta la credencial de Google" }, 400);
  const email = await emailVerificadoPorGoogle(cuerpo.credencial);
  if (!email) return c.json({ error: "Google no pudo verificar la cuenta" }, 401);
  return responder(c, await reglas.entrarConGoogle(email, reglas.dispositivoDe(c.req.header("user-agent"), cuerpo.dispositivo)));
});

// ---------- Entrar a la computadora con el celular (RF-76, decisión 57) ----------
sesiones.post("/vinculaciones", limitarIntentos(30, "codigo-nuevo"), async (c) => {
  const cuerpo = await c.req.json<{ dispositivo?: string }>().catch(() => ({}) as { dispositivo?: string });
  return c.json(await reglas.pedirCodigoDeEntrada(reglas.dispositivoDe(c.req.header("user-agent"), cuerpo.dispositivo)), 201);
});

sesiones.post("/vinculaciones/aprobar", exigirSesion, async (c) => {
  const { codigo, dispositivo_id } = await c.req.json<{ codigo?: string; dispositivo_id?: string }>().catch(() => ({}) as { codigo?: string; dispositivo_id?: string });
  return responder(c, await reglas.aprobarCodigoDeEntrada(c.get("sesion"), codigo, dispositivo_id));
});

sesiones.post("/vinculaciones/:id/estado", limitarIntentos(240, "codigo-estado"), async (c) => {
  const { clave, dispositivo_id } = await c.req.json<{ clave?: string; dispositivo_id?: string }>().catch(() => ({}) as { clave?: string; dispositivo_id?: string });
  return responder(c, await reglas.estadoDelCodigo(c.req.param("id"), clave, dispositivo_id));
});

sesiones.get("/actual", exigirSesion, (c) => {
  const { id, usuario } = c.get("sesion");
  return c.json({ id, usuario });
});

sesiones.delete("/actual", exigirSesion, async (c) => {
  await reglas.salir(c.get("sesion"));
  return c.body(null, 204);
});

// Quien administra las sesiones ve y cierra cualquiera.
sesiones.get("/", exigirSesion, exigirPermiso("admin.sesiones"), async (c) => c.json(await reglas.sesionesAbiertas()));

sesiones.delete("/:id", exigirSesion, exigirPermiso("admin.sesiones"), async (c) => {
  await reglas.cerrarSesion(c.req.param("id"), c.get("sesion").usuario.id);
  return c.body(null, 204);
});
