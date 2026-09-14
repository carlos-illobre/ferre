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
import { productos } from "./rutas/productos.js";
import { ventas } from "./rutas/ventas.js";
import { clientes } from "./rutas/clientes.js";
import { consultas } from "./rutas/consultas.js";
import { compras } from "./rutas/compras.js";
import { stock } from "./rutas/stock.js";
import { conteos, sectores } from "./rutas/conteos.js";
import { puestos } from "./rutas/puestos.js";
import { equivalencias } from "./rutas/equivalencias.js";

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
app.route("/productos", productos);
app.route("/ventas", ventas);
app.route("/clientes", clientes);
app.route("/consultas", consultas);
app.route("/compras", compras);
app.route("/stock", stock);
app.route("/sectores", sectores);
app.route("/conteos", conteos);
app.route("/puestos", puestos);
app.route("/equivalencias", equivalencias);

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Algo falló en el servidor. Probá de nuevo; si sigue, avisale al dueño." }, 500);
});
