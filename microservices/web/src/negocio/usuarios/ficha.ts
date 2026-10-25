import { ErrorApi } from "../../datos/conexion";
import { textoDeError } from "../del-servidor";
import type { CambiosDeUsuario } from "@servidor/usuarios";
import type { CelularDeOtroFila } from "./usuarios";

// Lo que muestra la ficha de cada persona en Más → Usuarios (decisiones 100 y 148), en el celular y
// en la computadora: sus roles en orden y los avisos de lo que se le cambió.
type ConNombre = { nombre: string };

// El Administrador primero, como la v2.
export const rolesEnOrden = <R extends ConNombre>(roles: R[] | undefined): R[] =>
  [...(roles ?? [])].sort((x, y) => Number(y.nombre === "Administrador") - Number(x.nombre === "Administrador"));

// Los roles que entran en el renglón de la computadora: dos si son cortos, si no uno («+N» el resto).
export const rolesEnElRenglon = (roles: ConNombre[]) => (roles.length > 1 && roles[0]!.nombre.length + roles[1]!.nombre.length <= 20 ? 2 : 1);

// Lo que permiten sus roles, en palabras: la descripción de cada uno.
export const loQuePermiten = (roles: { id: string }[], disponibles: { id: string; descripcion?: string | null }[]) =>
  roles.map((r) => disponibles.find((d) => d.id === r.id)?.descripcion).filter(Boolean).join(" ");

// Cuántas personas tienen al menos un celular con huella.
export const cuantosConHuella = (celulares: CelularDeOtroFila[]) => new Set(celulares.map((c) => c.usuario_id)).size;

export function avisoDelCambio(nombre: string, cambios: CambiosDeUsuario): string | null {
  if (cambios.activo === false) return `${nombre} ya no puede entrar: se le cerraron las sesiones abiertas.`;
  if (cambios.activo) return `${nombre} puede entrar de nuevo.`;
  return cambios.roles ? `Roles de ${nombre} guardados.` : null;
}
export const avisoDeSesionCerrada = (nombre: string, dispositivo: string) => `Se cerró la sesión de ${nombre} en ${dispositivo}.`;
export const avisoDeCelularQuitado = (nombre: string, dispositivo: string | null) => `«${dispositivo ?? "Ese celular"}» de ${nombre} ya no entra con la huella.`;
export const avisoDeAutorizado = (nombre: string) => `${nombre} ya puede entrar con su cuenta de Google.`;

// Si el correo ya estaba, el error va junto al correo; si no, abajo del formulario.
export function errorAlAutorizar(e: unknown): { email?: string; general?: string } {
  if (e instanceof ErrorApi && e.estado === 409) return { email: "Ese correo ya está autorizado: figura en la lista. Si está desactivado, reactivalo." };
  return { general: textoDeError(e, "No se pudo autorizar") };
}
