import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");
const { leerTiempos, ponerParaPrueba, segundosDeSesion } = await import("../sistema/ajustes.js");

// Más → Sistema (specs/020): lo que vale para todos, que fija quien administra el sistema.
type Ajustes = { sesion_segundos: number; celular_segundos: number; vinculo_dias: number; tramos: { sesion_segundos: number[]; celular_segundos: number[] } };
const guardados = () => base.actual.sqlDe(/INSERT INTO configuracion/).map((c) => c.params);
const eventos = () => base.actual.sqlDe(/INSERT INTO evento/);

describe("los ajustes del sistema", () => {
  beforeEach(() => {
    base.actual = baseFalsa(); ponerParaPrueba();
    base.actual.programar(/FROM configuracion WHERE clave = 'vinculo.dias'/, { rows: [{ valor: "30" }] });
  });

  it("020-E18: sin cambios, la sesión se recuerda 1 minuto, el celular pregunta cada 1 minuto y el vínculo dura 30 días; con sus tramos", async () => {
    const r = await pedir(app, "GET", "/sistema/ajustes", { rol: "admin" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ sesion_segundos: 60, celular_segundos: 60, vinculo_dias: 30, tramos: { sesion_segundos: [0, 30, 60, 300, 600], celular_segundos: [5, 30, 60, 300, 600] } } satisfies Ajustes);
  });

  it("020-E13: sin «Administrar el sistema» no se ven ni se cambian, y dice qué permiso hace falta", async () => {
    for (const [metodo, cuerpo] of [["GET", undefined], ["PUT", { sesion_segundos: 300 }]] as const) {
      const r = await pedir(app, metodo, "/sistema/ajustes", { rol: "mostrador", cuerpo });
      expect(r.status).toBe(403);
      expect(((await r.json()) as { error: string }).error).toContain("Administrar el sistema");
    }
    expect((await pedir(app, "GET", "/sistema/ajustes", { rol: null })).status).toBe(401);
    expect(guardados()).toEqual([]);
  });

  it("020-E14 020-E16: guardar un tramo lo guarda para todos, vale en el momento y queda en «Quién hizo qué» con antes y después", async () => {
    const r = await pedir(app, "PUT", "/sistema/ajustes", { rol: "admin", cuerpo: { sesion_segundos: 300 } });
    expect(r.status).toBe(200);
    expect(((await r.json()) as Ajustes).sesion_segundos).toBe(300);
    expect(guardados()).toEqual([["sesion.recordar_segundos", "300"]]);
    expect(segundosDeSesion()).toBe(300);
    const [evento] = eventos();
    expect(evento!.params).toContain("sistema.ajustes_cambiados");
    expect(JSON.parse(String(evento!.params.find((p) => String(p).includes("despues"))))).toEqual({ antes: { sesion_segundos: 60 }, despues: { sesion_segundos: 300 } });
    // Los dispositivos se enteran del tiempo del celular por la sesión actual.
    await pedir(app, "PUT", "/sistema/ajustes", { rol: "admin", cuerpo: { celular_segundos: 5 } });
    expect(((await (await pedir(app, "GET", "/sesiones/actual", { rol: "soloVende" })).json()) as { ajustes: unknown }).ajustes).toEqual({ celular_segundos: 5 });
  });

  it("020-E14: los días del vínculo se guardan en el mismo lugar que antes", async () => {
    await pedir(app, "PUT", "/sistema/ajustes", { rol: "admin", cuerpo: { vinculo_dias: 45 } });
    expect(guardados()).toEqual([["45"]]);
  });

  it("020-E15: lo que no es un tramo, o unos días fuera de 1 a 365, no se guarda y dice qué valores puede tener", async () => {
    for (const [cuerpo, dice] of [
      [{ sesion_segundos: 120 }, "no recordarla, 30 segundos, 1, 5 o 10 minutos"],
      [{ celular_segundos: 3 }, "5 o 30 segundos, 1, 5 o 10 minutos"],
      [{ vinculo_dias: 400 }, "entre 1 y 365"],
      [{ sesion_segundos: "60" }, "no recordarla"],
      [{}, "No hay nada que cambiar"],
    ] as const) {
      const r = await pedir(app, "PUT", "/sistema/ajustes", { rol: "admin", cuerpo });
      expect(r.status, JSON.stringify(cuerpo)).toBe(400);
      expect(((await r.json()) as { error: string }).error).toContain(dice);
    }
    expect(guardados()).toEqual([]);
    expect(eventos()).toEqual([]);
  });

  it("al arrancar lee los tiempos guardados; lo que no es un tramo, o si la base no contesta, vale lo de arranque", async () => {
    base.actual.programar(/FROM configuracion WHERE clave = ANY/, { rows: [{ clave: "sesion.recordar_segundos", valor: "600" }, { clave: "celular.pregunta_segundos", valor: "7" }] });
    expect(await leerTiempos()).toEqual({ sesion_segundos: 600, celular_segundos: 60 });
    base.actual.programar(/FROM configuracion WHERE clave = ANY/, () => { throw new Error("sin base"); });
    expect(await leerTiempos()).toEqual({ sesion_segundos: 60, celular_segundos: 60 });
  });
});
