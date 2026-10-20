import pg from "pg";
import { config } from "./config.js";

// Cada conexión nueva deja registros en la base (specs/018, RF-125): las que se abren para
// atender se conservan diez minutos sin uso, en vez de los diez segundos de arranque de `pg`.
export const pool = new pg.Pool({ connectionString: config.databaseUrl, idleTimeoutMillis: 10 * 60_000, keepAlive: true });
