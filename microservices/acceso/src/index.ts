import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config } from "./config.js";
import { esperarLaBase } from "./persistencia/conexion.js";
import { bandeja } from "./persistencia/eventos.js";
import { migrar } from "./persistencia/migrar.js";
import { leerTiempos } from "./sistema/ajustes.js";

// Acceso (specs/029). Las migraciones corren antes de escuchar: el contenedor no está sano hasta
// que el esquema está al día. Un minuto sin base corta el arranque.
await esperarLaBase(30, 2000);
const aplicadas = await migrar();
if (aplicadas.length) console.log(`migraciones aplicadas: ${aplicadas.join(", ")}`);
// La bandeja de auditoría (specs/027). Sin AUDITORIA_URL está apagada.
await bandeja.iniciar();
console.log(bandeja.encendida ? "auditoría: la bandeja manda a Auditoría" : "auditoría: apagada (sin AUDITORIA_URL)");
// Los tiempos que fija quien administra (specs/020): en memoria, para cada pedido.
await leerTiempos();

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`acceso escuchando en :${info.port}`);
});
