import { z } from "zod";
import { CLAVES_DE_PERMISO } from "../permisos.js";

// Lo que llega sobre los usuarios y los roles (decisión 89). Solo Zod y la lista fija de permisos:
// el contrato toma de acá la forma de lo que manda el front, así que este archivo no importa nada
// que use la base. Que los roles existan lo comprueban las reglas, contra la base.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIN_ROLES = "Elegí al menos un rol. Para que no pueda nada, desactivá al usuario";
const ROL_QUE_NO_EXISTE = "Hay un rol que no existe";
// Un usuario activo tiene al menos un rol; los repetidos cuentan una vez.
const rolesDeUsuario = z.array(z.string(ROL_QUE_NO_EXISTE).regex(UUID, ROL_QUE_NO_EXISTE), SIN_ROLES).min(1, SIN_ROLES).transform((ids) => [...new Set(ids)]);

// POST /usuarios: autorizar a una persona, con su correo de Google, su nombre y sus roles.
const CORREO = "Hace falta un correo válido";
export const usuarioNuevo = z.object({
  email: z.string(CORREO).trim().toLowerCase().refine((e) => e.includes("@"), CORREO),
  nombre: z.string("Hace falta el nombre").trim().min(1, "Hace falta el nombre"),
  roles: rolesDeUsuario,
}, CORREO);

// PATCH /usuarios/:id: sus roles, activarlo o desactivarlo, o su nombre (vacío no se toma).
export const cambiosDeUsuario = z.object({
  roles: rolesDeUsuario.optional(),
  activo: z.boolean("activo es sí o no").optional(),
  nombre: z.string("El nombre es un texto").trim().optional(),
});

// POST /roles y PATCH /roles/:id: el nombre (hasta 40 letras) y al menos un permiso del sistema.
const NOMBRE_DEL_ROL = "Poné el nombre del rol";
const SIN_PERMISOS = "Elegí al menos un permiso para el rol";
const permiso = z.string({ error: (iss) => `No existe el permiso ${String(iss.input)}` })
  .refine((p) => CLAVES_DE_PERMISO.includes(p), { error: (iss) => `No existe el permiso ${String(iss.input)}` });
export const rolNuevo = z.object({
  nombre: z.string(NOMBRE_DEL_ROL).trim().min(1, NOMBRE_DEL_ROL).max(40, "El nombre del rol tiene hasta 40 letras"),
  descripcion: z.string("La descripción es un texto").trim().optional(),
  permisos: z.array(permiso, SIN_PERMISOS).min(1, SIN_PERMISOS),
}, NOMBRE_DEL_ROL);
export const cambiosDeRol = rolNuevo.partial();
