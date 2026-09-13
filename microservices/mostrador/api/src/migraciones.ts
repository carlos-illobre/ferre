import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type pg from "pg";

// Migraciones como archivos SQL numerados, aplicadas en orden y una sola vez.
// Sin ORM: con una docena de tablas, la capa extra no paga (issue #6).
// Cada archivo corre en su propia transacción; si falla, no queda registrado y el
// arranque se corta, que es cuando el error todavía es barato.

const CARPETA = path.resolve(process.cwd(), "migrations");

export async function listarMigraciones(carpeta = CARPETA): Promise<string[]> {
  const archivos = await readdir(carpeta);
  return archivos.filter((a) => a.endsWith(".sql")).sort();
}

export async function aplicarMigraciones(pool: pg.Pool, carpeta = CARPETA): Promise<string[]> {
  const cliente = await pool.connect();
  const aplicadas: string[] = [];
  try {
    // Un solo proceso migra a la vez, aunque arranquen dos contenedores.
    await cliente.query("SELECT pg_advisory_lock(7392)");
    await cliente.query(
      "CREATE TABLE IF NOT EXISTS migracion (nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())",
    );
    const { rows } = await cliente.query<{ nombre: string }>("SELECT nombre FROM migracion");
    const yaAplicadas = new Set(rows.map((r) => r.nombre));

    for (const nombre of await listarMigraciones(carpeta)) {
      if (yaAplicadas.has(nombre)) continue;
      const sql = await readFile(path.join(carpeta, nombre), "utf8");
      await cliente.query("BEGIN");
      try {
        await cliente.query(sql);
        await cliente.query("INSERT INTO migracion (nombre) VALUES ($1)", [nombre]);
        await cliente.query("COMMIT");
      } catch (error) {
        await cliente.query("ROLLBACK");
        throw new Error(`La migración ${nombre} falló: ${(error as Error).message}`);
      }
      aplicadas.push(nombre);
    }
    return aplicadas;
  } finally {
    await cliente.query("SELECT pg_advisory_unlock(7392)").catch(() => undefined);
    cliente.release();
  }
}
