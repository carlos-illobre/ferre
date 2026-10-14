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
const aplicadas = await aplicarMigraciones(pool, path.resolve(process.cwd(), "migraciones"));
if (aplicadas.length) console.log(`procesos: migraciones aplicadas ${aplicadas.join(", ")}`);

const app = crearApp({ reglas: crearReglas(almacenEnPostgres(pool)), token: obligatoria("TOKEN_SERVICIO") });
const port = Number(obligatoria("PORT"));
serve({ fetch: app.fetch, port }, () => console.log(`procesos escuchando en ${port}`));
