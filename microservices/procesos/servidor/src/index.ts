import path from "node:path";
import { serve } from "@hono/node-server";
import pg from "pg";
import { crearApp } from "./rutas.js";
import { crearReglas } from "./reglas.js";
import { almacenEnPostgres } from "./datos.js";
import { aplicarMigraciones } from "./migraciones.js";

// El servicio de Procesos. Sin valores por omisión: si falta una variable, no arranca.
function obligatoria(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable ${nombre}`);
  return valor;
}

const pool = new pg.Pool({ connectionString: obligatoria("DATABASE_URL") });

// La base puede tardar más que este proceso en aceptar conexiones (arranque en frío): se espera
// con reintentos. Un minuto sin base sigue siendo un error y corta el arranque.
for (let intento = 1; ; intento++) {
  try {
    await pool.query("SELECT 1");
    break;
  } catch (error) {
    if (intento >= 30) throw error;
    console.log(`procesos: base sin responder (intento ${intento}/30), reintentando en 2 s`);
    await new Promise((listo) => setTimeout(listo, 2000));
  }
}
const aplicadas = await aplicarMigraciones(pool, path.resolve(process.cwd(), "migraciones"));
if (aplicadas.length) console.log(`procesos: migraciones aplicadas ${aplicadas.join(", ")}`);

const app = crearApp({ reglas: crearReglas(almacenEnPostgres(pool)), token: obligatoria("TOKEN_SERVICIO") });
const port = Number(obligatoria("PORT"));
serve({ fetch: app.fetch, port }, () => console.log(`procesos escuchando en ${port}`));
