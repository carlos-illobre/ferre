import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import type { DB } from "./tablas.js";

// La única puerta a la base de Auditoría (ADR-025, ADR-026): toda consulta pasa por Kysely. Si la
// base corta una conexión que esperaba sin uso, el pool la descarta: se anota y el proceso sigue.
export function crearBase(url: string): Kysely<DB> {
  const pool = new pg.Pool({ connectionString: url });
  pool.on("error", (error) => console.error(`auditoria: se perdió una conexión sin uso (${error.message})`));
  return new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
}
export type Base = Kysely<DB>;

// La base puede tardar más que este proceso en aceptar conexiones (arranque en frío): se espera
// con reintentos. Pasados los intentos, es un error y corta el arranque.
export async function esperarLaBase(base: Base, intentos: number, esperaMs: number): Promise<void> {
  for (let i = 1; !(await sql`SELECT 1`.execute(base).then(() => true, () => false)); i++) {
    if (i >= intentos) throw new Error(`La base no respondió en ${intentos} intentos`);
    console.log(`auditoria: base sin responder (intento ${i}/${intentos}), reintentando en ${esperaMs} ms`);
    await new Promise((listo) => setTimeout(listo, esperaMs));
  }
}
