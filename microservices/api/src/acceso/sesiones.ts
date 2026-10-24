import { randomBytes, randomUUID } from "node:crypto";
import type { UsuarioDeLaSesion } from "../contratos/sesiones.js";
import * as datos from "../persistencia/acceso.js";
import type { Ejecutor } from "../persistencia/transaccion.js";
import { segundosDeSesion } from "../sistema/ajustes.js";

// Sesiones con token opaco (ADR-011). El token solo existe en el dispositivo; acá se
// guarda su hash, así una copia de la base no sirve para entrar.

export const DURACION_SESION_DIAS = 90;
const RENOVAR_CADA_MS = 60 * 60 * 1000; // se extiende con el uso, como mucho una vez por hora

// `roles` son los nombres de sus roles; `permisos`, la unión de lo que esos roles permiten.
export type Usuario = UsuarioDeLaSesion;
export type SesionActiva = { id: string; usuario: Usuario };

export const hashear = datos.hashear;

export function generarToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function crearSesion(db: Ejecutor, usuarioId: string, dispositivo: string | null): Promise<{ id: string; token: string }> {
  const id = randomUUID();
  const token = generarToken();
  await datos.insertarSesion(db, { id, usuarioId, token, dispositivo, dias: DURACION_SESION_DIAS });
  return { id, token };
}

// El usuario como lo recibe la aplicación al entrar: con sus roles y permisos. Desactivado (y
// solo desactivado), para repetir lo que hizo antes de que lo desactivaran (lo apartado, ADR-021).
export async function usuarioConPermisos(db: Ejecutor, id: string, aunqueEsteDesactivado = false): Promise<Usuario | null> {
  const u = await datos.usuarioConPermisos(db, id, !aunqueEsteDesactivado);
  return u ? { id: u.id, email: u.email, nombre: u.nombre, roles: u.roles ?? [], permisos: u.permisos ?? [] } : null;
}

// La sesión recordada (specs/020, RF-133): por el hash del token, la sesión con la persona y sus
// permisos, cuándo vence, cuándo se usó por última vez y hasta cuándo vale lo recordado. Mientras
// vale, no se la vuelve a buscar en la base. Solo en la memoria del proceso. Lo que no es una
// sesión no se recuerda; cualquier cambio de acceso hecho por la aplicación lo olvida todo.
type Recordada = { sesion: SesionActiva; expiraEn: number; ultimoUso: number; hasta: number };
const recordadas = new Map<string, Recordada>();
// Cuántas veces se olvidó todo: una búsqueda que empezó antes de un olvido no guarda lo que trajo,
// que puede ser de antes del cambio (una persona recién desactivada, un permiso recién quitado).
let olvidos = 0;
export function olvidarSesiones(): void { olvidos += 1; recordadas.clear(); }
// Lo vencido se barre de vez en cuando, para que lo recordado no crezca sin límite.
const BARRER_DESDE = 500;
function barrer(ahora: number) { if (recordadas.size >= BARRER_DESDE) for (const [k, r] of recordadas) if (ahora >= r.hasta) recordadas.delete(k); }

export async function buscarSesion(db: Ejecutor, token: string): Promise<SesionActiva | null> {
  const hash = hashear(token);
  const ahora = Date.now();
  const r = recordadas.get(hash);
  if (r && ahora < r.hasta) {
    // Recordarla nunca la estira: vencida, no pasa (E04).
    if (ahora >= r.expiraEn) { recordadas.delete(hash); return null; }
    if (ahora - r.ultimoUso > RENOVAR_CADA_MS) { r.expiraEn = await renovar(db, r.sesion.id, ahora); r.ultimoUso = ahora; }
    return r.sesion;
  }
  if (r) recordadas.delete(hash);
  const olvidosAlEmpezar = olvidos;
  const fila = await datos.sesionPorHash(db, hash);
  if (!fila) return null;
  let expiraEn = new Date(fila.expira_en).getTime();
  let ultimoUso = new Date(fila.ultimo_uso_en).getTime();
  if (ahora - ultimoUso > RENOVAR_CADA_MS) { expiraEn = await renovar(db, fila.id, ahora); ultimoUso = ahora; }
  const sesion = { id: fila.id, usuario: { id: fila.usuario_id, email: fila.email, nombre: fila.nombre, roles: fila.roles ?? [], permisos: fila.permisos ?? [] } };
  const segundos = segundosDeSesion();
  if (segundos > 0 && olvidos === olvidosAlEmpezar) { barrer(ahora); recordadas.set(hash, { sesion, expiraEn, ultimoUso, hasta: ahora + segundos * 1000 }); }
  return sesion;
}

// Se extiende con el uso, como hoy (E06). Devuelve el vencimiento nuevo.
async function renovar(db: Ejecutor, sesionId: string, ahora: number): Promise<number> {
  await datos.renovarSesion(db, sesionId, DURACION_SESION_DIAS);
  return ahora + DURACION_SESION_DIAS * 24 * 60 * 60 * 1000;
}

export async function revocarSesion(db: Ejecutor, sesionId: string): Promise<void> {
  await datos.revocarSesion(db, sesionId);
  olvidarSesiones();
}
