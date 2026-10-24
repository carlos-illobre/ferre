import { createHash, randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { SesionAbierta, UsuarioDeLaSesion } from "../contratos/sesiones.js";
import type { Enviable } from "../enviable.js";
import { base } from "./conexion.js";
import type { Ejecutor } from "./transaccion.js";

// Acceso (sesiones, huellas y vínculo celular–computadora): el acceso a los datos (ADR-018).
// Son consultas escritas a mano (UPDATE … RETURNING, plazos con intervalos), con el tipo de lo
// que devuelven; los valores van siempre como parámetros.

// De un token o un código se guarda solo su hash (ADR-011): una copia de la base no sirve para entrar.
export const hashear = (token: string): string => createHash("sha256").update(token).digest("hex");

// Con alias: la prueba del SQL con parámetros reconoce `sql<Tipo>` sin anidar.
type Abierta = Enviable<SesionAbierta>;
type Vigente = Pick<Credencial, "id" | "transportes">;

const cambio = (r: { numAffectedRows?: bigint }) => Number(r.numAffectedRows) > 0;

// ---------- Sesiones ----------
export async function insertarSesion(e: Ejecutor, s: { id: string; usuarioId: string; token: string; dispositivo: string | null; dias: number }): Promise<void> {
  await sql`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en)
     VALUES (${s.id}, ${s.usuarioId}, ${hashear(s.token)}, ${s.dispositivo}, now() + (${String(s.dias)} || ' days')::interval)`.execute(e);
}

// Los roles y permisos de un usuario salen de sus roles asignados (ADR-017).
const ROLES_Y_PERMISOS = sql.raw(`
  COALESCE((SELECT array_agg(DISTINCT r.nombre) FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id WHERE ur.usuario_id = u.id), '{}') AS roles,
  COALESCE((SELECT array_agg(DISTINCT rp.permiso) FROM usuario_rol ur JOIN rol_permiso rp ON rp.rol_id = ur.rol_id WHERE ur.usuario_id = u.id), '{}') AS permisos`);

// El usuario como lo recibe la aplicación al entrar: con sus roles y permisos. Activo o, si se pide,
// solo desactivado (para repetir lo que hizo antes de que lo desactivaran, ADR-021).
export async function usuarioConPermisos(e: Ejecutor, id: string, activo: boolean): Promise<UsuarioDeLaSesion | null> {
  const { rows } = await sql<UsuarioDeLaSesion>`SELECT u.id, u.email, u.nombre, ${ROLES_Y_PERMISOS} FROM usuario u WHERE u.id = ${id} AND ${activo ? sql`u.activo` : sql`NOT u.activo`}`.execute(e);
  return rows[0] ?? null;
}

export type FilaDeSesion = { id: string; ultimo_uso_en: Date; expira_en: Date; usuario_id: string; email: string; nombre: string; roles: string[]; permisos: string[] };
// La sesión vigente de un token (por su hash), con la persona activa y sus permisos.
export const sesionPorHash = (e: Ejecutor, hash: string) => sql<FilaDeSesion>`
  SELECT s.id, s.ultimo_uso_en, s.expira_en, u.id AS usuario_id, u.email, u.nombre, ${ROLES_Y_PERMISOS}
       FROM sesion s JOIN usuario u ON u.id = s.usuario_id
      WHERE s.token_hash = ${hash} AND s.revocada_en IS NULL AND s.expira_en > now() AND u.activo`.execute(e).then((r) => r.rows[0] ?? null);

export const renovarSesion = (e: Ejecutor, sesionId: string, dias: number) =>
  sql`UPDATE sesion SET ultimo_uso_en = now(), expira_en = now() + (${String(dias)} || ' days')::interval WHERE id = ${sesionId}`.execute(e);

export const revocarSesion = (e: Ejecutor, sesionId: string) =>
  sql`UPDATE sesion SET revocada_en = now() WHERE id = ${sesionId} AND revocada_en IS NULL`.execute(e);

// ---------- Entrar ----------
export async function usuarioActivoPorCorreo(email: string): Promise<string | null> {
  const { rows } = await sql<{ id: string }>`SELECT id FROM usuario WHERE email = ${email} AND activo`.execute(base);
  return rows[0]?.id ?? null;
}

// Un código para entrar a la computadora con el celular (RF-76): vence a los `segundos`.
export const nuevaVinculacion = (id: string, codigo: string, clave: string, dispositivo: string, segundos: number) =>
  sql`INSERT INTO vinculacion (id, codigo_hash, clave_hash, dispositivo, expira_en) VALUES (${id}, ${hashear(codigo)}, ${hashear(clave)}, ${dispositivo}, now() + (${String(segundos)} || ' seconds')::interval)`.execute(base);

export async function aprobarVinculacion(codigo: string, usuarioId: string, celularSesionId: string): Promise<{ dispositivo: string | null } | null> {
  const { rows } = await sql<{ id: string; dispositivo: string | null }>`
    UPDATE vinculacion SET aprobada_en = now(), aprobada_por = ${usuarioId}, celular_sesion_id = ${celularSesionId} WHERE codigo_hash = ${hashear(codigo)} AND aprobada_en IS NULL AND expira_en > now() RETURNING id, dispositivo`.execute(base);
  return rows[0] ?? null;
}

export type Aprobada = { aprobada_por: string; dispositivo: string | null; celular_sesion_id: string | null };
// La computadora retira su vinculación aprobada: una sola vez. Un identificador que no es un UUID
// no es de ninguna vinculación.
export async function retirarVinculacion(id: string, clave: string): Promise<Aprobada | null> {
  const { rows } = await sql<Aprobada>`
    UPDATE vinculacion SET retirada_en = now() WHERE id::text = ${id} AND clave_hash = ${hashear(clave)} AND aprobada_en IS NOT NULL AND retirada_en IS NULL RETURNING aprobada_por, dispositivo, celular_sesion_id`.execute(base);
  return rows[0] ?? null;
}
export const anotarSesionDeVinculacion = (id: string, sesionId: string) => sql`UPDATE vinculacion SET sesion_id = ${sesionId} WHERE id = ${id}`.execute(base);
export async function vinculacionVigente(id: string, clave: string): Promise<boolean> {
  const { rows } = await sql<{ vigente: boolean }>`SELECT expira_en > now() AND retirada_en IS NULL AS vigente FROM vinculacion WHERE id::text = ${id} AND clave_hash = ${hashear(clave)}`.execute(base);
  return rows[0]?.vigente ?? false;
}

export const sesionesAbiertas = (salvo: string) => sql<Abierta>`
  SELECT s.id, s.usuario_id, s.dispositivo, s.creada_en, s.ultimo_uso_en, s.expira_en, u.email, u.nombre
     FROM sesion s JOIN usuario u ON u.id = s.usuario_id
    WHERE s.revocada_en IS NULL AND s.expira_en > now() AND s.id <> ${salvo}
    ORDER BY s.ultimo_uso_en DESC`.execute(base).then((r) => r.rows);

// ---------- Huellas (passkeys) ----------
export type Credencial = { id: string; usuario_id: string; clave_publica: Buffer; contador: string; transportes: string[]; dispositivo: string | null; creada_en: string; ultimo_uso_en: string | null };
export const credencialesVigentesDe = (usuarioId: string) =>
  sql<Vigente>`SELECT id, transportes FROM credencial WHERE usuario_id = ${usuarioId} AND revocada_en IS NULL`.execute(base).then((r) => r.rows);
export const guardarCredencial = (c: { id: string; usuarioId: string; clavePublica: Buffer; contador: number; transportes: string[]; dispositivo: string }) =>
  sql`INSERT INTO credencial (id, usuario_id, clave_publica, contador, transportes, dispositivo) VALUES (${c.id}, ${c.usuarioId}, ${c.clavePublica}, ${c.contador}, ${c.transportes}, ${c.dispositivo})`.execute(base);
export const celularesDe = (usuarioId: string) =>
  sql<Credencial>`SELECT id, dispositivo, creada_en, ultimo_uso_en FROM credencial WHERE usuario_id = ${usuarioId} AND revocada_en IS NULL ORDER BY creada_en`.execute(base).then((r) => r.rows);
export const celularesDeOtros = (usuarioId: string) =>
  sql<Credencial>`SELECT id, usuario_id, dispositivo, creada_en, ultimo_uso_en FROM credencial WHERE usuario_id <> ${usuarioId} AND revocada_en IS NULL ORDER BY creada_en`.execute(base).then((r) => r.rows);
export const quitarCredencial = (id: string, usuarioId: string, cualquiera: boolean): Promise<boolean> =>
  sql`UPDATE credencial SET revocada_en = now() WHERE id = ${id} AND revocada_en IS NULL AND (${cualquiera} OR usuario_id = ${usuarioId})`.execute(base).then(cambio);
export type CredencialConUsuario = Credencial & { email: string; nombre: string; rol: string; activo: boolean };
export async function credencialConUsuario(id: string): Promise<CredencialConUsuario | null> {
  const { rows } = await sql<CredencialConUsuario>`
    SELECT cr.*, u.email, u.nombre, u.rol, u.activo FROM credencial cr JOIN usuario u ON u.id = cr.usuario_id WHERE cr.id = ${id} AND cr.revocada_en IS NULL`.execute(base);
  return rows[0] ?? null;
}
export const usarCredencial = (id: string, contador: number) => sql`UPDATE credencial SET contador = ${contador}, ultimo_uso_en = now() WHERE id = ${id}`.execute(base);

// ---------- Vínculo celular–computadora ----------
const VIGENTE = sql.raw("vinculado_en IS NOT NULL AND expira_en > now()");

export const nuevoPuesto = (id: string, sesionId: string, codigo: string, nombre: string | null, minutos: number) =>
  sql`INSERT INTO puesto (id, sesion_id, codigo_hash, nombre, expira_en) VALUES (${id}, ${sesionId}, ${hashear(codigo)}, ${nombre}, now() + (${String(minutos)} || ' minutes')::interval)`.execute(base);

// De quién es la computadora que muestra ese código (mientras espera a un celular).
export async function duenioDelCodigo(codigo: string): Promise<string | null> {
  const { rows } = await sql<{ usuario_id: string }>`
    SELECT s.usuario_id FROM puesto p JOIN sesion s ON s.id = p.sesion_id WHERE p.codigo_hash = ${hashear(codigo)} AND p.vinculado_en IS NULL AND p.expira_en > now()`.execute(base);
  return rows[0]?.usuario_id ?? null;
}

export type Vinculado = { id: string; nombre: string | null; sesion_id: string; expira_en: string };
export async function vincularPorCodigo(codigo: string, celularSesionId: string, dias: number): Promise<Vinculado | null> {
  const { rows } = await sql<Vinculado>`
    UPDATE puesto SET vinculado_en = now(), celular_sesion_id = ${celularSesionId}, expira_en = now() + (${String(dias)} || ' days')::interval
      WHERE codigo_hash = ${hashear(codigo)} AND vinculado_en IS NULL AND expira_en > now() RETURNING id, nombre, sesion_id, expira_en`.execute(base);
  return rows[0] ?? null;
}

// Vincular de nuevo reemplaza al vínculo anterior: un puesto nuevo, ya vinculado. El código no se
// usa (nadie tiene que leerlo): va uno al azar porque la columna es única.
export async function puestoVinculado(e: Ejecutor, p: { compuSesionId: string; celularSesionId: string; nombre: string | null; dias: number }): Promise<{ id: string; expira_en: string | undefined }> {
  const id = randomUUID();
  const { rows } = await sql<{ expira_en: string }>`
    INSERT INTO puesto (id, sesion_id, codigo_hash, nombre, vinculado_en, celular_sesion_id, expira_en)
     VALUES (${id}, ${p.compuSesionId}, ${hashear(randomUUID())}, ${p.nombre}, now(), ${p.celularSesionId}, now() + (${String(p.dias)} || ' days')::interval) RETURNING expira_en`.execute(e);
  return { id, expira_en: rows.map((r) => r.expira_en)[0] };
}

export const vinculosDeLaSesion = (sesionId: string) => sql<{ id: string; nombre: string | null; expira_en: string; sesion_id: string }>`
  SELECT p.id, p.nombre, p.expira_en, p.sesion_id FROM puesto p
    WHERE p.vinculado_en IS NOT NULL AND p.expira_en > now() AND (p.sesion_id = ${sesionId} OR p.celular_sesion_id = ${sesionId})
    ORDER BY p.vinculado_en DESC`.execute(base).then((r) => r.rows);

// De qué lado de un vínculo vigente está esta sesión, y hasta cuándo vale el vínculo.
export async function vinculoEnElPuesto(puestoId: string, sesionId: string): Promise<{ lado: "computadora" | "celular"; expira_en: Date } | null> {
  const { rows } = await sql<{ sesion_id: string; celular_sesion_id: string | null; expira_en: Date }>`
    SELECT sesion_id, celular_sesion_id, expira_en FROM puesto WHERE id = ${puestoId} AND ${VIGENTE} AND (sesion_id = ${sesionId} OR celular_sesion_id = ${sesionId})`.execute(base);
  return rows[0] ? { lado: rows[0].sesion_id === sesionId ? "computadora" : "celular", expira_en: new Date(rows[0].expira_en) } : null;
}
export const ladoEnElPuesto = async (puestoId: string, sesionId: string) => (await vinculoEnElPuesto(puestoId, sesionId))?.lado ?? null;

export const soltarPuesto = (puestoId: string, sesionId: string): Promise<boolean> =>
  sql`UPDATE puesto SET expira_en = now() WHERE id = ${puestoId} AND (sesion_id = ${sesionId} OR celular_sesion_id = ${sesionId}) AND expira_en > now()`.execute(base).then(cambio);

export async function puestoDe(puestoId: string, sesionId: string) {
  const { rows } = await sql<{ id: string; nombre: string | null; vinculado_en: string | null; expira_en: string }>`
    SELECT id, nombre, vinculado_en, expira_en FROM puesto WHERE id = ${puestoId} AND (sesion_id = ${sesionId} OR celular_sesion_id = ${sesionId})`.execute(base);
  return rows[0] ?? null;
}

// El identificador que cada navegador guarda para sí, en su sesión.
export const anotarDispositivo = (e: Ejecutor, sesionId: string, dispositivoId: string) =>
  sql`UPDATE sesion SET dispositivo_id = ${dispositivoId} WHERE id = ${sesionId} AND dispositivo_id IS DISTINCT FROM ${dispositivoId}`.execute(e);

// El usuario volvió a entrar en un dispositivo que tenía vinculado: su vínculo dormido pasa a esta sesión.
export async function adoptarVinculos(e: Ejecutor, sesionId: string, usuarioId: string, dispositivoId: string): Promise<void> {
  await sql`UPDATE puesto SET sesion_id = ${sesionId} WHERE usuario_id = ${usuarioId} AND compu_dispositivo = ${dispositivoId} AND ${VIGENTE} AND sesion_id <> ${sesionId}`.execute(e);
  await sql`UPDATE puesto SET celular_sesion_id = ${sesionId} WHERE usuario_id = ${usuarioId} AND celular_dispositivo = ${dispositivoId} AND ${VIGENTE} AND celular_sesion_id <> ${sesionId}`.execute(e);
}

// Deja anotado de quién es el vínculo y de qué dispositivos, tomándolo de las dos sesiones.
export const sellarVinculo = (e: Ejecutor, puestoId: string) => sql`
  UPDATE puesto p SET usuario_id = a.usuario_id, compu_dispositivo = a.dispositivo_id, celular_dispositivo = b.dispositivo_id
       FROM sesion a, sesion b WHERE p.id = ${puestoId} AND a.id = p.sesion_id AND b.id = p.celular_sesion_id`.execute(e);

const ids = (r: { rows: { id: string }[] }) => r.rows.map((f) => f.id);

// Los vínculos vigentes de un usuario.
export const vinculosDelUsuario = (e: Ejecutor, usuarioId: string): Promise<string[]> =>
  sql<{ id: string }>`SELECT id FROM puesto WHERE usuario_id = ${usuarioId} AND ${VIGENTE}`.execute(e).then(ids);

// Una sesión cerrada a distancia: sus vínculos se cortan. Devuelve cuáles.
export const cortarVinculosDe = (e: Ejecutor, sesionId: string): Promise<string[]> =>
  sql<{ id: string }>`UPDATE puesto SET expira_en = now() WHERE ${VIGENTE} AND (sesion_id = ${sesionId} OR celular_sesion_id = ${sesionId}) RETURNING id`.execute(e).then(ids);

// Deja sin efecto los emparejamientos anteriores de esa computadora o de ese celular. Devuelve cuáles.
export const soltarAnteriores = (e: Ejecutor, compuSesionId: string, celularSesionId: string, salvo: string | null): Promise<string[]> => sql<{ id: string }>`
  UPDATE puesto SET expira_en = now() WHERE ${VIGENTE} AND (sesion_id = ${compuSesionId} OR celular_sesion_id = ${celularSesionId}) AND id IS DISTINCT FROM ${salvo} RETURNING id`.execute(e).then(ids);

