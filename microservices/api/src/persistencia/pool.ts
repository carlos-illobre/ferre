import pg from "pg";
import { config } from "../config.js";

// El pool de conexiones a la base del servicio (ADR-026). Está aparte de la instancia de Kysely
// (`conexion.ts`) para que las pruebas de rutas lo reemplacen por la base simulada. Las conexiones
// que se abren para atender se conservan diez minutos sin uso.
export const pool = new pg.Pool({ connectionString: config.databaseUrl, idleTimeoutMillis: 10 * 60_000, keepAlive: true });
