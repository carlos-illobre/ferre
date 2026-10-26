import { describe, expect, it } from "vitest";
import * as datos from "./acceso.js";
import { base } from "./conexion.js";
import { puesto, sesion, usuario, usuarioConPermisos } from "./pruebas/datos.js";

const vence = (dias: number) => new Date(Date.now() + dias * 86_400_000);

// Acceso (007): sesiones, huellas y el vínculo celular–computadora.
describe("las sesiones", () => {
  it("de un token se guarda su hash; se encuentra mientras vale, se renueva y se cierra", async () => {
    const ana = await usuarioConPermisos(["ventas.ver"], { nombre: "Ana" });
    const id = crypto.randomUUID();
    await datos.insertarSesion(base, { id, usuarioId: ana, token: "secreto", dispositivo: "celular", dias: 90 });
    expect((await base.selectFrom("sesion").select("token_hash").where("id", "=", id).executeTakeFirstOrThrow()).token_hash).toBe(datos.hashear("secreto"));
    expect(await datos.sesionPorHash(base, datos.hashear("secreto"))).toMatchObject({ id, usuario_id: ana, nombre: "Ana", permisos: ["ventas.ver"] });
    await datos.renovarSesion(base, id, 1);
    expect((await datos.sesionPorHash(base, datos.hashear("secreto")))!.expira_en.getTime()).toBeLessThan(vence(2).getTime());
    await datos.revocarSesion(base, id);
    expect(await datos.sesionPorHash(base, datos.hashear("secreto"))).toBeNull();
  });

  it("el usuario con sus permisos: activo, o solo desactivado si se pide", async () => {
    const activo = await usuarioConPermisos(["ventas.ver"]);
    const inactivo = await usuario({ activo: false });
    expect(await datos.usuarioConPermisos(base, activo, true)).toMatchObject({ id: activo, permisos: ["ventas.ver"] });
    expect(await datos.usuarioConPermisos(base, inactivo, true)).toBeNull();
    expect(await datos.usuarioConPermisos(base, inactivo, false)).toMatchObject({ id: inactivo, roles: [], permisos: [] });
    expect(await datos.usuarioActivoPorCorreo((await base.selectFrom("usuario").select("email").where("id", "=", activo).executeTakeFirstOrThrow()).email)).toBe(activo);
    expect(await datos.usuarioActivoPorCorreo("nadie@ferre.test")).toBeNull();
  });

  it("las abiertas, salvo la propia", async () => {
    const ana = await usuario({ nombre: "Ana" });
    const [propia, otra] = [await sesion(ana), await sesion(ana)];
    await sesion(ana, crypto.randomUUID(), { revocada_en: new Date() });
    const abiertas = (await datos.sesionesAbiertas(propia)).map((s) => s.id);
    expect(abiertas).toContain(otra);
    expect(abiertas).not.toContain(propia);
  });
});

describe("entrar a la computadora con el celular", () => {
  it("un código que venció sin aprobarse ya no está", async () => {
    const id = crypto.randomUUID();
    await datos.nuevaVinculacion(id, `codigo-${id}`, "clave", "computadora", -1);
    expect(await datos.estadoDeVinculacion(id, "clave")).toBeNull();
  });

  it("el código se aprueba una vez, se retira una vez y vence", async () => {
    const ana = await usuario();
    const celular = await sesion(ana);
    const id = crypto.randomUUID();
    await datos.nuevaVinculacion(id, "codigo", "clave", "computadora", 60);
    expect(await datos.estadoDeVinculacion(id, "clave")).toBe("pendiente");
    expect(await datos.estadoDeVinculacion(id, "otra")).toBeNull();
    expect(await datos.estadoDeVinculacion("no-es-un-uuid", "clave")).toBeNull();
    expect(await datos.retirarVinculacion(id, "clave")).toBeNull();
    expect(await datos.aprobarVinculacion("codigo", ana, celular)).toEqual({ id, dispositivo: "computadora" });
    expect(await datos.aprobarVinculacion("codigo", ana, celular)).toBeNull();
    expect(await datos.estadoDeVinculacion(id, "clave")).toBe("aprobada");
    expect(await datos.retirarVinculacion(id, "clave")).toEqual({ aprobada_por: ana, dispositivo: "computadora", celular_sesion_id: celular });
    expect(await datos.retirarVinculacion("no-es-un-uuid", "clave")).toBeNull();
    expect(await datos.estadoDeVinculacion(id, "clave")).toBeNull();
    await datos.anotarSesionDeVinculacion(id, celular);
    expect((await base.selectFrom("vinculacion").select("sesion_id").where("id", "=", id).executeTakeFirstOrThrow()).sesion_id).toBe(celular);
  });
});

describe("las huellas", () => {
  it("se guardan, se listan, se usan y se quitan (las propias, o cualquiera si se puede)", async () => {
    const [ana, beto] = [await usuario({ nombre: "Ana" }), await usuario()];
    const id = `cred-${crypto.randomUUID()}`;
    await datos.guardarCredencial({ id, usuarioId: ana, clavePublica: Buffer.from("clave"), contador: 0, transportes: ["internal"], dispositivo: "Celular" });
    expect(await datos.credencialesVigentesDe(ana)).toEqual([{ id, transportes: ["internal"] }]);
    expect((await datos.celularesDe(ana)).map((c) => c.id)).toEqual([id]);
    expect((await datos.celularesDeOtros(beto)).map((c) => c.id)).toContain(id);
    expect(await datos.credencialConUsuario(id)).toMatchObject({ usuario_id: ana, nombre: "Ana", activo: true });
    await datos.usarCredencial(id, 5);
    expect((await datos.credencialConUsuario(id))!.contador).toBe("5");
    expect(await datos.quitarCredencial(id, beto, false)).toBe(false);
    expect(await datos.quitarCredencial(id, beto, true)).toBe(true);
    expect(await datos.credencialConUsuario(id)).toBeNull();
  });
});

describe("el vínculo celular–computadora", () => {
  it("el código de la computadora vincula al celular una vez, por los días pedidos", async () => {
    const ana = await usuario();
    const [compu, celular] = [await sesion(ana), await sesion(ana)];
    const id = crypto.randomUUID();
    await datos.nuevoPuesto(id, compu, "qr", "computadora del mostrador", 5);
    expect(await datos.duenioDelCodigo("qr")).toBe(ana);
    expect(await datos.puestoDe(id, compu)).toMatchObject({ nombre: "computadora del mostrador", vinculado_en: null });
    expect(await datos.vincularPorCodigo("qr", celular, 30)).toMatchObject({ id, sesion_id: compu });
    expect(await datos.vincularPorCodigo("qr", celular, 30)).toBeNull();
    expect(await datos.duenioDelCodigo("qr")).toBeNull();
    expect(await datos.puestoDe(id, crypto.randomUUID())).toBeNull();
  });

  it("de quién es cada lado, y cada uno lo suelta", async () => {
    const ana = await usuario();
    const [compu, celular, otra] = [await sesion(ana), await sesion(ana), await sesion(ana)];
    const id = await puesto(compu, { celular_sesion_id: celular });
    expect(await datos.ladoEnElPuesto(id, compu)).toBe("computadora");
    expect(await datos.ladoEnElPuesto(id, celular)).toBe("celular");
    expect(await datos.ladoEnElPuesto(id, otra)).toBeNull();
    expect(await datos.vinculoEnElPuesto(id, celular)).toEqual({ lado: "celular", expira_en: expect.any(Date) });
    expect((await datos.vinculosDeLaSesion(celular)).map((v) => v.id)).toEqual([id]);
    expect(await datos.soltarPuesto(id, otra)).toBe(false);
    expect(await datos.soltarPuesto(id, celular)).toBe(true);
    expect(await datos.ladoEnElPuesto(id, compu)).toBeNull();
  });

  it("emparejar de nuevo: suelta lo anterior, sella de quién es y lo adopta la sesión nueva del mismo dispositivo", async () => {
    const ana = await usuario();
    const [compu, celular] = [await sesion(ana, crypto.randomUUID(), { dispositivo_id: "compu-0001" }), await sesion(ana)];
    await datos.anotarDispositivo(base, celular, "celu-0001");
    const viejo = await puesto(compu, { celular_sesion_id: celular });
    expect(await datos.soltarAnteriores(base, compu, celular, null)).toEqual([viejo]);
    expect(await datos.ladoEnElPuesto(viejo, compu)).toBeNull();
    const nuevo = await datos.puestoVinculado(base, { compuSesionId: compu, celularSesionId: celular, nombre: null, dias: 30 });
    expect(nuevo.expira_en).toBeDefined();
    await datos.sellarVinculo(base, nuevo.id);
    expect(await base.selectFrom("puesto").select(["usuario_id", "compu_dispositivo", "celular_dispositivo"]).where("id", "=", nuevo.id).executeTakeFirstOrThrow()).toEqual({ usuario_id: ana, compu_dispositivo: "compu-0001", celular_dispositivo: "celu-0001" });
    await datos.soltarAnteriores(base, compu, celular, nuevo.id);
    expect(await datos.ladoEnElPuesto(nuevo.id, compu)).toBe("computadora");
    const [compuNueva, celularNuevo] = [await sesion(ana), await sesion(ana)];
    await datos.adoptarVinculos(base, compuNueva, ana, "compu-0001");
    await datos.adoptarVinculos(base, celularNuevo, ana, "celu-0001");
    expect(await datos.ladoEnElPuesto(nuevo.id, compuNueva)).toBe("computadora");
    expect(await datos.ladoEnElPuesto(nuevo.id, celularNuevo)).toBe("celular");
    expect(await datos.vinculosDelUsuario(base, ana)).toEqual([nuevo.id]);
    expect(await datos.cortarVinculosDe(base, celularNuevo)).toEqual([nuevo.id]);
    expect(await datos.ladoEnElPuesto(nuevo.id, compuNueva)).toBeNull();
  });
});
