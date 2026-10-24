import { api } from "../datos/conexion";
import { consultas } from "../datos/conexion";
import { useDelServidor } from "./del-servidor";
import type { CambiosDeUsuario, RolDeUsuario, Usuario, UsuarioNuevo } from "@servidor/usuarios";
import type { SesionAbierta } from "@servidor/sesiones";
import type { CelularDeOtro } from "@servidor/credenciales";

// Usuarios y sesiones (Más → Usuarios), una sola vez para el celular y la computadora (RNF-60). Quién puede
// entrar, con qué roles, y las sesiones abiertas de todos (decisiones 50 y 51).
export type { RolDeUsuario };
export type UsuarioFila = Usuario;
export type SesionFila = SesionAbierta;
export type CelularDeOtroFila = CelularDeOtro;

const USUARIOS = ["usuarios"] as const;
const SESIONES = ["sesiones"] as const;
const CELULARES_DE_OTROS = ["celulares-de-otros"] as const;

export const useUsuarios = () => useDelServidor<UsuarioFila[]>(USUARIOS, "/usuarios");
export const useSesiones = () => useDelServidor<SesionFila[]>(SESIONES, "/sesiones");
// Los celulares con huella de las demás personas: los propios están en Configuración (decisión 99).
export const useCelularesDeOtros = () => useDelServidor<CelularDeOtroFila[]>(CELULARES_DE_OTROS, "/credenciales/de-otros");

export type AltaDeUsuario = { nombre: string; email: string; roles: string[] };
export type FaltaEnAlta = { nombre?: string; email?: string; roles?: string };

// Lo que falta para autorizar a alguien: nombre, un correo bien escrito y al menos un rol.
export function faltaEnAlta(d: AltaDeUsuario, sinRoles: string): FaltaEnAlta | null {
  const falta: FaltaEnAlta = {};
  if (!d.nombre.trim()) falta.nombre = "Escribí el nombre de la persona.";
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) falta.email = d.email.trim() ? "Ese correo está mal escrito: revisá que tenga la arroba y el dominio." : "Escribí su correo de Google.";
  if (d.roles.length === 0) falta.roles = sinRoles;
  return Object.keys(falta).length ? falta : null;
}

// Autoriza a una persona. Si el correo ya está, el servidor contesta 409.
export async function autorizar(d: AltaDeUsuario): Promise<void> {
  await api("/usuarios", { method: "POST", body: JSON.stringify({ email: d.email.trim().toLowerCase(), nombre: d.nombre.trim(), roles: d.roles } satisfies UsuarioNuevo) });
  await consultas.invalidateQueries({ queryKey: USUARIOS });
}

// Cambia los roles de alguien o lo activa y desactiva. Desactivarlo le cierra las sesiones.
export async function cambiarUsuario(id: string, cambios: CambiosDeUsuario): Promise<void> {
  await api(`/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(cambios) });
  await consultas.invalidateQueries({ queryKey: USUARIOS });
  if (cambios.activo === false) void consultas.invalidateQueries({ queryKey: SESIONES });
}

// Le quita a otra persona un celular con huella: deja de entrar con ella (el celular perdido).
export async function quitarCelularDeOtro(id: string): Promise<void> {
  await api(`/credenciales/${encodeURIComponent(id)}`, { method: "DELETE" });
  await consultas.invalidateQueries({ queryKey: CELULARES_DE_OTROS });
}

// Lo que cada persona tiene abierto, en su tarjeta de Usuarios (decisión 100): sus sesiones, salvo
// la de este dispositivo (el servidor no la manda), y sus celulares con huella, salvo los propios.
export type Acceso = { sesiones: SesionFila[]; celulares: CelularDeOtroFila[] };
export function accesoDe(usuarioId: string, sesiones: SesionFila[] | null | undefined, celulares: CelularDeOtroFila[] | null | undefined): Acceso {
  return { sesiones: (sesiones ?? []).filter((s) => s.usuario_id === usuarioId), celulares: (celulares ?? []).filter((c) => c.usuario_id === usuarioId) };
}
// «2 sesiones · 1 celular con huella»; corto, «2 sesiones · 1 huella». Nada si no tiene nada.
export function resumenDelAcceso({ sesiones, celulares }: Acceso, corto = false): string | null {
  const partes = [
    sesiones.length ? `${sesiones.length} ${sesiones.length === 1 ? "sesión" : "sesiones"}` : "",
    celulares.length ? `${celulares.length} ${corto ? (celulares.length === 1 ? "huella" : "huellas") : (celulares.length === 1 ? "celular con huella" : "celulares con huella")}` : "",
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}

// Cierra la sesión de otro dispositivo (la propia se cierra con «Salir»).
export async function cerrarSesion(id: string): Promise<void> {
  await api(`/sesiones/${id}`, { method: "DELETE" });
  await consultas.invalidateQueries({ queryKey: SESIONES });
}

// Buscar, filtrar y ordenar en Más → Usuarios (decisiones 98 y 102). Lo escrito se busca en
// cualquier parte del correo o del nombre, sin importar mayúsculas ni tildes. Con varios roles
// elegidos queda quien tiene cualquiera de ellos.
export type EstadoDeUsuario = "todos" | "activos" | "inactivos";
export type OrdenDeUsuarios = "correo" | "estado";
export type FiltroDeUsuarios = { texto: string; roles: string[]; estado: EstadoDeUsuario };
export const SIN_FILTRO: FiltroDeUsuarios = { texto: "", roles: [], estado: "todos" };
type Buscable = { nombre: string; email: string; activo?: boolean; roles?: RolDeUsuario[] };
export const MAXIMO_DE_SUGERENCIAS = 5;
const plano = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function coincideConLaBusqueda(u: Buscable, texto: string): boolean {
  const buscado = plano(texto);
  return !buscado || plano(u.email).includes(buscado) || plano(u.nombre).includes(buscado);
}

export const hayFiltros = (f: FiltroDeUsuarios) => f.roles.length > 0 || f.estado !== "todos";

export function filtrarUsuarios<U extends Buscable>(filas: U[], { texto, roles, estado }: FiltroDeUsuarios): U[] {
  return filas.filter((u) => coincideConLaBusqueda(u, texto)
    && (roles.length === 0 || (u.roles ?? []).some((r) => roles.includes(r.id)))
    && (estado === "todos" || (estado === "activos") === Boolean(u.activo)));
}

// Por correo, o por estado: primero los activos y, entre iguales, por correo.
export function ordenarUsuarios<U extends Buscable>(filas: U[], orden: OrdenDeUsuarios): U[] {
  const porCorreo = (a: U, b: U) => a.email.localeCompare(b.email, "es");
  return [...filas].sort(orden === "estado" ? (a, b) => Number(Boolean(b.activo)) - Number(Boolean(a.activo)) || porCorreo(a, b) : porCorreo);
}

// Las sugerencias mientras se escribe: hasta cinco, y ninguna si el buscador está vacío o si lo
// escrito ya es el correo entero de alguien (se eligió una).
export function sugerenciasDeUsuarios<U extends Buscable>(filas: U[], texto: string): U[] {
  if (!plano(texto) || filas.some((u) => plano(u.email) === plano(texto))) return [];
  return filas.filter((u) => coincideConLaBusqueda(u, texto)).slice(0, MAXIMO_DE_SUGERENCIAS);
}

// La parte del correo que coincide con lo escrito, para resaltarla: [antes, lo escrito, después].
export function partesResaltadas(email: string, texto: string): [string, string, string] {
  const buscado = plano(texto);
  const desde = buscado ? plano(email).indexOf(buscado) : -1;
  if (desde < 0) return [email, "", ""];
  return [email.slice(0, desde), email.slice(desde, desde + buscado.length), email.slice(desde + buscado.length)];
}

// Cuántos son, siempre: «4 usuarios»; con búsqueda o filtros, «1 de 4 usuarios».
const usuarios = (n: number) => `${n} ${n === 1 ? "usuario" : "usuarios"}`;
export function cuantosQuedan(quedan: number, total: number, filtro: FiltroDeUsuarios): string {
  if (!plano(filtro.texto) && !hayFiltros(filtro)) return usuarios(total);
  if (quedan === 0) return "Nadie coincide con la búsqueda.";
  return `${quedan} de ${usuarios(total)}`;
}
