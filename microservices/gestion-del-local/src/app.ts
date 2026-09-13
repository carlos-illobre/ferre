import { Hono } from "hono";
import { cors } from "hono/cors";
import { VERSION_CALCULO_DE_PRECIOS } from "@ferre/calculo-de-precios";
import { config } from "./config.js";
import { baseResponde } from "./db.js";
import { sesiones } from "./rutas/sesiones.js";
import { usuarios } from "./rutas/usuarios.js";
import { auditoria } from "./rutas/auditoria.js";
import { proveedores } from "./rutas/proveedores.js";
import { listas } from "./rutas/listas.js";

export const app = new Hono();

// El cliente web vive en otro origen (ADR-010): solo ese origen puede llamar desde el navegador.
app.use("/*", cors({ origin: config.origenWeb, credentials: false, allowHeaders: ["Authorization", "Content-Type"] }));

app.get("/health", async (c) => {
  const db = await baseResponde();
  return c.json(
    { ok: db, db: db ? "ok" : "sin-respuesta", calculoDePrecios: VERSION_CALCULO_DE_PRECIOS },
    db ? 200 : 503,
  );
});

app.route("/sesiones", sesiones);
app.route("/usuarios", usuarios);
app.route("/auditoria", auditoria);
app.route("/proveedores", proveedores);
app.route("/listas", listas);

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Algo falló en el servidor. Probá de nuevo; si sigue, avisale al dueño." }, 500);
});
