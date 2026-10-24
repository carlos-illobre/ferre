import { describe, expect, it } from "vitest";
import { PARA_ADMINISTRAR, PARA_EL_SISTEMA } from "../permisos.js";
import * as datos from "./administracion.js";
import { base } from "./conexion.js";
import { rol, sesion, usuario, usuarioConPermisos } from "./pruebas/datos.js";

describe("usuarios y roles", () => {
  it("quiénes administran: activos y con los dos permisos de administrar", async () => {
    const todos = await usuarioConPermisos([...PARA_ADMINISTRAR]);
    await usuarioConPermisos([PARA_ADMINISTRAR[0]!]);
    await usuarioConPermisos([...PARA_ADMINISTRAR], { activo: false });
    expect(await datos.quienesAdministran(base)).toContain(todos);
    const antes = await datos.cuantosAdministranElSistema(base);
    await usuarioConPermisos([PARA_EL_SISTEMA]);
    expect(await datos.cuantosAdministranElSistema(base)).toBe(antes + 1);
  });

  it("un rol se crea, cambia, recibe permisos (sumando o reemplazando) y se borra", async () => {
    const id = crypto.randomUUID();
    await datos.insertarRol(base, id, "Cajero", null);
    expect(await datos.cambiarRol(base, id, null, "Cobra")).toBe(true);
    expect(await datos.cambiarRol(base, crypto.randomUUID(), "Nadie", null)).toBe(false);
    await datos.ponerPermisos(base, id, ["ventas.ver"], false);
    await datos.ponerPermisos(base, id, ["ventas.registrar"], false);
    expect((await datos.rolesConPermisos(base)).find((r) => r.id === id)).toMatchObject({ nombre: "Cajero", descripcion: "Cobra", permisos: ["ventas.registrar", "ventas.ver"], usuarios: 0 });
    await datos.ponerPermisos(base, id, ["ventas.anular"], true);
    expect((await datos.rolesConPermisos(base)).find((r) => r.id === id)!.permisos).toEqual(["ventas.anular"]);
    expect(await datos.rolConCuantos(base, id)).toEqual({ nombre: "Cajero", usuarios: 0 });
    expect(await datos.rolConCuantos(base, crypto.randomUUID())).toBeNull();
    await datos.borrarRol(base, id);
    expect(await datos.rolConCuantos(base, id)).toBeNull();
  });

  it("los roles por nombre, sin distinguir mayúsculas; sin nombres, todos", async () => {
    await rol([], { nombre: "Repositor" });
    expect((await datos.rolesPorNombre(base, ["repositor"])).map((r) => r.nombre)).toEqual(["Repositor"]);
    expect((await datos.rolesPorNombre(base, null)).length).toBeGreaterThan(1);
  });

  it("un usuario se da de alta, con roles que existen, que se suman o se reemplazan", async () => {
    const [a, b] = [await rol([]), await rol([])];
    expect(await datos.rolesQueExisten(base, [a, b, crypto.randomUUID()])).toBe(2);
    const id = crypto.randomUUID();
    await datos.insertarUsuario(base, id, "ana@ferre.test", "Ana");
    await datos.asignarRoles(base, id, [a], false);
    await datos.asignarRoles(base, id, [b], false);
    expect((await datos.usuariosConRoles(base)).find((u) => u.id === id)!.roles).toHaveLength(2);
    await datos.asignarRoles(base, id, [a], true);
    expect((await datos.usuariosConRoles(base)).find((u) => u.id === id)!.roles.map((r) => r.id)).toEqual([a]);
  });

  it("cambiar un usuario toca solo lo que viene, y se le cierran las sesiones", async () => {
    const id = await usuario({ nombre: "Beto" });
    const s = await sesion(id);
    expect(await datos.cambiarUsuario(base, id, false, null)).toBe(true);
    expect(await datos.cambiarUsuario(base, crypto.randomUUID(), true, "x")).toBe(false);
    expect(await base.selectFrom("usuario").select(["activo", "nombre"]).where("id", "=", id).executeTakeFirst()).toEqual({ activo: false, nombre: "Beto" });
    await datos.cerrarSesionesDe(base, id);
    expect((await base.selectFrom("sesion").select("revocada_en").where("id", "=", s).executeTakeFirstOrThrow()).revocada_en).not.toBeNull();
  });
});
