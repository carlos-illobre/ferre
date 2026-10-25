import { sql } from "kysely";
import { numero } from "./conexion.js";
import type { Ejecutor } from "./transaccion.js";
import { PARA_ADMINISTRAR, PARA_EL_SISTEMA } from "../permisos.js";
import type { Usuario } from "../contratos/usuarios.js";
import type { Enviable } from "../enviable.js";

// Con alias: la prueba del SQL con parámetros reconoce `sql<Tipo>` sin anidar.
type UsuarioConRoles = Enviable<Usuario>;

// Usuarios y roles: el acceso a los datos (ADR-018). Las listas de ids o permisos van como un
// solo parámetro (un arreglo), igual que antes.

// Quiénes, entre los usuarios activos, tienen los dos permisos de administrar.
export async function quienesAdministran(e: Ejecutor): Promise<string[]> {
  const { rows } = await sql<{ id: string }>`SELECT u.id FROM usuario u
      WHERE u.activo AND (SELECT count(DISTINCT rp.permiso) FROM usuario_rol ur JOIN rol_permiso rp ON rp.rol_id = ur.rol_id
                           WHERE ur.usuario_id = u.id AND rp.permiso = ANY(${PARA_ADMINISTRAR}::text[])) = ${PARA_ADMINISTRAR.length}`.execute(e);
  return rows.map((r) => r.id);
}

// Cuántos usuarios activos pueden fijar los ajustes del sistema (specs/020).
export async function cuantosAdministranElSistema(e: Ejecutor): Promise<number> {
  const { rows } = await sql<{ n: number }>`SELECT count(DISTINCT u.id)::int AS n FROM usuario u
      JOIN usuario_rol ur ON ur.usuario_id = u.id JOIN rol_permiso rp ON rp.rol_id = ur.rol_id
      WHERE u.activo AND rp.permiso = ${PARA_EL_SISTEMA}`.execute(e);
  return numero(rows, "n");
}

// ---------- Roles ----------
export const rolesConPermisos = (e: Ejecutor) =>
  sql<{ id: string; nombre: string; descripcion: string | null; permisos: string[]; usuarios: number }>`SELECT r.id, r.nombre, r.descripcion,
            COALESCE((SELECT array_agg(rp.permiso ORDER BY rp.permiso) FROM rol_permiso rp WHERE rp.rol_id = r.id), '{}') AS permisos,
            (SELECT count(*)::int FROM usuario_rol ur JOIN usuario u ON u.id = ur.usuario_id WHERE ur.rol_id = r.id AND u.activo) AS usuarios
       FROM rol r ORDER BY r.creado_en, r.nombre`.execute(e).then((r) => r.rows);

export const insertarRol = (e: Ejecutor, id: string, nombre: string, descripcion: string | null) => sql`INSERT INTO rol (id, nombre, descripcion) VALUES (${id}, ${nombre}, ${descripcion})`.execute(e);

export async function cambiarRol(e: Ejecutor, id: string, nombre: string | null, descripcion: string | null): Promise<boolean> {
  const r = await sql`UPDATE rol SET nombre = COALESCE(${nombre}, nombre), descripcion = COALESCE(${descripcion}, descripcion) WHERE id = ${id}`.execute(e);
  return Number(r.numAffectedRows) > 0;
}

export async function ponerPermisos(e: Ejecutor, rolId: string, permisos: string[], reemplazar: boolean): Promise<void> {
  if (reemplazar) await sql`DELETE FROM rol_permiso WHERE rol_id = ${rolId}`.execute(e);
  await sql`INSERT INTO rol_permiso (rol_id, permiso) SELECT ${rolId}, unnest(${permisos}::text[])`.execute(e);
}

export async function rolConCuantos(e: Ejecutor, id: string): Promise<{ nombre: string; usuarios: number } | null> {
  const { rows } = await sql<{ nombre: string; usuarios: number }>`SELECT r.nombre, (SELECT count(*)::int FROM usuario_rol ur WHERE ur.rol_id = r.id) AS usuarios FROM rol r WHERE r.id = ${id}`.execute(e);
  return rows[0] ?? null;
}

export const borrarRol = (e: Ejecutor, id: string) => sql`DELETE FROM rol WHERE id = ${id}`.execute(e);

// Los roles con esos nombres, sin distinguir mayúsculas; sin nombres, todos.
export const rolesPorNombre = (e: Ejecutor, nombres: string[] | null) =>
  sql<{ id: string; nombre: string }>`SELECT id, nombre FROM rol WHERE ${nombres === null} OR lower(nombre) = ANY(${nombres ?? []}::text[])`.execute(e).then((r) => r.rows);

// ---------- Usuarios ----------
export const usuariosConRoles = (e: Ejecutor) =>
  sql<UsuarioConRoles>`SELECT u.id, u.email, u.nombre, u.activo, u.creado_en,
            COALESCE((SELECT json_agg(json_build_object('id', r.id, 'nombre', r.nombre) ORDER BY r.nombre) FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id WHERE ur.usuario_id = u.id), '[]'::json) AS roles
       FROM usuario u ORDER BY u.creado_en`.execute(e).then((r) => r.rows);

// Cuáles de esos ids son roles que existen.
export async function rolesQueExisten(e: Ejecutor, ids: string[]): Promise<number> {
  const { rows } = await sql<{ id: string }>`SELECT id FROM rol WHERE id = ANY(${ids}::uuid[])`.execute(e);
  return rows.length;
}

export const insertarUsuario = (e: Ejecutor, id: string, email: string, nombre: string) => sql`INSERT INTO usuario (id, email, nombre) VALUES (${id}, ${email}, ${nombre})`.execute(e);

export async function asignarRoles(e: Ejecutor, usuarioId: string, roles: string[], reemplazar: boolean): Promise<void> {
  if (reemplazar) await sql`DELETE FROM usuario_rol WHERE usuario_id = ${usuarioId}`.execute(e);
  await sql`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT ${usuarioId}, unnest(${roles}::uuid[])`.execute(e);
}

export async function cambiarUsuario(e: Ejecutor, id: string, activo: boolean | null, nombre: string | null): Promise<boolean> {
  const r = await sql`UPDATE usuario SET activo = COALESCE(${activo}, activo), nombre = COALESCE(${nombre}, nombre) WHERE id = ${id}`.execute(e);
  return Number(r.numAffectedRows) > 0;
}

// Devuelve cuáles se cerraron, para cerrar sus canales (025-E32).
export async function cerrarSesionesDe(e: Ejecutor, usuarioId: string): Promise<string[]> {
  const { rows } = await sql<{ id: string }>`UPDATE sesion SET revocada_en = now() WHERE usuario_id = ${usuarioId} AND revocada_en IS NULL RETURNING id`.execute(e);
  return rows.map((r) => r.id);
}
