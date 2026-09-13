import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import { aplicarMigraciones } from "./migraciones.js";

// La base puede tardar más que este proceso en aceptar conexiones (arranque en frío del
// compose, reinicio de Supabase): se espera con reintentos en vez de morir al primer
// rechazo. Un minuto sin base sigue siendo un error y corta el arranque.
async function esperarBase(intentos = 30, esperaMs = 2000): Promise<void> {
  for (let i = 1; ; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (i >= intentos) throw error;
      console.log(`base sin responder (intento ${i}/${intentos}), reintentando en ${esperaMs} ms`);
      await new Promise((r) => setTimeout(r, esperaMs));
    }
  }
}

// Las migraciones corren antes de escuchar: el contenedor no está sano hasta que el
// esquema está al día, y el compose no le manda tráfico.
await esperarBase();
const aplicadas = await aplicarMigraciones(pool);
if (aplicadas.length) console.log(`migraciones aplicadas: ${aplicadas.join(", ")}`);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`gestion-del-local escuchando en :${info.port}`);
});
