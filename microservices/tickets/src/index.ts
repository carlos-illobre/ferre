import { serve } from "@hono/node-server";
import { crearApp } from "./rutas.js";
import { crearReglas } from "./reglas.js";
import { crearBandeja } from "./persistencia/auditoria.js";
import { crearBase, esperarLaBase } from "./persistencia/conexion.js";
import { migrar } from "./persistencia/migrar.js";
import { datosDeTickets } from "./persistencia/tickets.js";

// El servicio de Tickets (specs/028). Sin valores por omisión: si falta una variable, no arranca.
// AUDITORIA_URL es la única que puede quedar vacía, a propósito: apaga los eventos (decisión 167).
function obligatoria(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable ${nombre}`);
  return valor;
}

const base = crearBase(obligatoria("DATABASE_URL"));
await esperarLaBase(base, 30, 2000);
const aplicadas = await migrar(base);
if (aplicadas.length) console.log(`tickets: migraciones aplicadas ${aplicadas.join(", ")}`);

const bandeja = crearBandeja(base, { conexion: obligatoria("DATABASE_URL"), auditoria: process.env.AUDITORIA_URL || undefined, token: obligatoria("TOKEN_SERVICIO") });
await bandeja.iniciar();
console.log(bandeja.encendida ? "tickets: la bandeja manda a Auditoría" : "tickets: auditoría apagada (sin AUDITORIA_URL)");

const datos = datosDeTickets(base, obligatoria("CARPETA_FOTOS"), bandeja.anotar);
const app = crearApp({ reglas: crearReglas(datos), token: obligatoria("TOKEN_SERVICIO") });
const port = Number(obligatoria("PORT"));
serve({ fetch: app.fetch, port }, () => console.log(`tickets escuchando en ${port}`));
