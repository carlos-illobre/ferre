import { Kysely, PostgresDialect } from "kysely";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");
const { ponerParaPrueba } = await import("../sistema/ajustes.js");

// La sesión recordada (specs/020, RF-133): mientras vale, la sesión no se vuelve a buscar en la base.
const busquedas = () => base.actual.sqlDe(/FROM sesion s JOIN usuario u/).length;
const varios = async (n: number, rol: "soloVende" | "admin" = "soloVende") => { for (let i = 0; i < n; i++) expect((await pedir(app, "GET", "/sesiones/actual", { rol })).status).toBe(200); };
// Una base de mentira que contesta con la consulta que se le pase.
const comoBase = (query: (...a: unknown[]) => Promise<unknown>) =>
  new Kysely<never>({ dialect: new PostgresDialect({ pool: { connect: async () => ({ query, release: () => undefined }), end: async () => undefined } as never }) });
const ROL = "0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11";

describe("la sesión recordada", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); base.actual = baseFalsa(); ponerParaPrueba(); });
  afterEach(() => { vi.useRealTimers(); });

  it("020-E01: con 1 minuto, varios pedidos dentro del minuto la buscan una vez; pasado el minuto, de nuevo", async () => {
    await varios(10);
    expect(busquedas()).toBe(1);
    vi.advanceTimersByTime(61_000);
    await varios(1);
    expect(busquedas()).toBe(2);
  });

  it("020-E02: con 0, se busca en cada pedido, como antes", async () => {
    ponerParaPrueba({ sesion_segundos: 0 });
    await varios(3);
    expect(busquedas()).toBe(3);
  });

  it("020-E03: salir, cerrar una sesión, cambiar a una persona o un rol la olvidan: el pedido siguiente ya la busca", async () => {
    base.actual.programar(/FROM usuario u\s+WHERE u\.activo AND \(SELECT count\(DISTINCT rp\.permiso\)/, { rows: [{ id: "u-admin" }] });
    base.actual.programar(/UPDATE rol SET nombre/, { rowCount: 1 });
    base.actual.programar(/UPDATE usuario SET activo/, { rowCount: 1 });
    base.actual.programar(/SELECT r\.nombre, \(SELECT count/, { rows: [{ nombre: "Caja", usuarios: 0 }] });
    base.actual.programar(/DELETE FROM rol WHERE/, { rowCount: 1 });
    base.actual.programar(/count\(\*\).*FROM rol WHERE id = ANY|FROM rol WHERE id = ANY/, { rows: [{ n: 1, count: 1 }] });
    const cambios: [string, string, unknown][] = [
      ["PATCH", "/usuarios/u-solo-vende", { activo: false }],
      ["PATCH", `/roles/${ROL}`, { nombre: "Caja" }],
      ["PATCH", `/roles/${ROL}`, { permisos: ["ventas.ver"] }],
      ["DELETE", `/roles/${ROL}`, undefined],
      ["PUT", "/sistema/ajustes", { sesion_segundos: 30 }],
      ["DELETE", "/sesiones/sesion-soloVende", undefined],
      ["DELETE", "/sesiones/actual", undefined],
    ];
    for (const [metodo, ruta, cuerpo] of cambios) {
      await varios(2);
      const antes = busquedas();
      const r = await pedir(app, metodo, ruta, { rol: "admin", cuerpo });
      expect(r.status, `${metodo} ${ruta}`).toBeLessThan(300);
      await varios(1);
      expect(busquedas(), `${metodo} ${ruta}`).toBe(antes + 2); // la del admin y la de quien vende, de nuevo
    }
  });

  it("020-E03: una persona desactivada no pasa en su pedido siguiente, aunque estaba recordada", async () => {
    base.actual.programar(/UPDATE usuario SET activo/, { rowCount: 1 });
    base.actual.programar(/FROM usuario u\s+WHERE u\.activo AND \(SELECT count\(DISTINCT rp\.permiso\)/, { rows: [{ id: "u-admin" }] });
    await varios(1);
    await pedir(app, "PATCH", "/usuarios/u-solo-vende", { rol: "admin", cuerpo: { activo: false } });
    base.actual.fijarSesion(null); // la base ya no la encuentra: la persona está desactivada
    expect((await pedir(app, "GET", "/sesiones/actual", { rol: "soloVende" })).status).toBe(401);
  });

  it("020-E03: una búsqueda que empezó antes de un cambio no guarda lo que trajo", async () => {
    const { buscarSesion, olvidarSesiones } = await import("./sesiones.js");
    let soltar: () => void = () => undefined;
    const fila = { id: "s1", ultimo_uso_en: new Date(), expira_en: new Date(Date.now() + 86_400_000), usuario_id: "u1", email: "a@b", nombre: "A", roles: [], permisos: ["admin.usuarios"] };
    const lenta = { query: vi.fn(() => new Promise((r) => { soltar = () => r({ rows: [fila] }); })) };
    const enCurso = buscarSesion(comoBase(lenta.query) as never, "token-lento");
    olvidarSesiones(); // mientras tanto se le quitó un permiso desde la aplicación
    await vi.waitFor(() => expect(lenta.query).toHaveBeenCalled());
    soltar();
    expect((await enCurso)?.usuario.permisos).toEqual(["admin.usuarios"]);
    const rapida = { query: vi.fn(async () => ({ rows: [{ ...fila, permisos: [] }] })) };
    expect((await buscarSesion(comoBase(rapida.query) as never, "token-lento"))?.usuario.permisos).toEqual([]);
    expect(rapida.query).toHaveBeenCalledTimes(1);
  });

  it("020-E04: una sesión recordada que vence no pasa: recordarla nunca la estira", async () => {
    base.actual.fijarSesion({ id: "s1", ultimo_uso_en: new Date(), expira_en: new Date(Date.now() + 10_000), usuario_id: "u1", email: "a@b", nombre: "A", roles: [], permisos: [] });
    expect((await pedir(app, "GET", "/sesiones/actual", { rol: "soloVende" })).status).toBe(200);
    vi.advanceTimersByTime(11_000);
    base.actual.fijarSesion(null);
    expect((await pedir(app, "GET", "/sesiones/actual", { rol: "soloVende" })).status).toBe(401);
  });

  it("020-E05: un token que no es una sesión se rechaza y no se recuerda", async () => {
    for (let i = 0; i < 3; i++) expect((await pedir(app, "GET", "/sesiones/actual", { rol: "nadie" as never })).status).toBe(401);
    expect(busquedas()).toBe(3);
  });

  it("020-E06: una sesión en uso recordada se sigue renovando, una vez por hora", async () => {
    ponerParaPrueba({ sesion_segundos: 600 });
    base.actual.fijarSesion({ id: "s1", ultimo_uso_en: new Date(Date.now() - 55 * 60_000), expira_en: new Date(Date.now() + 86_400_000), usuario_id: "u1", email: "a@b", nombre: "A", roles: [], permisos: [] });
    await varios(1);
    expect(base.actual.sqlDe(/UPDATE sesion SET ultimo_uso_en/)).toHaveLength(0);
    vi.advanceTimersByTime(6 * 60_000);
    await varios(1); // sigue recordada, pero ya pasó la hora desde el último uso
    expect(base.actual.sqlDe(/UPDATE sesion SET ultimo_uso_en/)).toHaveLength(1);
    expect(busquedas()).toBe(1);
  });
});
