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

// Una lectura en una sola foto de la base (specs/018). La marca es el «xmin» de esa foto (la
// transacción más vieja en curso): leyendo la próxima vez desde ahí, un cambio que todavía no se
// veía se lee aunque confirme tarde. El tope es su «xmax»: una marca mayor es de otra base.
export function enUnaFoto<T>(trabajo: (trx: Transaction<DB>, tope: string) => Promise<T>): Promise<{ marca: string; resultado: T }> {
  return base.transaction().setIsolationLevel("repeatable read").setAccessMode("read only").execute(async (trx) => {
    const { rows: [foto] } = await sql<{ marca: string; tope: string }>`SELECT pg_snapshot_xmin(pg_current_snapshot())::text AS marca, pg_snapshot_xmax(pg_current_snapshot())::text AS tope`.execute(trx);
    return { marca: foto!.marca, resultado: await trabajo(trx, foto!.tope) };
  });
}
