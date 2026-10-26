import { Hono } from "hono";
import { exigirTokenDeServicio } from "./autenticacion.js";
import { config } from "./config.js";
import { baseResponde } from "./persistencia/conexion.js";
import { sesiones } from "./rutas/sesiones.js";
import { usuarios } from "./rutas/usuarios.js";
import { puestos } from "./rutas/puestos.js";
import { credenciales } from "./rutas/credenciales.js";
import { permisos, roles } from "./rutas/roles.js";
import { apartados } from "./rutas/apartados.js";
import { sistema } from "./rutas/sistema.js";
import { canal } from "./rutas/canal.js";
import { aCuestas } from "./avisos/canales.js";

// Acceso (specs/029): quién es cada uno y qué puede. Las mismas rutas que tenía Comercial.
export const app = new Hono();

// Cada respuesta lleva a cuestas lo permanente (la versión, decisión 157): la aplicación se entera
// con lo que ya pide, sin consultas propias (ADR-030).
app.use("/*", async (c, next) => {
  await next();
  c.header(...aCuestas.cabecera());
});

// Dice si el proceso anda, si la base responde y qué versión es (022-E05).
app.get("/health", async (c) => {
  const db = await baseResponde();
  return c.json({ ok: db, db: db ? "ok" : "sin-respuesta", version: config.version }, db ? 200 : 503);
});

// Lo demás solo por la puerta (026, ADR-031): con el token entre servicios.
app.use("/*", exigirTokenDeServicio);

app.route("/sesiones", sesiones);
app.route("/usuarios", usuarios);
app.route("/puestos", puestos);
app.route("/credenciales", credenciales);
app.route("/roles", roles);
app.route("/permisos", permisos);
app.route("/apartados", apartados);
app.route("/sistema", sistema);
app.route("/canal", canal);

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Algo falló en el servidor. Probá de nuevo; si sigue, avisale al dueño." }, 500);
});
