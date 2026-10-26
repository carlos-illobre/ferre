import { randomUUID } from "node:crypto";
import { sql, type Insertable } from "kysely";
import { hashear } from "../acceso.js";
import { base } from "../conexion.js";
import type { DB } from "../tablas.js";

// Datos de prueba para la capa de datos: cada función da de alta una fila con lo mínimo y devuelve
// su identificador. Lo que la prueba necesita distinto se pasa en `campos`.
type Campos<T extends keyof DB> = Partial<Insertable<DB[T]>>;
const id = () => randomUUID();

async function alta<T extends keyof DB>(tabla: T, fila: Insertable<DB[T]>): Promise<string> {
  await base.insertInto(tabla).values(fila as never).execute();
  return (fila as unknown as { id: string }).id;
}

export const usuario = (campos: Campos<"usuario"> = {}) => alta("usuario", { id: id(), email: `${id()}@ferre.test`, nombre: "Ana", ...campos });

export async function rol(permisos: string[], campos: Campos<"rol"> = {}): Promise<string> {
  const rolId = await alta("rol", { id: id(), nombre: `Rol ${id().slice(0, 8)}`, ...campos });
  if (permisos.length) await base.insertInto("rol_permiso").values(permisos.map((permiso) => ({ rol_id: rolId, permiso }))).execute();
  return rolId;
}

// Un usuario con esos permisos (en un rol propio).
export async function usuarioConPermisos(permisos: string[], campos: Campos<"usuario"> = {}): Promise<string> {
  const usuarioId = await usuario(campos);
  await base.insertInto("usuario_rol").values({ usuario_id: usuarioId, rol_id: await rol(permisos) }).execute();
  return usuarioId;
}

// Una sesión de ese usuario, vigente salvo que se diga otra cosa; el token es el que se pasa.
export const sesion = (usuarioId: string, token: string = id(), campos: Campos<"sesion"> = {}) =>
  alta("sesion", { id: id(), usuario_id: usuarioId, token_hash: hashear(token), expira_en: new Date(Date.now() + 86_400_000), ...campos });

// Un puesto (una computadora emparejada con un celular), vigente salvo que se diga otra cosa.
export const puesto = (sesionId: string, campos: Campos<"puesto"> = {}) =>
  alta("puesto", { id: id(), sesion_id: sesionId, codigo_hash: hashear(id()), expira_en: new Date(Date.now() + 86_400_000), vinculado_en: new Date(), ...campos });

// Cuántas filas tiene una tabla.
export const cuantas = async (tabla: keyof DB) => Number((await sql<{ n: string }>`SELECT count(*) AS n FROM ${sql.table(tabla)}`.execute(base)).rows[0]!.n);
