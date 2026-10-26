import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "kysely";
import { Migrator, type Migration } from "kysely/migration";
import type { Base } from "./conexion.js";

// Las migraciones de Tickets: archivos SQL numerados (`migraciones/`), en su propio esquema y con
// su propio registro, aplicadas por el migrador de Kysely (ADR-025). Este proveedor solo las lee.
export const ESQUEMA = "tickets";
export const CARPETA = fileURLToPath(new URL("./migraciones/", import.meta.url));

async function leer(carpeta: string): Promise<Record<string, Migration>> {
  const archivos = (await readdir(carpeta)).filter((a) => a.endsWith(".sql")).sort();
  const textos = await Promise.all(archivos.map((a) => readFile(path.join(carpeta, a), "utf8")));
  return Object.fromEntries(archivos.map((a, i) => [a, {
    up: (db) => sql.raw(textos[i]!).execute(db).then(() => undefined, (e: Error) => { throw new Error(`La migración ${a} de tickets falló: ${e.message}`); }),
  }]));
}

// Aplica las que falten, en orden y una sola vez; devuelve cuáles aplicó.
export async function migrar(base: Base, carpeta = CARPETA): Promise<string[]> {
  const { error, results } = await new Migrator({ db: base, provider: { getMigrations: () => leer(carpeta) }, migrationTableSchema: ESQUEMA }).migrateToLatest();
  if (error) throw error;
  return results!.map((r) => r.migrationName);
}
