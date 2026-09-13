import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

// Distingue "no pude preguntar" de "está bien": el health lo reporta y el compose no da
// por sano al contenedor hasta que la base responda.
export async function baseResponde(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
