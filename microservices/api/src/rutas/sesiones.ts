import { Hono, type Context } from "hono";
import { clienteDeGoogle, emailVerificadoPorGoogle, exigirPermiso, exigirSesion, limitarIntentos } from "../autenticacion.js";
import * as reglas from "../acceso/reglas.js";
import { aprobacionDeCodigo, consultaDeCodigo, entradaConGoogle, pedidoDeCodigo } from "../acceso/esquemas.js";
import type { ClienteDeGoogle, SesionActual } from "../contratos/sesiones.js";
import { leerCuerpo } from "../validar.js";
import { tiempos } from "../sistema/ajustes.js";

// Sesiones: entrar con Google o con el celular, salir y las sesiones de todos. La ruta solo
// traduce (ADR-018); las reglas están en `acceso/reglas.ts`.
export const sesiones = new Hono();

export function responder(c: Context, r: reglas.Resultado) {
  if (!r.ok) return c.json({ error: r.error }, r.estado);
  return r.cuerpo !== undefined ? c.json(r.cuerpo, r.estado ?? 200) : c.body(null, 204);
}

sesiones.get("/google/cliente", (c) => c.json({ clienteId: clienteDeGoogle() } satisfies ClienteDeGoogle));

sesiones.post("/google", limitarIntentos(10), async (c) => {
  const cuerpo = await leerCuerpo(c, entradaConGoogle);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const email = await emailVerificadoPorGoogle(cuerpo.datos.credencial);
  if (!email) return c.json({ error: "Google no pudo verificar la cuenta" }, 401);
  return responder(c, await reglas.entrarConGoogle(email, reglas.dispositivoDe(c.req.header("user-agent"), cuerpo.datos.dispositivo)));
});

// ---------- Entrar a la computadora con el celular (RF-76, decisión 57) ----------
sesiones.post("/vinculaciones", limitarIntentos(30, "codigo-nuevo"), async (c) => {
  const cuerpo = await leerCuerpo(c, pedidoDeCodigo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return c.json(await reglas.pedirCodigoDeEntrada(reglas.dispositivoDe(c.req.header("user-agent"), cuerpo.datos.dispositivo)), 201);
});

sesiones.post("/vinculaciones/aprobar", exigirSesion, async (c) => {
  const cuerpo = await leerCuerpo(c, aprobacionDeCodigo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return responder(c, await reglas.aprobarCodigoDeEntrada(c.get("sesion"), cuerpo.datos.codigo, cuerpo.datos.dispositivo_id));
});

sesiones.post("/vinculaciones/:id/estado", limitarIntentos(240, "codigo-estado"), async (c) => {
  const cuerpo = await leerCuerpo(c, consultaDeCodigo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return responder(c, await reglas.estadoDelCodigo(c.req.param("id"), cuerpo.datos.clave, cuerpo.datos.dispositivo_id));
});

sesiones.get("/actual", exigirSesion, (c) => {
  const { id, usuario } = c.get("sesion");
  // Con lo que fija quien administra para todos (specs/020): cada dispositivo se entera acá.
  return c.json({ id, usuario, ajustes: { celular_segundos: tiempos().celular_segundos } } satisfies SesionActual);
});

sesiones.delete("/actual", exigirSesion, async (c) => {
  await reglas.salir(c.get("sesion"));
  return c.body(null, 204);
});

// Quien administra usuarios ve y cierra cualquiera (decisión 100), salvo la propia, que se cierra saliendo.
sesiones.get("/", exigirSesion, exigirPermiso("admin.usuarios"), async (c) => c.json(await reglas.sesionesAbiertas(c.get("sesion").id)));

sesiones.delete("/:id", exigirSesion, exigirPermiso("admin.usuarios"), async (c) => {
  await reglas.cerrarSesion(c.req.param("id"), c.get("sesion").usuario.id);
  return c.body(null, 204);
});
