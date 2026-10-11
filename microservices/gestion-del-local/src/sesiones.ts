import { createHash, randomBytes, randomUUID } from "node:crypto";
import type pg from "pg";

// Sesiones con token opaco (ADR-011). El token solo existe en el dispositivo; acá se
// guarda su hash, así una copia de la base no sirve para entrar.

export const DURACION_SESION_DIAS = 90;
const RENOVAR_CADA_MS = 60 * 60 * 1000; // se extiende con el uso, como mucho una vez por hora

// `roles` son los nombres de sus roles; `permisos`, la unión de lo que esos roles permiten.
export type Usuario = { id: string; email: string; nombre: string; roles: string[]; permisos: string[] };
export type SesionActiva = { id: string; usuario: Usuario };

export function hashear(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generarToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function crearSesion(
  db: pg.Pool | pg.PoolClient,
  usuarioId: string,
  dispositivo: string | null,
): Promise<{ id: string; token: string }> {
  const id = randomUUID();
  const token = generarToken();
  await db.query(
    `INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' days')::interval)`,
    [id, usuarioId, hashear(token), dispositivo, String(DURACION_SESION_DIAS)],
  );
  return { id, token };
}

// Los roles y permisos de un usuario salen de sus roles asignados (ADR-017).
const ROLES_Y_PERMISOS = `
  COALESCE((SELECT array_agg(DISTINCT r.nombre) FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id WHERE ur.usuario_id = u.id), '{}') AS roles,
  COALESCE((SELECT array_agg(DISTINCT rp.permiso) FROM usuario_rol ur JOIN rol_permiso rp ON rp.rol_id = ur.rol_id WHERE ur.usuario_id = u.id), '{}') AS permisos`;

// El usuario como lo recibe la aplicación al entrar: con sus roles y permisos.
export async function usuarioConPermisos(db: Pick<pg.Pool, "query">, id: string): Promise<Usuario | null> {
  const { rows } = await db.query<Usuario>(`SELECT u.id, u.email, u.nombre, ${ROLES_Y_PERMISOS} FROM usuario u WHERE u.id = $1 AND u.activo`, [id]);
  const u = rows[0];
  return u ? { id: u.id, email: u.email, nombre: u.nombre, roles: u.roles ?? [], permisos: u.permisos ?? [] } : null;
}

export async function buscarSesion(db: pg.Pool, token: string): Promise<SesionActiva | null> {
  const { rows } = await db.query<{
    id: string; ultimo_uso_en: Date; usuario_id: string; email: string; nombre: string; roles: string[] | null; permisos: string[] | null;
  }>(
    `SELECT s.id, s.ultimo_uso_en, u.id AS usuario_id, u.email, u.nombre, ${ROLES_Y_PERMISOS}
       FROM sesion s JOIN usuario u ON u.id = s.usuario_id
      WHERE s.token_hash = $1 AND s.revocada_en IS NULL AND s.expira_en > now() AND u.activo`,
    [hashear(token)],
  );
  const fila = rows[0];
  if (!fila) return null;
  if (Date.now() - fila.ultimo_uso_en.getTime() > RENOVAR_CADA_MS) {
    await db.query(
      `UPDATE sesion SET ultimo_uso_en = now(), expira_en = now() + ($2 || ' days')::interval WHERE id = $1`,
      [fila.id, String(DURACION_SESION_DIAS)],
    );
  }
  return { id: fila.id, usuario: { id: fila.usuario_id, email: fila.email, nombre: fila.nombre, roles: fila.roles ?? [], permisos: fila.permisos ?? [] } };
}

export async function revocarSesion(db: pg.Pool, sesionId: string): Promise<void> {
  await db.query(`UPDATE sesion SET revocada_en = now() WHERE id = $1 AND revocada_en IS NULL`, [sesionId]);
}
