import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../procesos/reglas.js";

// Procesos (RF-90 a RF-95, ADR-019): la ruta solo exige la sesión y alguno de los dos permisos,
// y pasa el pedido al servicio de Procesos, que decide el resto.
export const procesos = new Hono();
procesos.use("/*", exigirSesion, exigirPermiso("procesos.ver", "procesos.dibujar"));
procesos.use("/*", bodyLimit({ maxSize: 6 * 1024 * 1024, onError: (c) => c.json({ error: "Pesa más de 5 MB" }, 413) }));

procesos.all("/*", async (c) => {
  const url = new URL(c.req.url);
  const conCuerpo = !["GET", "HEAD"].includes(c.req.method);
  return reglas.reenviar(
    { metodo: c.req.method, ruta: url.pathname, consulta: url.search, cuerpo: conCuerpo ? await c.req.arrayBuffer() : null, tipo: c.req.header("Content-Type") },
    c.get("sesion").usuario,
  );
});
