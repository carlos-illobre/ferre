import type { RolDeUsuario } from "@acceso/usuarios";

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
