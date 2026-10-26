import { sql, type Kysely, type Transaction } from "kysely";
import { base } from "./conexion.js";
import type { DB } from "./tablas.js";

// Lo que puede ejecutar una consulta: la base o una transacción abierta.
export type Ejecutor = Kysely<DB> | Transaction<DB>;

// Para salir de una transacción deshaciendo lo hecho y devolver una respuesta (no un error):
// `throw new Deshacer(resultado)` adentro de `enTransaccion`.
export class Deshacer<T> extends Error {
  constructor(public resultado: T) { super("se deshace la transacción"); }
}

// La única forma de abrir una transacción: todo o nada.
export async function enTransaccion<T>(trabajo: (trx: Transaction<DB>) => Promise<T>): Promise<T> {
  try { return await base.transaction().execute(trabajo); }
  catch (e) { if (e instanceof Deshacer) return e.resultado as T; throw e; }
}
