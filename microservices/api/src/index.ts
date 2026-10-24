import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config } from "./config.js";
import { esperarLaBase } from "./persistencia/conexion.js";
import { migrar } from "./persistencia/migrar.js";
import { leerTiempos } from "./sistema/ajustes.js";
import { iniciar as iniciarCopiaDelCatalogo } from "./productos/copia.js";

// Las migraciones corren antes de escuchar: el contenedor no está sano hasta que el esquema está
// al día, y el compose no le manda tráfico. Un minuto sin base corta el arranque.
await esperarLaBase(30, 2000);
const aplicadas = await migrar();
if (aplicadas.length) console.log(`migraciones aplicadas: ${aplicadas.join(", ")}`);
// La copia del catálogo (specs/018): del disco y lo que cambió, o la base entera la primera vez.
await iniciarCopiaDelCatalogo();
// Los tiempos que fija quien administra (specs/020): en memoria, para cada pedido.
await leerTiempos();
console.log("copia del catálogo lista");

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`gestion-del-local escuchando en :${info.port}`);
});
