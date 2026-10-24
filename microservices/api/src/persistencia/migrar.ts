import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "kysely";
import { Migrator, type Migration } from "kysely/migration";
import { base } from "./conexion.js";

// Las migraciones son archivos SQL numerados (`migraciones/`); las aplica el migrador de Kysely
// (ADR-025), que pone el candado, la transacción y el registro. Este proveedor solo las lee.
export const CARPETA = fileURLToPath(new URL("./migraciones/", import.meta.url));

async function leer(carpeta: string): Promise<Record<string, Migration>> {
  const archivos = (await readdir(carpeta)).filter((a) => a.endsWith(".sql")).sort();
  const textos = await Promise.all(archivos.map((a) => readFile(path.join(carpeta, a), "utf8")));
  return Object.fromEntries(archivos.map((a, i) => [a, {
    up: (db) => sql.raw(textos[i]!).execute(db).then(() => undefined, (e: Error) => { throw new Error(`La migración ${a} falló: ${e.message}`); }),
  }]));
}

// Aplica las que falten, en orden y una sola vez; devuelve cuáles aplicó. Si una falla, no queda
// aplicada ninguna de esta vez y el error dice cuál fue.
export async function migrar(carpeta = CARPETA): Promise<string[]> {
  const { error, results } = await new Migrator({ db: base, provider: { getMigrations: () => leer(carpeta) } }).migrateToLatest();
  if (error) throw error;
  return results!.map((r) => r.migrationName);
}
