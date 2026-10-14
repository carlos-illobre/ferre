import { Kysely, PostgresDialect, type Transaction } from "kysely";
import type pg from "pg";
import * as db from "./db.js";
import type { Base } from "./tablas.js";

// Las consultas con tipos (ADR-018, etapa 5). Usa el mismo pool que el resto del servidor; se
// lo pide en cada conexión, así las pruebas pueden cambiar la base simulada entre una y otra.
// Los valores siempre van como parámetros: Kysely no pega texto en la consulta.
const pool = { connect: () => db.pool.connect(), end: async () => undefined };
export const base = new Kysely<Base>({ dialect: new PostgresDialect({ pool: pool as never }) });

// Para salir de una transacción deshaciendo lo hecho y devolver una respuesta (no un error):
// `throw new Deshacer(resultado)` adentro de `enTransaccion`.
export class Deshacer<T> extends Error {
  constructor(public resultado: T) { super("se deshace la transacción"); }
}
export async function enTransaccion<T>(trabajo: (trx: Transaction<Base>) => Promise<T>): Promise<T> {
  try { return await base.transaction().execute(trabajo); }
  catch (e) { if (e instanceof Deshacer) return e.resultado as T; throw e; }
}

// Lo que puede ejecutar una consulta: la base o una transacción abierta.
export type Ejecutor = Kysely<Base> | Transaction<Base>;

// Lo mismo para los temas que escriben su SQL con el cliente de Postgres (duplicados, listas):
// una transacción con su cliente, que se deshace si algo falla o si se tira `Deshacer`.
export async function enTransaccionPg<T>(trabajo: (cliente: pg.PoolClient) => Promise<T>): Promise<T> {
  const cliente = await db.pool.connect();
  try {
    await cliente.query("BEGIN");
    const r = await trabajo(cliente);
    await cliente.query("COMMIT");
    return r;
  } catch (e) {
    await cliente.query("ROLLBACK");
    if (e instanceof Deshacer) return e.resultado as T;
    throw e;
  } finally {
    cliente.release();
  }
}
