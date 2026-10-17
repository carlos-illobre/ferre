// Lo que el servidor responde sobre los usuarios, los roles y los permisos. Solo tipos: el
// cliente web los toma al compilar (ADR-018), así que acá no va código ni nombres de tablas. Lo
// que manda el front sale de la validación del servidor (decisión 89).
import type { z } from "zod";
import type { cambiosDeRol, cambiosDeUsuario, rolNuevo, usuarioNuevo } from "../administracion/esquemas.js";

// GET /usuarios: todos, también los desactivados, con sus roles.
export type RolDeUsuario = { id: string; nombre: string };
export type Usuario = { id: string; email: string; nombre: string; activo: boolean; creado_en: string; roles: RolDeUsuario[] };

// POST /usuarios (responde el usuario nuevo) y PATCH /usuarios/:id
export type UsuarioNuevo = z.input<typeof usuarioNuevo>;
export type UsuarioAutorizado = { id: string; email: string; nombre: string; activo: true };
export type CambiosDeUsuario = z.input<typeof cambiosDeUsuario>;

// GET /roles: cada rol con sus permisos y cuántas personas activas lo tienen.
export type Rol = { id: string; nombre: string; descripcion: string | null; permisos: string[]; usuarios: number };
// POST /roles (responde el rol nuevo) y PATCH /roles/:id
export type RolNuevo = z.input<typeof rolNuevo>;
export type RolCreado = { id: string; nombre: string; permisos: string[] };
export type CambiosDeRol = z.input<typeof cambiosDeRol>;

// GET /permisos: los permisos del sistema, que son fijos.
export type PermisoDelSistema = { clave: string; parte: string; nombre: string; detalle: string };
