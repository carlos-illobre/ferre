import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import { aplicarMigraciones } from "./migraciones.js";

// Las migraciones corren antes de escuchar: el contenedor no está sano hasta que el
// esquema está al día, y el compose no le manda tráfico.
const aplicadas = await aplicarMigraciones(pool);
if (aplicadas.length) console.log(`migraciones aplicadas: ${aplicadas.join(", ")}`);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`gestion-del-local escuchando en :${info.port}`);
});
