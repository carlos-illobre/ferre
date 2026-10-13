import { randomUUID } from "node:crypto";
import type pg from "pg";
import { generarToken, hashear } from "./sesiones.js";

// El emparejamiento entre un celular y una computadora (decisión 58). Es un `puesto`: la
// sesión de la computadora y la del celular, unidas por un tiempo. Con eso el celular le
// manda lo que escanea y recibe los pedidos de foto, sin leer códigos. Nace de dos maneras:
// al dejar entrar a la computadora con el celular (RF-76), o leyendo el código que la
// computadora muestra en Vender. Una computadora tiene un celular emparejado a la vez, y un
// celular una computadora: el emparejamiento nuevo reemplaza al anterior de cualquiera de los dos.
//
// El vínculo es de los dos dispositivos y del usuario, no de la sesión (decisión 73): cada
// `puesto` guarda de qué usuario es y el identificador de cada dispositivo. Al salir queda
// dormido; cuando el mismo usuario vuelve a entrar en ese dispositivo, el puesto pasa a
// apuntar a su sesión nueva. Dura los días configurados y se corta solo al desvincular.
export const DIAS_EMPAREJADO = 30; // los de arranque; el negocio los cambia desde Más

type Db = Pick<pg.Pool, "query">;

const VIGENTE = "vinculado_en IS NOT NULL AND expira_en > now()";

export async function diasDeVinculo(db: Db): Promise<number> {
  const { rows } = await db.query<{ valor: string }>("SELECT valor FROM configuracion WHERE clave = 'vinculo.dias'").catch(() => ({ rows: [] as { valor: string }[] }));
  const dias = Number(rows[0]?.valor);
  return Number.isInteger(dias) && dias >= 1 && dias <= 365 ? dias : DIAS_EMPAREJADO;
}

// El identificador que cada navegador guarda para sí. Se anota en su sesión.
export const dispositivoValido = (id: unknown): id is string => typeof id === "string" && /^[\w-]{8,64}$/.test(id);
export async function anotarDispositivo(db: Db, sesionId: string, dispositivoId: unknown) {
  if (!dispositivoValido(dispositivoId)) return;
  await db.query("UPDATE sesion SET dispositivo_id = $2 WHERE id = $1 AND dispositivo_id IS DISTINCT FROM $2", [sesionId, dispositivoId]);
}

// El usuario volvió a entrar en un dispositivo que tenía vinculado: su vínculo dormido pasa a esta sesión.
export async function adoptarVinculos(db: Db, sesionId: string, usuarioId: string, dispositivoId: unknown) {
  if (!dispositivoValido(dispositivoId)) return;
  await db.query(`UPDATE puesto SET sesion_id = $1 WHERE usuario_id = $2 AND compu_dispositivo = $3 AND ${VIGENTE} AND sesion_id <> $1`, [sesionId, usuarioId, dispositivoId]);
  await db.query(`UPDATE puesto SET celular_sesion_id = $1 WHERE usuario_id = $2 AND celular_dispositivo = $3 AND ${VIGENTE} AND celular_sesion_id <> $1`, [sesionId, usuarioId, dispositivoId]);
}

// Deja anotado de quién es el vínculo y de qué dispositivos, tomándolo de las dos sesiones.
export async function sellarVinculo(db: Db, puestoId: string) {
  await db.query(
    `UPDATE puesto p SET usuario_id = a.usuario_id, compu_dispositivo = a.dispositivo_id, celular_dispositivo = b.dispositivo_id
       FROM sesion a, sesion b WHERE p.id = $1 AND a.id = p.sesion_id AND b.id = p.celular_sesion_id`, [puestoId]);
}

// Un administrador cerró a distancia la sesión de un dispositivo: sus vínculos se cortan.
export async function cortarVinculosDe(db: Db, sesionId: string) {
  await db.query(`UPDATE puesto SET expira_en = now() WHERE ${VIGENTE} AND (sesion_id = $1 OR celular_sesion_id = $1)`, [sesionId]);
}

// Deja sin efecto los emparejamientos anteriores de esa computadora o de ese celular.
export async function soltarAnteriores(db: Db, compuSesionId: string, celularSesionId: string, salvo: string | null = null) {
  await db.query(
    "UPDATE puesto SET expira_en = now() WHERE vinculado_en IS NOT NULL AND expira_en > now() AND (sesion_id = $1 OR celular_sesion_id = $2) AND id IS DISTINCT FROM $3",
    [compuSesionId, celularSesionId, salvo],
  );
}

// Vincular de nuevo (o entrar a la computadora con el celular) reemplaza al vínculo anterior:
// así se renueva el plazo.
export async function emparejar(db: Db, compuSesionId: string, celularSesionId: string, nombre: string | null): Promise<{ id: string; expira_en: string }> {
  await soltarAnteriores(db, compuSesionId, celularSesionId);
  const dias = await diasDeVinculo(db);
  const id = randomUUID();
  const { rows } = await db.query<{ expira_en: string }>(
    `INSERT INTO puesto (id, sesion_id, codigo_hash, nombre, vinculado_en, celular_sesion_id, expira_en)
     VALUES ($1, $2, $3, $4, now(), $5, now() + ($6 || ' days')::interval) RETURNING expira_en`,
    // El código no se usa (nadie tiene que leerlo): va uno al azar porque la columna es única.
    [id, compuSesionId, hashear(generarToken()), nombre, celularSesionId, String(dias)],
  );
  await sellarVinculo(db, id);
  return { id, expira_en: rows[0]?.expira_en ?? new Date(Date.now() + dias * 86400000).toISOString() };
}

// Las sesiones de computadora emparejadas hoy con esta sesión de celular.
export async function computadorasDe(db: Db, celularSesionId: string): Promise<string[]> {
  const { rows } = await db.query<{ sesion_id: string }>(
    "SELECT sesion_id FROM puesto WHERE celular_sesion_id = $1 AND vinculado_en IS NOT NULL AND expira_en > now()", [celularSesionId]);
  return rows.map((r) => r.sesion_id);
}
