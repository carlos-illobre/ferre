import { api } from "../../datos/conexion";
import { consultas } from "../../datos/conexion";
import { useDelServidor } from "../del-servidor";
import type { CambiosDeUsuario, RolDeUsuario, Usuario, UsuarioNuevo } from "@acceso/usuarios";
import type { SesionAbierta } from "@acceso/sesiones";
import type { CelularDeOtro } from "@acceso/credenciales";

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
const cuantos = (n: number, uno: string, varios: string) => (n ? `${n} ${n === 1 ? uno : varios}` : "");
// «2 sesiones · 1 celular con huella»; corto, «2 sesiones · 1 huella». Nada si no tiene nada.
export function resumenDelAcceso({ sesiones, celulares }: Acceso, corto = false): string | null {
  const partes = [
    cuantos(sesiones.length, "sesión", "sesiones"),
    corto ? cuantos(celulares.length, "huella", "huellas") : cuantos(celulares.length, "celular con huella", "celulares con huella"),
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}

// Cierra la sesión de otro dispositivo (la propia se cierra con «Salir»).
export async function cerrarSesion(id: string): Promise<void> {
  await api(`/sesiones/${id}`, { method: "DELETE" });
  await consultas.invalidateQueries({ queryKey: SESIONES });
}
