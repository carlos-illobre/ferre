import { pool } from "../db.js";

// Los ajustes que valen para todos los dispositivos (specs/020) viven en la tabla de ajustes, la
// misma que guarda los días del vínculo: una fila por clave, con el valor como texto.
export async function leer(claves: readonly string[]): Promise<Map<string, string>> {
  const { rows } = await pool.query<{ clave: string; valor: string }>("SELECT clave, valor FROM configuracion WHERE clave = ANY($1::text[])", [claves]);
  return new Map(rows.map((r) => [r.clave, r.valor]));
}

export const guardar = (clave: string, valor: number) => pool.query(
  "INSERT INTO configuracion (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = now()", [clave, String(valor)]);
