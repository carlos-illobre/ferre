import { serve } from "@hono/node-server";
import { crearApp } from "./rutas.js";
import { crearReglas } from "./reglas.js";
import { crearBase, esperarLaBase } from "./persistencia/conexion.js";
import { migrar } from "./persistencia/migrar.js";
import { crearBandeja } from "./persistencia/auditoria.js";
import { almacenEnPostgres } from "./persistencia/procesos.js";

// El servicio de Procesos. Sin valores por omisión: si falta una variable, no arranca.
function obligatoria(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable ${nombre}`);
  return valor;
}

const base = crearBase(obligatoria("DATABASE_URL"));
// Un minuto sin base corta el arranque.
await esperarLaBase(base, 30, 2000);
const aplicadas = await migrar(base);
if (aplicadas.length) console.log(`procesos: migraciones aplicadas ${aplicadas.join(", ")}`);

// Auditoría es opcional: sin AUDITORIA_URL, Procesos funciona igual y no manda sus eventos (specs/027).
const bandeja = crearBandeja(base, { conexion: obligatoria("DATABASE_URL"), auditoria: process.env.AUDITORIA_URL || undefined, token: obligatoria("TOKEN_SERVICIO") });
await bandeja.iniciar();
console.log(bandeja.encendida ? "procesos: la bandeja manda a Auditoría" : "procesos: auditoría apagada (sin AUDITORIA_URL)");

const app = crearApp({
  reglas: crearReglas(almacenEnPostgres(base, bandeja.anotar)),
  token: obligatoria("TOKEN_SERVICIO"),
  permisos: { ver: obligatoria("PERMISO_VER"), dibujar: obligatoria("PERMISO_DIBUJAR") },
});
const port = Number(obligatoria("PORT"));
serve({ fetch: app.fetch, port }, () => console.log(`procesos escuchando en ${port}`));
