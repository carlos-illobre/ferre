import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import { config } from "../config.js";
import * as conexiones from "./pool.js";
import type { DB } from "./tablas.js";

// La única puerta a la base (ADR-025): toda consulta pasa por esta instancia de Kysely. Pide la
// conexión al pool en cada uso, así las pruebas de rutas pueden cambiar la base simulada entre una
// y otra. Los valores siempre van como parámetros: Kysely no pega texto en la consulta.
const pool = { connect: () => conexiones.pool.connect() };
export const base = new Kysely<DB>({ dialect: new PostgresDialect({ pool: pool as never }) });

// El número de una consulta que devuelve una sola fila (un count, una suma), en su columna `clave`.
// La base simulada de las pruebas de rutas no devuelve filas: entonces vale 0.
export const numero = <C extends string>(filas: Record<C, unknown>[], clave: C): number => filas.reduce<number>((_, f) => Number(f[clave]), 0);

// De qué instalación de PostgreSQL es la base (su `system_identifier`): cambia con cada base nueva
// o restaurada de un volcado, y con ella cambian los números de transacción (022-E23).
export const identificadorDeLaBase = () =>
  sql<{ id: string }>`SELECT system_identifier::text AS id FROM pg_control_system()`.execute(base).then((r) => r.rows.map((f) => f.id).join());

// Cierra las conexiones: al terminar un comando o las pruebas.
export const cerrar = () => conexiones.pool.end();

// Distingue «no pude preguntar» de «está bien»: la salud lo dice y el compose no da por sano al
// servidor hasta que la base responda.
export async function baseResponde(): Promise<boolean> {
  try {
    await sql`SELECT 1`.execute(base);
    return true;
  } catch {
    return false;
  }
}

// La base puede tardar más que el servidor en aceptar conexiones (arranque en frío del compose):
// se espera con reintentos en vez de morir al primer rechazo. Pasados los intentos, es un error.
export async function esperarLaBase(intentos: number, esperaMs: number): Promise<void> {
  for (let i = 1; !(await baseResponde()); i++) {
    if (i >= intentos) throw new Error(`La base no respondió en ${intentos} intentos`);
    console.log(`base sin responder (intento ${i}/${intentos}), reintentando en ${esperaMs} ms`);
    await new Promise((listo) => setTimeout(listo, esperaMs));
  }
}

// Una conexión propia, larga y quieta, solo para escuchar los avisos de `canal` (`pg_notify`).
// Avisa al conectarse, porque mientras no escuchaba pudo cambiar algo. Si se corta, se reconecta
// con espera creciente. Devuelve cómo dejar de escuchar.
export function escuchar(canal: string, alAviso: () => void, esperaInicial = 1000): () => void {
  let activo = true;
  let espera = esperaInicial;
  let reconexion: ReturnType<typeof setTimeout> | undefined;
  let cliente: pg.Client;
  // Suelta un cliente que ya no sirve; un error que llega tarde no tumba el proceso.
  const soltar = (c: pg.Client) => {
    c.removeAllListeners();
    c.on("error", () => undefined);
    c.end().catch(() => undefined);
  };
  const reconectar = (c: pg.Client) => {
    soltar(c);
    if (!activo) return;
    reconexion = setTimeout(conectar, espera);
    espera = Math.min(espera * 2, 60_000);
  };
  function conectar() {
    const c = (cliente = new pg.Client({ connectionString: config.databaseUrl, keepAlive: true }));
    c.on("notification", alAviso);
    c.on("error", () => reconectar(c));
    c.connect()
      .then(() => c.query(`LISTEN ${canal}`))
      .then(() => { espera = esperaInicial; alAviso(); })
      .catch(() => reconectar(c));
  }
  conectar();
  return () => {
    activo = false;
    clearTimeout(reconexion);
    soltar(cliente);
  };
}
