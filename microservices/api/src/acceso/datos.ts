import { randomUUID } from "node:crypto";
import type pg from "pg";
import { pool } from "../db.js";
import { hashear } from "./sesiones.js";

// Acceso (sesiones, huellas y vínculo celular–computadora): el acceso a los datos (ADR-018).
// Son consultas escritas a mano (UPDATE … RETURNING, plazos con intervalos), con el tipo de lo
// que devuelven; los valores van siempre como parámetros. `sesiones.ts` y `vinculo.ts` son
// también de esta capa.
type Db = Pick<pg.Pool, "query">;

// ---------- Entrar ----------
export async function usuarioActivoPorCorreo(email: string): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>("SELECT id FROM usuario WHERE email = $1 AND activo", [email]);
  return rows[0]?.id ?? null;
}

// Un código para entrar a la computadora con el celular (RF-76): vence a los `segundos`.
export const nuevaVinculacion = (id: string, codigo: string, clave: string, dispositivo: string, segundos: number) =>
  pool.query("INSERT INTO vinculacion (id, codigo_hash, clave_hash, dispositivo, expira_en) VALUES ($1, $2, $3, $4, now() + ($5 || ' seconds')::interval)",
    [id, hashear(codigo), hashear(clave), dispositivo, String(segundos)]);

export async function aprobarVinculacion(codigo: string, usuarioId: string, celularSesionId: string): Promise<{ dispositivo: string | null } | null> {
  const { rows } = await pool.query<{ id: string; dispositivo: string | null }>(
    "UPDATE vinculacion SET aprobada_en = now(), aprobada_por = $1, celular_sesion_id = $3 WHERE codigo_hash = $2 AND aprobada_en IS NULL AND expira_en > now() RETURNING id, dispositivo",
    [usuarioId, hashear(codigo), celularSesionId]);
  return rows[0] ?? null;
}

export type Aprobada = { aprobada_por: string; dispositivo: string | null; celular_sesion_id: string | null };
// La computadora retira su vinculación aprobada: una sola vez.
export async function retirarVinculacion(id: string, clave: string): Promise<Aprobada | null> {
  const { rows } = await pool.query<Aprobada>(
    "UPDATE vinculacion SET retirada_en = now() WHERE id = $1 AND clave_hash = $2 AND aprobada_en IS NOT NULL AND retirada_en IS NULL RETURNING aprobada_por, dispositivo, celular_sesion_id",
    [id, hashear(clave)]).catch(() => ({ rows: [] as Aprobada[] }));
  return rows[0] ?? null;
}
export const anotarSesionDeVinculacion = (id: string, sesionId: string) => pool.query("UPDATE vinculacion SET sesion_id = $1 WHERE id = $2", [sesionId, id]);
export async function vinculacionVigente(id: string, clave: string): Promise<boolean> {
  const { rows } = await pool.query<{ vigente: boolean }>("SELECT expira_en > now() AND retirada_en IS NULL AS vigente FROM vinculacion WHERE id = $1 AND clave_hash = $2", [id, hashear(clave)])
    .catch(() => ({ rows: [] as { vigente: boolean }[] }));
  return rows[0]?.vigente ?? false;
}

export const sesionesAbiertas = () => pool.query(
  `SELECT s.id, s.dispositivo, s.creada_en, s.ultimo_uso_en, s.expira_en, u.email, u.nombre
     FROM sesion s JOIN usuario u ON u.id = s.usuario_id
    WHERE s.revocada_en IS NULL AND s.expira_en > now()
    ORDER BY s.ultimo_uso_en DESC`).then((r) => r.rows);

// ---------- Huellas (passkeys) ----------
export type Credencial = { id: string; usuario_id: string; clave_publica: Buffer; contador: string; transportes: string[]; dispositivo: string | null; creada_en: string; ultimo_uso_en: string | null };
export const credencialesVigentesDe = (usuarioId: string) =>
  pool.query<Pick<Credencial, "id" | "transportes">>("SELECT id, transportes FROM credencial WHERE usuario_id = $1 AND revocada_en IS NULL", [usuarioId]).then((r) => r.rows);
export const guardarCredencial = (c: { id: string; usuarioId: string; clavePublica: Buffer; contador: number; transportes: string[]; dispositivo: string }) =>
  pool.query("INSERT INTO credencial (id, usuario_id, clave_publica, contador, transportes, dispositivo) VALUES ($1, $2, $3, $4, $5, $6)",
    [c.id, c.usuarioId, c.clavePublica, c.contador, c.transportes, c.dispositivo]);
export const celularesDe = (usuarioId: string) =>
  pool.query<Credencial>("SELECT id, dispositivo, creada_en, ultimo_uso_en FROM credencial WHERE usuario_id = $1 AND revocada_en IS NULL ORDER BY creada_en", [usuarioId]).then((r) => r.rows);
export async function quitarCredencial(id: string, usuarioId: string, cualquiera: boolean): Promise<boolean> {
  const { rowCount } = await pool.query("UPDATE credencial SET revocada_en = now() WHERE id = $1 AND revocada_en IS NULL AND ($3 OR usuario_id = $2)", [id, usuarioId, cualquiera]);
  return Boolean(rowCount);
}
export type CredencialConUsuario = Credencial & { email: string; nombre: string; rol: string; activo: boolean };
export async function credencialConUsuario(id: string): Promise<CredencialConUsuario | null> {
  const { rows } = await pool.query<CredencialConUsuario>(
    `SELECT cr.*, u.email, u.nombre, u.rol, u.activo FROM credencial cr JOIN usuario u ON u.id = cr.usuario_id WHERE cr.id = $1 AND cr.revocada_en IS NULL`, [id]);
  return rows[0] ?? null;
}
export const usarCredencial = (id: string, contador: number) => pool.query("UPDATE credencial SET contador = $2, ultimo_uso_en = now() WHERE id = $1", [id, contador]);

// ---------- Vínculo celular–computadora ----------
export const nuevoPuesto = (id: string, sesionId: string, codigo: string, nombre: string | null, minutos: number) =>
  pool.query(`INSERT INTO puesto (id, sesion_id, codigo_hash, nombre, expira_en) VALUES ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval)`,
    [id, sesionId, hashear(codigo), nombre, String(minutos)]);

// De quién es la computadora que muestra ese código (mientras espera a un celular).
export async function duenioDelCodigo(codigo: string): Promise<string | null> {
  const { rows } = await pool.query<{ usuario_id: string }>(
    "SELECT s.usuario_id FROM puesto p JOIN sesion s ON s.id = p.sesion_id WHERE p.codigo_hash = $1 AND p.vinculado_en IS NULL AND p.expira_en > now()", [hashear(codigo)]);
  return rows[0]?.usuario_id ?? null;
}

export type Vinculado = { id: string; nombre: string | null; sesion_id: string; expira_en: string };
export async function vincularPorCodigo(codigo: string, celularSesionId: string, dias: number): Promise<Vinculado | null> {
  const { rows } = await pool.query<Vinculado>(
    `UPDATE puesto SET vinculado_en = now(), celular_sesion_id = $2, expira_en = now() + ($3 || ' days')::interval
      WHERE codigo_hash = $1 AND vinculado_en IS NULL AND expira_en > now() RETURNING id, nombre, sesion_id, expira_en`,
    [hashear(codigo), celularSesionId, String(dias)]);
  return rows[0] ?? null;
}

export const vinculosDeLaSesion = (sesionId: string) => pool.query<{ id: string; nombre: string | null; expira_en: string; sesion_id: string }>(
  `SELECT p.id, p.nombre, p.expira_en, p.sesion_id FROM puesto p
    WHERE p.vinculado_en IS NOT NULL AND p.expira_en > now() AND (p.sesion_id = $1 OR p.celular_sesion_id = $1)
    ORDER BY p.vinculado_en DESC`, [sesionId]).then((r) => r.rows);

export const guardarDiasDeVinculo = (dias: number) => pool.query(
  "INSERT INTO configuracion (clave, valor) VALUES ('vinculo.dias', $1) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = now()", [String(dias)]);

export async function esComputadoraVinculada(puestoId: string, sesionId: string): Promise<boolean> {
  const { rows } = await pool.query("SELECT id FROM puesto WHERE id = $1 AND sesion_id = $2 AND vinculado_en IS NOT NULL AND expira_en > now()", [puestoId, sesionId]);
  return Boolean(rows[0]);
}

export async function ladoEnElPuesto(puestoId: string, sesionId: string): Promise<"computadora" | "celular" | null> {
  const { rows } = await pool.query<{ sesion_id: string; celular_sesion_id: string | null }>(
    "SELECT sesion_id, celular_sesion_id FROM puesto WHERE id = $1 AND vinculado_en IS NOT NULL AND expira_en > now() AND (sesion_id = $2 OR celular_sesion_id = $2)", [puestoId, sesionId]);
  return !rows[0] ? null : rows[0].sesion_id === sesionId ? "computadora" : "celular";
}

export async function soltarPuesto(puestoId: string, sesionId: string): Promise<boolean> {
  const { rowCount } = await pool.query("UPDATE puesto SET expira_en = now() WHERE id = $1 AND (sesion_id = $2 OR celular_sesion_id = $2) AND expira_en > now()", [puestoId, sesionId]);
  return Boolean(rowCount);
}

export async function esCelularDelPuesto(puestoId: string, sesionId: string): Promise<boolean> {
  const { rows } = await pool.query("SELECT id FROM puesto WHERE id = $1 AND celular_sesion_id = $2 AND expira_en > now()", [puestoId, sesionId]);
  return Boolean(rows[0]);
}

export async function guardarCodigo(puestoId: string, codigo: string): Promise<{ id: string; codigo: string; creado_en: string }> {
  const id = randomUUID();
  const creado_en = new Date().toISOString();
  await pool.query("INSERT INTO codigo_escaneado (id, puesto_id, codigo, creado_en) VALUES ($1, $2, $3, $4)", [id, puestoId, codigo, creado_en]);
  return { id, codigo, creado_en };
}

export const codigoRecibido = (puestoId: string, codigoId: string, sesionId: string) => pool.query(
  "UPDATE codigo_escaneado SET entregado_en = now() WHERE id = $2 AND puesto_id = $1 AND EXISTS (SELECT 1 FROM puesto WHERE id = $1 AND sesion_id = $3)", [puestoId, codigoId, sesionId]);

export async function puestoDe(puestoId: string, sesionId: string) {
  const { rows } = await pool.query<{ id: string; nombre: string | null; vinculado_en: string | null; expira_en: string }>(
    "SELECT id, nombre, vinculado_en, expira_en FROM puesto WHERE id = $1 AND (sesion_id = $2 OR celular_sesion_id = $2)", [puestoId, sesionId]);
  return rows[0] ?? null;
}

export async function esComputadoraDelPuesto(puestoId: string, sesionId: string): Promise<boolean> {
  const { rows } = await pool.query("SELECT id FROM puesto WHERE id = $1 AND sesion_id = $2 AND expira_en > now()", [puestoId, sesionId]);
  return Boolean(rows[0]);
}
export const darPorEntregados = (puestoId: string) => pool.query("UPDATE codigo_escaneado SET entregado_en = now() WHERE puesto_id = $1 AND entregado_en IS NULL", [puestoId]);
// Lo que no llegó «hace un momento» ya no se entrega: aparecería en una venta que no es.
export const codigosPendientes = (puestoId: string, segundos: number) => pool.query<{ id: string; codigo: string; creado_en: string }>(
  "SELECT id, codigo, creado_en FROM codigo_escaneado WHERE puesto_id = $1 AND entregado_en IS NULL AND creado_en > now() - ($2 || ' seconds')::interval ORDER BY creado_en",
  [puestoId, String(segundos)]).then((r) => r.rows);

export type { Db };
