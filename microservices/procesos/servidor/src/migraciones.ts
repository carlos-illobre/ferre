import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type pg from "pg";

// Migraciones del módulo: archivos SQL numerados, en orden y una sola vez, en su propio esquema
// y con su propia tabla de registro. No toca las migraciones de la aplicación que lo usa.
// Cada archivo corre en su transacción; si falla, el arranque se corta.

export const ESQUEMA = "procesos";
// Distinto del candado de la aplicación: pueden migrar a la vez sin esperarse.
const CANDADO = 7393;

export async function aplicarMigraciones(pool: pg.Pool, carpeta: string): Promise<string[]> {
  const cliente = await pool.connect();
  const aplicadas: string[] = [];
  try {
    await cliente.query("SELECT pg_advisory_lock($1)", [CANDADO]);
    await cliente.query(`CREATE SCHEMA IF NOT EXISTS ${ESQUEMA}`);
    await cliente.query(`CREATE TABLE IF NOT EXISTS ${ESQUEMA}.migracion (nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())`);
    const { rows } = await cliente.query<{ nombre: string }>(`SELECT nombre FROM ${ESQUEMA}.migracion`);
    const hechas = new Set(rows.map((r) => r.nombre));
    for (const nombre of (await readdir(carpeta)).filter((a) => a.endsWith(".sql")).sort()) {
      if (hechas.has(nombre)) continue;
      const sql = await readFile(path.join(carpeta, nombre), "utf8");
      await cliente.query("BEGIN");
      try {
        await cliente.query(sql);
        await cliente.query(`INSERT INTO ${ESQUEMA}.migracion (nombre) VALUES ($1)`, [nombre]);
        await cliente.query("COMMIT");
      } catch (error) {
        await cliente.query("ROLLBACK");
        throw new Error(`La migración ${nombre} de procesos falló: ${(error as Error).message}`);
      }
      aplicadas.push(nombre);
    }
    return aplicadas;
  } finally {
    await cliente.query("SELECT pg_advisory_unlock($1)", [CANDADO]).catch(() => undefined);
    cliente.release();
  }
}
