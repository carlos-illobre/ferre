import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

// El canal de cada dispositivo (specs/025, ADR-030): quién escucha qué, y lo que le llega.
const P1 = "0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11";
const V1 = "6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const temas = (...lista: object[]) => ({ "X-Temas": JSON.stringify(lista), "X-Canal": crypto.randomUUID() });
const abrir = (rol: "admin" | "mostrador" | "soloVende" | null, ...lista: object[]) => pedir(app, "GET", "/canal", { rol, cabeceras: temas(...lista) });
// El vínculo P1 entre la sesión del administrador (computadora) y la del mostrador (celular).
const delVinculo = (expiraEn = new Date(Date.now() + 86_400_000)) => base.actual.programar(/SELECT sesion_id, celular_sesion_id, expira_en FROM puesto WHERE id = \$1/, (params) => ({ rows: params[0] === P1 && ["sesion-admin", "sesion-mostrador"].includes(String(params[1])) ? [{ sesion_id: "sesion-admin", celular_sesion_id: "sesion-mostrador", expira_en: expiraEn }] : [] }));
// Lee lo que va llegando por el canal hasta que aparece un texto.
const lectorDe = (respuesta: Response) => {
  const lector = respuesta.body!.getReader();
  let recibido = "";
  return {
    hasta: async (texto: string) => { for (let i = 0; i < 6 && !recibido.includes(texto); i++) { const r = await lector.read(); if (r.done) break; recibido += new TextDecoder().decode(r.value); } return recibido; },
    terminado: async () => (await lector.read()).done,
    cancelar: () => lector.cancel(),
  };
};

describe("canal", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("sin temas o con temas mal escritos no se abre; un tema desconocido no se da (025-E31)", async () => {
    expect((await pedir(app, "GET", "/canal", { rol: "admin" })).status).toBe(400);
    const r = await abrir("admin", { t: "otra-cosa:1" }, { t: "toString:1" });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ rechazados: ["otra-cosa:1", "toString:1"] });
    // 025-E33: lo que va a cuestas no es un tema del canal (nadie abre canales sin sesión ni código
    // con él); tampoco se dan demasiados temas.
    expect((await abrir(null, { t: "version" })).status).toBe(403);
    const muchos = Array.from({ length: 11 }, (_, i) => ({ t: `sesion:${i}` }));
    expect((await abrir("admin", ...muchos)).status).toBe(400);
  });

  it("025-E30: la entrada con código QR se escucha sin sesión, solo con su clave; al abrir cuenta si ya la aprobaron", async () => {
    expect((await abrir(null, { t: `entrada:${V1}` })).status).toBe(404);
    expect((await abrir(null, { t: "entrada:no-es-un-uuid", k: "clave" })).status).toBe(404);
    base.actual.programar(/AS estado\s+FROM vinculacion/, (params) => ({ rows: params[1] ? [{ estado: "aprobada" }] : [] }));
    const r = await abrir(null, { t: `entrada:${V1}`, k: "la-clave" });
    expect(r.status).toBe(200);
    expect(await lectorDe(r).hasta("listo")).toContain(`data: {"t":"entrada:${V1}","d":{"listo":true}}`);
  });

  it("025-E01: cuando el celular aprueba la entrada, la computadora que espera se entera en el momento", async () => {
    base.actual.programar(/AS estado\s+FROM vinculacion/, { rows: [{ estado: "pendiente" }] });
    const compu = lectorDe(await abrir(null, { t: `entrada:${V1}`, k: "la-clave" }));
    expect(await compu.hasta('"a"')).toContain('{"a":{"version"');
    base.actual.programar(/UPDATE vinculacion SET aprobada_en/, { rows: [{ id: V1, dispositivo: "computadora" }] });
    expect((await pedir(app, "POST", "/sesiones/vinculaciones/aprobar", { rol: "mostrador", cuerpo: { codigo: "el-codigo" } })).status).toBe(200);
    expect(await compu.hasta("listo")).toContain(`data: {"t":"entrada:${V1}","d":{"listo":true}}`);
    await compu.cancelar();
  });

  it("025-E02: el código para vincular lo escucha la computadora que lo pidió, y se entera cuando el celular lo lee", async () => {
    expect((await abrir(null, { t: `puesto:${P1}` })).status).toBe(401);
    expect((await abrir("mostrador", { t: `puesto:${P1}` })).status).toBe(404);
    base.actual.programar(/SELECT id, nombre, vinculado_en, expira_en FROM puesto/, { rows: [{ id: P1, nombre: null, vinculado_en: null, expira_en: "2026-11-11T00:00:00Z" }] });
    const compu = lectorDe(await abrir("admin", { t: `puesto:${P1}` }));
    base.actual.programar(/UPDATE puesto SET vinculado_en = now\(\)/, { rows: [{ id: P1, nombre: null, sesion_id: "sesion-admin", expira_en: "2026-11-11T00:00:00Z" }] });
    await pedir(app, "POST", "/puestos/codigo-del-qr/vincular", { rol: "admin" });
    expect(await compu.hasta("expira_en")).toContain(`data: {"t":"puesto:${P1}","d":{"expira_en":"2026-11-11T00:00:00Z"}}`);
    // 025-E06: si ya se vinculó mientras no escuchaba, lo cuenta al abrir.
    base.actual.programar(/SELECT id, nombre, vinculado_en, expira_en FROM puesto/, { rows: [{ id: P1, nombre: null, vinculado_en: "2026-10-25T00:00:00Z", expira_en: "2026-11-11T00:00:00Z" }] });
    expect(await lectorDe(await abrir("admin", { t: `puesto:${P1}` })).hasta("expira_en")).toContain(`"d":{"expira_en"`);
    await compu.cancelar();
  });

  it("023-E25: solo los dos del vínculo lo escuchan y mandan por él; el otro recibe lo que manda uno, sin que se guarde", async () => {
    delVinculo();
    const tema = `vinculo:${P1}`;
    expect((await abrir("soloVende", { t: tema })).status).toBe(404);
    expect((await pedir(app, "POST", `/canal/${tema}`, { rol: "soloVende", cuerpo: ["hola"] })).status).toBe(404);
    expect((await pedir(app, "POST", "/canal/sesion:x", { rol: "admin", cuerpo: ["hola"] })).status).toBe(404);
    expect((await abrir(null, { t: tema })).status).toBe(401);
    const compu = lectorDe(await abrir("admin", { t: tema, l: "cualquiera" }));
    expect(await compu.hasta('"p"')).toContain(`data: {"t":"${tema}","p":false}`);
    const celular = lectorDe(await abrir("mostrador", { t: tema }));
    expect(await celular.hasta('"p"')).toContain(`data: {"t":"${tema}","p":true}`);
    expect((await pedir(app, "POST", `/canal/${tema}`, { rol: "mostrador", cuerpo: ["hola"] })).status).toBe(204);
    expect(await compu.hasta("hola")).toContain(`data: {"t":"${tema}","d":"hola"}`);
    // 023-E27: lo que no es una tanda no pasa, y lo demasiado grande se corta antes de leerlo.
    expect((await pedir(app, "POST", `/canal/${tema}`, { rol: "mostrador", cuerpo: ["x".repeat(5_000_000)] })).status).toBe(413);
    expect((await pedir(app, "POST", `/canal/${tema}`, { rol: "mostrador", cuerpo: { m: "x" } })).status).toBe(400);
    expect(base.actual.sqlDe(/INSERT/).filter((c) => /hola/.test(JSON.stringify(c.params)))).toHaveLength(0);
    await compu.cancelar(); await celular.cancelar();
  });

  it("023-E26: desvincular, cerrar a distancia una sesión, desactivar a la persona o vencer el vínculo cierra el tema en el momento", async () => {
    delVinculo();
    const tema = `vinculo:${P1}`;
    const celu = async () => lectorDe(await abrir("mostrador", { t: tema }));
    let celular = await celu();
    base.actual.programar(/UPDATE puesto SET expira_en = now\(\) WHERE id = \$1/, { rowCount: 1 });
    await pedir(app, "DELETE", `/puestos/${P1}`, { rol: "admin" });
    expect(await celular.hasta('"c"')).toContain(`data: {"t":"${tema}","c":true}`);
    expect(await celular.terminado()).toBe(true);
    celular = await celu();
    base.actual.programar(/UPDATE puesto SET expira_en = now\(\) WHERE vinculado_en IS NOT NULL AND expira_en > now\(\) AND \(sesion_id = \$1 OR celular_sesion_id = \$\d\) RETURNING id/, { rows: [{ id: P1 }] });
    await pedir(app, "DELETE", "/sesiones/sesion-admin", { rol: "admin" });
    expect(await celular.hasta('"c"')).toContain(`data: {"t":"${tema}","c":true}`);
    celular = await celu();
    base.actual.programar(/SELECT id FROM puesto WHERE usuario_id = \$1/, { rows: [{ id: P1 }] });
    base.actual.programar(/UPDATE usuario SET activo/, { rowCount: 1 });
    base.actual.programar(/FROM usuario u\s+WHERE u\.activo AND \(SELECT count\(DISTINCT rp\.permiso\)/, { rows: [{ id: "u-admin" }, { id: "u-dueño" }] });
    const r = await pedir(app, "PATCH", "/usuarios/0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11", { rol: "admin", cuerpo: { activo: false } });
    expect(r.status, await r.clone().text()).toBeLessThan(300);
    expect(await celular.hasta('"c"')).toContain(`data: {"t":"${tema}","c":true}`);
    // Vencer el vínculo: el tema se cierra solo a la hora en que vence, con los dos abiertos.
    delVinculo(new Date(Date.now() + 80));
    celular = await celu();
    expect(await celular.hasta('"p"')).toContain('"p"');
    await new Promise((ok) => setTimeout(ok, 150));
    expect(await celular.hasta('"c"')).toContain(`data: {"t":"${tema}","c":true}`);
  });

  it("025-E10, E32: la sesión se escucha solo la propia; al cerrarla a distancia o al desactivar se avisa y el canal se cierra", async () => {
    expect((await abrir("admin", { t: "sesion:sesion-mostrador" })).status).toBe(403);
    expect((await abrir(null, { t: "sesion:sesion-mostrador" })).status).toBe(401);
    let celular = lectorDe(await abrir("mostrador", { t: "sesion:sesion-mostrador" }));
    await pedir(app, "DELETE", "/sesiones/sesion-mostrador", { rol: "admin" });
    expect(await celular.hasta('"c"')).toContain('data: {"t":"sesion:sesion-mostrador","c":true}');
    expect(await celular.terminado()).toBe(true);
    // Con otro tema además del de la sesión, el canal se cierra igual.
    base.actual.programar(/SELECT id, nombre, vinculado_en, expira_en FROM puesto/, { rows: [{ id: P1, nombre: null, vinculado_en: null, expira_en: "2026-11-11T00:00:00Z" }] });
    celular = lectorDe(await abrir("mostrador", { t: "sesion:sesion-mostrador" }, { t: `puesto:${P1}` }));
    await celular.hasta('"a"');
    await pedir(app, "DELETE", "/sesiones/sesion-mostrador", { rol: "admin" });
    expect(await celular.hasta('"c"')).toContain('"c":true');
    expect(await celular.terminado()).toBe(true);
    // Al salir no se avisa nada, pero el canal se cierra.
    celular = lectorDe(await abrir("mostrador", { t: "sesion:sesion-mostrador" }));
    await celular.hasta('"a"');
    await pedir(app, "DELETE", "/sesiones/actual", { rol: "mostrador" });
    expect(await celular.terminado()).toBe(true);
    celular = lectorDe(await abrir("mostrador", { t: "sesion:sesion-mostrador" }));
    base.actual.programar(/UPDATE usuario SET activo/, { rowCount: 1 });
    base.actual.programar(/UPDATE sesion SET revocada_en = now\(\) WHERE usuario_id/, { rows: [{ id: "sesion-mostrador" }] });
    base.actual.programar(/FROM usuario u\s+WHERE u\.activo AND \(SELECT count\(DISTINCT rp\.permiso\)/, { rows: [{ id: "u-admin" }, { id: "u-dueño" }] });
    await pedir(app, "PATCH", "/usuarios/0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11", { rol: "admin", cuerpo: { activo: false } });
    expect(await celular.hasta('"c"')).toContain('"c":true');
  });

  it("025-E07: un canal por dispositivo; sin identificador, cada pedido es otro canal", async () => {
    const cabeceras = temas({ t: "sesion:sesion-admin" });
    const viejo = lectorDe(await pedir(app, "GET", "/canal", { rol: "admin", cabeceras }));
    await viejo.hasta('"a"');
    lectorDe(await pedir(app, "GET", "/canal", { rol: "admin", cabeceras }));
    expect(await viejo.terminado()).toBe(true);
    const r = await pedir(app, "GET", "/canal", { rol: "admin", cabeceras: { "X-Temas": cabeceras["X-Temas"] } });
    expect(r.status).toBe(200);
  });
});
