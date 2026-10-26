import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config } from "./config.js";
import { esperarLaBase } from "./persistencia/conexion.js";
import { bandeja } from "./persistencia/eventos.js";
import { migrar } from "./persistencia/migrar.js";
import { iniciar as iniciarCopiaDelCatalogo } from "./productos/copia.js";

// Las migraciones corren antes de escuchar: el contenedor no está sano hasta que el esquema está
// al día, y el compose no le manda tráfico. Un minuto sin base corta el arranque.
await esperarLaBase(30, 2000);
const aplicadas = await migrar();
if (aplicadas.length) console.log(`migraciones aplicadas: ${aplicadas.join(", ")}`);
// La bandeja de auditoría (specs/027): manda lo que quedó pendiente y lo que se anote. Sin
// AUDITORIA_URL está apagada.
await bandeja.iniciar();
console.log(bandeja.encendida ? "auditoría: la bandeja manda a Auditoría" : "auditoría: apagada (sin AUDITORIA_URL)");
// La copia del catálogo (specs/018): del disco y lo que cambió, o la base entera la primera vez.
await iniciarCopiaDelCatalogo();
console.log("copia del catálogo lista");

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`comercial escuchando en :${info.port}`);
});
