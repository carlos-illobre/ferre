import { Hono } from "hono";
import { cors } from "hono/cors";
import { VERSION_DE_PRECIOS } from "./precios.js";
import { config } from "./config.js";
import { iniciada as copiaIniciada, ponerAlDia } from "./productos/copia.js";
import { sesiones } from "./rutas/sesiones.js";
import { usuarios } from "./rutas/usuarios.js";
import { auditoria } from "./rutas/auditoria.js";
import { proveedores } from "./rutas/proveedores.js";
import { listas } from "./rutas/listas.js";
import { fotos, productos } from "./rutas/productos.js";
import { ventas } from "./rutas/ventas.js";
import { clientes } from "./rutas/clientes.js";
import { consultas } from "./rutas/consultas.js";
import { compras } from "./rutas/compras.js";
import { stock } from "./rutas/stock.js";
import { conteos, sectores } from "./rutas/conteos.js";
import { puestos } from "./rutas/puestos.js";
import { equivalencias } from "./rutas/equivalencias.js";
import { credenciales } from "./rutas/credenciales.js";
import { tickets } from "./rutas/tickets.js";
import { pedidos } from "./rutas/pedidos.js";
import { anomalias } from "./rutas/anomalias.js";
import { permisos, roles } from "./rutas/roles.js";
import { procesos } from "./rutas/procesos.js";
import { apartados } from "./rutas/apartados.js";
import { sistema } from "./rutas/sistema.js";

export const app = new Hono();

// El cliente web vive en otro origen (ADR-010): solo ese origen puede llamar desde el navegador.
app.use("/*", cors({ origin: config.origenWeb, credentials: false, allowHeaders: ["Authorization", "Content-Type"] }));

// Dice que el proceso anda y su versión, sin consultar la base (specs/018, RF-125): el compose lo
// pregunta cada 10 segundos y cada consulta así llenaba los registros de la base. El arranque
// ya espera a la base y aplica las migraciones antes de escuchar.
app.get("/health", (c) => c.json({ ok: true, version: process.env.VERSION ?? "desconocida", calculoDePrecios: VERSION_DE_PRECIOS }));

// Quien cambia el catálogo lo ve en su pedido siguiente (specs/018, RF-124): antes de contestar, la
// copia del servidor lee lo que cambió. Los demás lo ven cuando llega el aviso de la base.
const CAMBIA_EL_CATALOGO = /^\/(productos|equivalencias|listas|compras|proveedores|sectores|conteos|apartados)(\/|$)/;
app.use("/*", async (c, next) => {
  await next();
  if (c.req.method !== "GET" && c.res.status < 400 && CAMBIA_EL_CATALOGO.test(c.req.path) && copiaIniciada()) {
    await ponerAlDia().catch((e: unknown) => console.error("no se pudo poner al día la copia del catálogo", e));
  }
});

app.route("/sesiones", sesiones);
app.route("/usuarios", usuarios);
app.route("/auditoria", auditoria);
app.route("/proveedores", proveedores);
app.route("/listas", listas);
app.route("/productos", productos);
app.route("/fotos", fotos);
app.route("/ventas", ventas);
app.route("/clientes", clientes);
app.route("/consultas", consultas);
app.route("/compras", compras);
app.route("/stock", stock);
app.route("/sectores", sectores);
app.route("/conteos", conteos);
app.route("/puestos", puestos);
app.route("/equivalencias", equivalencias);
app.route("/credenciales", credenciales);
app.route("/tickets", tickets);
app.route("/pedidos", pedidos);
app.route("/anomalias", anomalias);
app.route("/roles", roles);
app.route("/permisos", permisos);
app.route("/procesos", procesos);
app.route("/apartados", apartados);
app.route("/sistema", sistema);

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Algo falló en el servidor. Probá de nuevo; si sigue, avisale al dueño." }, 500);
});
