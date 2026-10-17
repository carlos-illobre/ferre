import { randomUUID } from "node:crypto";
import { base, Deshacer, enTransaccion, type Ejecutor } from "../base.js";
import { anotarEvento } from "../eventos.js";
import type { z } from "zod";
import type { cambiosDeRol, cambiosDeUsuario, rolNuevo, usuarioNuevo } from "./esquemas.js";
import * as datos from "./datos.js";
import type { Rol, Usuario } from "../contratos/usuarios.js";
import type { Enviable } from "../enviable.js";

// Usuarios y roles (RF-70, RF-72, RF-75; ADR-017). Los roles los arma el negocio: un nombre y un
// grupo de permisos fijos. Un usuario puede lo que permitan sus roles. Un rol no se borra si
// alguien lo tiene, dos roles no se llaman igual, y ningún cambio puede dejar al sistema sin
// quien administre usuarios y roles; nadie se quita a sí mismo esos permisos ni se desactiva.
export type Resultado = { ok: true; estado?: 201; cuerpo?: unknown } | { ok: false; estado: 400 | 404 | 409; error: string };
const mal = (estado: 400 | 404 | 409, error: string): Resultado => ({ ok: false, estado, error });
const SIN_QUIEN_ADMINISTRE = "No se guardó: el sistema se quedaría sin nadie que pueda administrar usuarios y roles";
const A_VOS_MISMO = "No podés quitarte a vos mismo los permisos de administrar: lo tiene que hacer otra persona";
const repetido = (e: unknown) => (e as { code?: string }).code === "23505";

// Se mira dentro de la transacción, con el cambio ya aplicado, antes de confirmarlo.
async function siguenAdministrando(trx: Ejecutor, actorId: string, tocaAlActor: boolean): Promise<void> {
  const quienes = await datos.quienesAdministran(trx);
  if (quienes.length === 0) throw new Deshacer(mal(409, SIN_QUIEN_ADMINISTRE));
  if (tocaAlActor && !quienes.includes(actorId)) throw new Deshacer(mal(400, A_VOS_MISMO));
}

// ---------- Roles ----------
export const roles = (): Promise<Rol[]> => datos.rolesConPermisos(base);

// Lo que llega ya viene validado con su esquema (`esquemas.ts`).
export type RolEntrada = z.output<typeof rolNuevo>;
export type CambiosDeRol = z.output<typeof cambiosDeRol>;

export async function crearRol(r: RolEntrada, actorId: string): Promise<Resultado> {
  const id = randomUUID();
  const nombre = r.nombre;
  const permisos = [...new Set(r.permisos)];
  try {
    await enTransaccion(async (trx) => {
      await datos.insertarRol(trx, id, nombre, r.descripcion?.trim() || null);
      await datos.ponerPermisos(trx, id, permisos, false);
      await anotarEvento(trx, { tipo: "rol.creado", usuarioId: actorId, contenido: { id, nombre, permisos } });
    });
  } catch (e) {
    if (repetido(e)) return mal(409, `Ya hay un rol que se llama ${nombre}`);
    throw e;
  }
  return { ok: true, estado: 201, cuerpo: { id, nombre, permisos } };
}

export async function cambiarRol(id: string, r: CambiosDeRol, actorId: string): Promise<Resultado> {
  try {
    return await enTransaccion(async (trx) => {
      if (!(await datos.cambiarRol(trx, id, r.nombre?.trim() || null, r.descripcion?.trim() ?? null))) throw new Deshacer(mal(404, "No existe ese rol"));
      if (r.permisos) {
        await datos.ponerPermisos(trx, id, [...new Set(r.permisos)], true);
        await siguenAdministrando(trx, actorId, true);
      }
      await anotarEvento(trx, { tipo: "rol.modificado", usuarioId: actorId, contenido: { id, cambios: r } });
      return { ok: true } as Resultado;
    });
  } catch (e) {
    if (repetido(e)) return mal(409, `Ya hay un rol que se llama ${r.nombre?.trim()}`);
    throw e;
  }
}

// Un rol que alguien tiene no se borra: primero hay que sacárselo. Así tampoco puede quedar el
// sistema sin quien administre por borrar un rol.
export async function borrarRol(id: string, actorId: string): Promise<Resultado> {
  const rol = await datos.rolConCuantos(base, id);
  if (!rol) return mal(404, "No existe ese rol");
  if (rol.usuarios > 0) return mal(409, `${rol.nombre} no se puede borrar: ${rol.usuarios === 1 ? "lo tiene 1 persona" : `lo tienen ${rol.usuarios} personas`}. Primero sacáselo`);
  await datos.borrarRol(base, id);
  await anotarEvento(base, { tipo: "rol.borrado", usuarioId: actorId, contenido: { id, nombre: rol.nombre } });
  return { ok: true };
}

// ---------- Usuarios ----------
export const usuarios = (): Promise<Enviable<Usuario>[]> => datos.usuariosConRoles(base);

// Que los roles pedidos existan (su forma ya la validó el esquema).
async function rolesExisten(e: Ejecutor, ids: string[]): Promise<boolean> {
  return (await datos.rolesQueExisten(e, ids)) === ids.length;
}

export async function autorizar(u: z.output<typeof usuarioNuevo>, actorId: string): Promise<Resultado> {
  const { email, nombre, roles } = u;
  if (!(await rolesExisten(base, roles))) return mal(400, "Hay un rol que no existe");
  const id = randomUUID();
  try {
    await enTransaccion(async (trx) => {
      await datos.insertarUsuario(trx, id, email, nombre);
      await datos.asignarRoles(trx, id, roles, false);
      await anotarEvento(trx, { tipo: "usuario.creado", usuarioId: actorId, contenido: { id, email, roles } });
    });
  } catch (e) {
    if (repetido(e)) return mal(409, `${email} ya existe`);
    throw e;
  }
  return { ok: true, estado: 201, cuerpo: { id, email, nombre, activo: true } };
}

export async function cambiarUsuario(id: string, u: z.output<typeof cambiosDeUsuario>, actorId: string): Promise<Resultado> {
  if (actorId === id && u.activo === false) return mal(400, "No podés desactivarte a vos mismo: lo tiene que hacer otra persona");
  return enTransaccion(async (trx) => {
    if (!(await datos.cambiarUsuario(trx, id, u.activo ?? null, u.nombre?.trim() || null))) throw new Deshacer(mal(404, "No existe ese usuario"));
    if (u.roles !== undefined) {
      if (!(await rolesExisten(trx, u.roles))) throw new Deshacer(mal(400, "Hay un rol que no existe"));
      await datos.asignarRoles(trx, id, u.roles, true);
    }
    await siguenAdministrando(trx, actorId, actorId === id);
    if (u.activo === false) await datos.cerrarSesionesDe(trx, id);
    await anotarEvento(trx, { tipo: "usuario.modificado", usuarioId: actorId, contenido: { id, cambios: u } });
    return { ok: true } as Resultado;
  });
}
