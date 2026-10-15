import { api } from "../api";
import { consultas } from "../consultas";
import { useDelServidor } from "./del-servidor";
import type { CambiosDeUsuario, RolDeUsuario, Usuario, UsuarioNuevo } from "@servidor/usuarios";

// Usuarios y sesiones (Más → Usuarios), una sola vez para el celular y la computadora (RNF-60). Quién puede
// entrar, con qué roles, y las sesiones abiertas de todos (decisiones 50 y 51).
export type { RolDeUsuario };
export type UsuarioFila = Usuario;
export type SesionFila = { id: string; dispositivo: string; ultimo_uso_en: string; email: string; nombre: string };

const USUARIOS = ["usuarios"] as const;
const SESIONES = ["sesiones"] as const;

export const useUsuarios = () => useDelServidor<UsuarioFila[]>(USUARIOS, "/usuarios");
export const useSesiones = () => useDelServidor<SesionFila[]>(SESIONES, "/sesiones");

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

// Cierra la sesión de otro dispositivo (la propia se cierra con «Salir»).
export async function cerrarSesion(id: string): Promise<void> {
  await api(`/sesiones/${id}`, { method: "DELETE" });
  await consultas.invalidateQueries({ queryKey: SESIONES });
}
