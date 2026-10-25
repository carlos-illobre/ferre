import { Hono } from "hono";
import { exigirTokenDeServicio } from "./autenticacion.js";
import { VERSION_DE_PRECIOS } from "./precios.js";
import { config } from "./config.js";
import { baseResponde } from "./persistencia/conexion.js";
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
import { apartados } from "./rutas/apartados.js";
import { sistema } from "./rutas/sistema.js";
import { canal } from "./rutas/canal.js";
import { aCuestas } from "./avisos/canales.js";

export const app = new Hono();

// Cada respuesta lleva a cuestas lo permanente (la versión, decisión 157): la aplicación se entera
// con lo que ya pide, sin consultas propias (ADR-030).
app.use("/*", async (c, next) => {
  await next();
  c.header(...aCuestas.cabecera());
});

// Dice si el proceso anda, si la base responde y qué versión es (022-E05): el compose no da por
// sano al servidor mientras la base no responda. La base está en la misma máquina: consultarla
// cada 10 segundos no cuesta nada (ADR-026; antes no se hacía por el plan de Supabase, ADR-023).
app.get("/health", async (c) => {
  const db = await baseResponde();
  return c.json({ ok: db, db: db ? "ok" : "sin-respuesta", version: config.version, calculoDePrecios: VERSION_DE_PRECIOS }, db ? 200 : 503);
});

// Lo demás solo por la puerta (026, ADR-031): con el token entre servicios.
app.use("/*", exigirTokenDeServicio);

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
app.route("/apartados", apartados);
app.route("/sistema", sistema);
app.route("/canal", canal);

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Algo falló en el servidor. Probá de nuevo; si sigue, avisale al dueño." }, 500);
});
