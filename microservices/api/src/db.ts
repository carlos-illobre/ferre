import pg from "pg";
import { config } from "./config.js";

// Cada conexión nueva deja registros en la base (specs/018, RF-125): las que se abren para
// atender se conservan diez minutos sin uso, en vez de los diez segundos de arranque de `pg`.
export const pool = new pg.Pool({ connectionString: config.databaseUrl, idleTimeoutMillis: 10 * 60_000, keepAlive: true });

// Supabase pausa la base del plan gratuito a los 7 días sin uso (specs/018, RF-125, E31): con el
// servidor andando, una consulta por día, aunque nadie use la aplicación. Una por día y no cada 7
// días: una cada 7 justos puede llegar tarde, y este reloj vuelve a empezar con cada subida (al
// arrancar ya se consulta la base). No deja al proceso vivo por sí sola.
export const UN_DIA_MS = 24 * 60 * 60_000;
export function mantenerLaBaseDespierta(cada = UN_DIA_MS): () => void {
  const reloj = setInterval(() => { pool.query("SELECT 1").catch((e: unknown) => console.error("la consulta diaria a la base falló", e)); }, cada);
  reloj.unref?.();
  return () => clearInterval(reloj);
}

