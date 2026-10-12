import { randomUUID } from "node:crypto";
import type pg from "pg";
import { generarToken, hashear } from "./sesiones.js";

// El emparejamiento entre un celular y una computadora (decisión 58). Es un `puesto`: la
// sesión de la computadora y la del celular, unidas por un tiempo. Con eso el celular le
// manda lo que escanea y recibe los pedidos de foto, sin leer códigos. Nace de dos maneras:
// al dejar entrar a la computadora con el celular (RF-76), o leyendo el código que la
// computadora muestra en Vender. Una computadora tiene un celular emparejado a la vez, y un
// celular una computadora: el emparejamiento nuevo reemplaza al anterior de cualquiera de los dos.
export const DIAS_EMPAREJADO = 30;

type Db = Pick<pg.Pool, "query">;

// Deja sin efecto los emparejamientos anteriores de esa computadora o de ese celular.
export async function soltarAnteriores(db: Db, compuSesionId: string, celularSesionId: string, salvo: string | null = null) {
  await db.query(
    "UPDATE puesto SET expira_en = now() WHERE vinculado_en IS NOT NULL AND expira_en > now() AND (sesion_id = $1 OR celular_sesion_id = $2) AND id IS DISTINCT FROM $3",
    [compuSesionId, celularSesionId, salvo],
  );
}

export async function emparejar(db: Db, compuSesionId: string, celularSesionId: string, nombre: string | null): Promise<{ id: string; expira_en: string }> {
  await soltarAnteriores(db, compuSesionId, celularSesionId);
  const id = randomUUID();
  const { rows } = await db.query<{ expira_en: string }>(
    `INSERT INTO puesto (id, sesion_id, codigo_hash, nombre, vinculado_en, celular_sesion_id, expira_en)
     VALUES ($1, $2, $3, $4, now(), $5, now() + ($6 || ' days')::interval) RETURNING expira_en`,
    // El código no se usa (nadie tiene que leerlo): va uno al azar porque la columna es única.
    [id, compuSesionId, hashear(generarToken()), nombre, celularSesionId, String(DIAS_EMPAREJADO)],
  );
  return { id, expira_en: rows[0]?.expira_en ?? new Date(Date.now() + DIAS_EMPAREJADO * 86400000).toISOString() };
}

// Las sesiones de computadora emparejadas hoy con esta sesión de celular.
export async function computadorasDe(db: Db, celularSesionId: string): Promise<string[]> {
  const { rows } = await db.query<{ sesion_id: string }>(
    "SELECT sesion_id FROM puesto WHERE celular_sesion_id = $1 AND vinculado_en IS NOT NULL AND expira_en > now()", [celularSesionId]);
  return rows.map((r) => r.sesion_id);
}
