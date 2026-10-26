import pg from "pg";
import { config } from "../config.js";

// El pool de conexiones a la base del servicio (ADR-026). Está aparte de la instancia de Kysely
// (`conexion.ts`) para que las pruebas de rutas lo reemplacen por la base simulada. Las conexiones
// que se abren para atender se conservan diez minutos sin uso. Si la base corta una de las que
// esperan (se reinició o se cayó), el pool la descarta: se anota y el servidor sigue, para que la
// salud responda que la base no responde en vez de caerse.
export const pool = new pg.Pool({ connectionString: config.databaseUrl, idleTimeoutMillis: 10 * 60_000, keepAlive: true });
pool.on("error", (error) => console.error(`base: se perdió una conexión sin uso (${error.message})`));
