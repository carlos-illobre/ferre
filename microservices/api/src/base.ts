import { Kysely, PostgresDialect, type Transaction } from "kysely";
import * as db from "./db.js";
import type { Base } from "./tablas.js";

// Las consultas con tipos (ADR-018, etapa 5). Usa el mismo pool que el resto del servidor; se
// lo pide en cada conexión, así las pruebas pueden cambiar la base simulada entre una y otra.
// Los valores siempre van como parámetros: Kysely no pega texto en la consulta.
const pool = { connect: () => db.pool.connect(), end: async () => undefined };
export const base = new Kysely<Base>({ dialect: new PostgresDialect({ pool: pool as never }) });

// Lo que puede ejecutar una consulta: la base o una transacción abierta.
export type Ejecutor = Kysely<Base> | Transaction<Base>;
