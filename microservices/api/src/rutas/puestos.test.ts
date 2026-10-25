import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

// El emparejamiento celular–computadora (decisión 58).
describe("emparejamiento", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("cada lado sabe con quién está vinculado, aunque el otro no tenga la sesión abierta", async () => {
    expect((await pedir(app, "GET", "/puestos/mio", { rol: null })).status).toBe(401);
    expect(await (await pedir(app, "GET", "/puestos/mio", { rol: "mostrador" })).json()).toEqual({ comoComputadora: null, comoCelular: null });
    base.actual.programar(/FROM puesto p\s+WHERE p\.vinculado_en IS NOT NULL/, { rows: [{ id: "p1", nombre: "computadora · Chrome", expira_en: "2026-11-11T00:00:00Z", sesion_id: "sesion-admin" }] });
    const compu = (await (await pedir(app, "GET", "/puestos/mio", { rol: "admin" })).json()) as { comoComputadora: { id: string } | null; comoCelular: unknown };
    expect(compu.comoComputadora?.id).toBe("p1");
    expect(compu.comoCelular).toBeNull();
    const celular = (await (await pedir(app, "GET", "/puestos/mio", { rol: "mostrador" })).json()) as { comoComputadora: unknown; comoCelular: { id: string } | null };
    expect(celular.comoCelular?.id).toBe("p1");
    // El vínculo es de los dispositivos (decisión 73): no mira si la otra sesión sigue abierta.
    expect(base.actual.sqlDe(/FROM puesto p\s+WHERE p\.vinculado_en IS NOT NULL/)[0]!.sql).not.toMatch(/revocada_en/);
  });

  it("al volver a entrar en un dispositivo vinculado, el vínculo dormido pasa a la sesión nueva del mismo usuario", async () => {
    await pedir(app, "GET", "/puestos/mio?dispositivo=celular-de-ana-0001", { rol: "mostrador" });
    expect(base.actual.sqlDe(/UPDATE sesion SET dispositivo_id = /)[0]!.params).toEqual(["celular-de-ana-0001", "sesion-mostrador", "celular-de-ana-0001"]);
    const comoCompu = base.actual.sqlDe(/UPDATE puesto SET sesion_id = \$1 WHERE usuario_id = \$2 AND compu_dispositivo = \$3/)[0]!;
    const comoCelular = base.actual.sqlDe(/UPDATE puesto SET celular_sesion_id = \$1 WHERE usuario_id = \$2 AND celular_dispositivo = \$3/)[0]!;
    // Solo los vínculos de ese usuario y de ese dispositivo: a otra persona que entre ahí no se le aplican.
    expect(comoCompu.params[0]).toBe("sesion-mostrador");
    expect(comoCompu.params[2]).toBe("celular-de-ana-0001");
    expect(comoCelular.params[1]).toBe(comoCompu.params[1]);
    // Sin identificador, o con uno que no lo parece, no se toca nada.
    const antes = base.actual.sqlDe(/UPDATE puesto SET sesion_id = \$1/).length;
    await pedir(app, "GET", "/puestos/mio?dispositivo=x", { rol: "mostrador" });
    expect(base.actual.sqlDe(/UPDATE puesto SET sesion_id = \$1/)).toHaveLength(antes);
  });

  it("salir no corta el vínculo; que un administrador cierre a distancia la sesión de un dispositivo, sí", async () => {
    expect((await pedir(app, "DELETE", "/sesiones/actual", { rol: "mostrador" })).status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE puesto SET expira_en = now\(\)/)).toHaveLength(0);
    expect((await pedir(app, "DELETE", "/sesiones/sesion-mostrador", { rol: "soloVende" })).status).toBe(403);
    expect((await pedir(app, "DELETE", "/sesiones/sesion-mostrador", { rol: "admin" })).status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE puesto SET expira_en = now\(\) WHERE vinculado_en IS NOT NULL AND expira_en > now\(\) AND \(sesion_id = \$1 OR celular_sesion_id = \$2\)/)[0]!.params).toEqual(["sesion-mostrador", "sesion-mostrador"]);
  });

  it("los días que dura el vínculo se configuran: los ve cualquiera y los cambia quien administra sesiones", async () => {
    expect(await (await pedir(app, "GET", "/puestos/configuracion", { rol: "mostrador" })).json()).toEqual({ dias: 30 });
    expect((await pedir(app, "PUT", "/puestos/configuracion", { rol: "soloVende", cuerpo: { dias: 10 } })).status).toBe(403);
    expect((await pedir(app, "PUT", "/puestos/configuracion", { rol: "admin", cuerpo: { dias: 0 } })).status).toBe(400);
    expect((await pedir(app, "PUT", "/puestos/configuracion", { rol: "admin", cuerpo: { dias: 400 } })).status).toBe(400);
    expect(await (await pedir(app, "PUT", "/puestos/configuracion", { rol: "admin", cuerpo: { dias: 10 } })).json()).toEqual({ dias: 10 });
    expect(base.actual.sqlDe(/INSERT INTO configuracion/)[0]!.params).toEqual(["vinculo.dias", "10"]);
    // Vincular usa los días configurados.
    base.actual.programar(/SELECT clave, valor FROM configuracion/, { rows: [{ clave: "vinculo.dias", valor: "10" }] });
    base.actual.programar(/UPDATE puesto SET vinculado_en = now\(\)/, { rows: [{ id: "p2", nombre: null, sesion_id: "sesion-admin", expira_en: "2026-10-23T00:00:00Z" }] });
    const r = await pedir(app, "POST", "/puestos/codigo-del-qr/vincular", { rol: "admin", cuerpo: { dispositivo_id: "celular-de-ana-0001" } });
    expect(await r.json()).toMatchObject({ id: "p2", dias: 10 });
    expect(base.actual.sqlDe(/UPDATE puesto p SET usuario_id = a\.usuario_id/)[0]!.params).toEqual(["p2"]);
  });

  it("leer el código de Vender empareja por 30 días y suelta el emparejamiento anterior de cualquiera de los dos", async () => {
    base.actual.programar(/UPDATE puesto SET vinculado_en = now\(\)/, { rows: [{ id: "p2", nombre: "computadora del mostrador", sesion_id: "sesion-admin", expira_en: "2026-11-11T00:00:00Z" }] });
    const r = await pedir(app, "POST", "/puestos/codigo-del-qr/vincular", { rol: "mostrador" });
    expect(await r.json()).toMatchObject({ id: "p2", dias: 30, expira_en: "2026-11-11T00:00:00Z" });
    expect(base.actual.sqlDe(/UPDATE puesto SET vinculado_en = now\(\)/)[0]!.params[1]).toBe("30");
    expect(base.actual.sqlDe(/UPDATE puesto SET expira_en = now\(\) WHERE vinculado_en IS NOT NULL/)[0]!.params).toEqual(["sesion-admin", "sesion-mostrador", "p2"]);
  });

  it("cualquiera de los dos lo suelta", async () => {
    base.actual.programar(/UPDATE puesto SET expira_en = now\(\) WHERE id = \$1/, { rowCount: 1 });
    expect((await pedir(app, "DELETE", "/puestos/p1", { rol: "mostrador" })).status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE puesto SET expira_en = now\(\) WHERE id = \$1/)[0]!.params).toEqual(["p1", "sesion-mostrador", "sesion-mostrador"]);
    expect(JSON.stringify(base.actual.sqlDe(/insert into "evento"/).at(-1)!.params)).toContain("puesto.desvinculado");
  });

  // Decisión 60: el espejo.
  it("solo se emparejan dos sesiones del mismo usuario", async () => {
    base.actual.programar(/SELECT s\.usuario_id FROM puesto p JOIN sesion s/, { rows: [{ usuario_id: "u-admin" }] });
    const r = await pedir(app, "POST", "/puestos/codigo-del-qr/vincular", { rol: "mostrador" });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: string }).error).toContain("donde entraste vos");
    expect(base.actual.sqlDe(/UPDATE puesto SET vinculado_en = now\(\)/)).toHaveLength(0);
  });
});
