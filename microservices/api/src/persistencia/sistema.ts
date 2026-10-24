import { sql } from "kysely";
import { base } from "./conexion.js";

// Los ajustes que valen para todos los dispositivos (specs/020) viven en la tabla de ajustes, la
// misma que guarda los días del vínculo: una fila por clave, con el valor como texto.
export async function leer(claves: readonly string[]): Promise<Map<string, string>> {
  const { rows } = await sql<{ clave: string; valor: string }>`SELECT clave, valor FROM configuracion WHERE clave = ANY(${claves}::text[])`.execute(base);
  return new Map(rows.map((r) => [r.clave, r.valor]));
}

export const guardar = (clave: string, valor: number) =>
  sql`INSERT INTO configuracion (clave, valor) VALUES (${clave}, ${String(valor)}) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = now()`.execute(base);
