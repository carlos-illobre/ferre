import { serve } from "@hono/node-server";
import { crearApp } from "./rutas.js";
import { crearReglas } from "./reglas.js";
import { crearBase, esperarLaBase } from "./persistencia/conexion.js";
import { migrar } from "./persistencia/migrar.js";

// El servicio de Auditoría (specs/027). Sin valores por omisión: si falta una variable, no arranca.
function obligatoria(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable ${nombre}`);
  return valor;
}

const base = crearBase(obligatoria("DATABASE_URL"));
await esperarLaBase(base, 30, 2000);
const aplicadas = await migrar(base);
if (aplicadas.length) console.log(`auditoria: migraciones aplicadas ${aplicadas.join(", ")}`);

const app = crearApp({ reglas: crearReglas(base), token: obligatoria("TOKEN_SERVICIO"), permisoReportes: obligatoria("PERMISO_REPORTES") });
const port = Number(obligatoria("PORT"));
serve({ fetch: app.fetch, port }, () => console.log(`auditoria escuchando en ${port}`));
