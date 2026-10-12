import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

// El emparejamiento celular–computadora (decisión 58).
describe("emparejamiento", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("cada lado sabe con quién está emparejado, y solo cuenta si la otra sesión sigue abierta", async () => {
    expect((await pedir(app, "GET", "/puestos/mio", { rol: null })).status).toBe(401);
    expect(await (await pedir(app, "GET", "/puestos/mio", { rol: "mostrador" })).json()).toEqual({ comoComputadora: null, comoCelular: null });
    base.actual.programar(/FROM puesto p\s+JOIN sesion a/, { rows: [{ id: "p1", nombre: "computadora · Chrome", expira_en: "2026-11-11T00:00:00Z", sesion_id: "sesion-admin" }] });
    const compu = (await (await pedir(app, "GET", "/puestos/mio", { rol: "admin" })).json()) as { comoComputadora: { id: string } | null; comoCelular: unknown };
    expect(compu.comoComputadora?.id).toBe("p1");
    expect(compu.comoCelular).toBeNull();
    const celular = (await (await pedir(app, "GET", "/puestos/mio", { rol: "mostrador" })).json()) as { comoComputadora: unknown; comoCelular: { id: string } | null };
    expect(celular.comoCelular?.id).toBe("p1");
    expect(base.actual.sqlDe(/FROM puesto p\s+JOIN sesion a/)[0]!.sql).toMatch(/revocada_en IS NULL[\s\S]*revocada_en IS NULL/);
  });

  it("leer el código de Vender empareja por 30 días y suelta el emparejamiento anterior de cualquiera de los dos", async () => {
    base.actual.programar(/UPDATE puesto SET vinculado_en = now\(\)/, { rows: [{ id: "p2", nombre: "computadora del mostrador", sesion_id: "sesion-admin", expira_en: "2026-11-11T00:00:00Z" }] });
    const r = await pedir(app, "POST", "/puestos/codigo-del-qr/vincular", { rol: "mostrador" });
    expect(await r.json()).toMatchObject({ id: "p2", dias: 30, expira_en: "2026-11-11T00:00:00Z" });
    expect(base.actual.sqlDe(/UPDATE puesto SET vinculado_en = now\(\)/)[0]!.params[2]).toBe("30");
    expect(base.actual.sqlDe(/UPDATE puesto SET expira_en = now\(\) WHERE vinculado_en IS NOT NULL/)[0]!.params).toEqual(["sesion-admin", "sesion-mostrador", "p2"]);
  });

  it("cualquiera de los dos lo suelta; un código que la computadora no recibió a tiempo ya no se entrega", async () => {
    base.actual.programar(/UPDATE puesto SET expira_en = now\(\) WHERE id = \$1/, { rowCount: 1 });
    expect((await pedir(app, "DELETE", "/puestos/p1", { rol: "mostrador" })).status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE puesto SET expira_en = now\(\) WHERE id = \$1/)[0]!.params).toEqual(["p1", "sesion-mostrador"]);
    expect(JSON.stringify(base.actual.sqlDe(/INSERT INTO evento/).at(-1)!.params)).toContain("puesto.desvinculado");
    // Quien pide solo lo nuevo no recibe lo atrasado: se da por entregado.
    base.actual.programar(/SELECT id FROM puesto WHERE id = \$1 AND sesion_id = \$2/, { rows: [{ id: "p1" }] });
    const flujo = await pedir(app, "GET", "/puestos/p1/eventos?nuevos=1", { rol: "admin" });
    await flujo.body?.cancel();
    expect(base.actual.sqlDe(/UPDATE codigo_escaneado SET entregado_en = now\(\) WHERE puesto_id = \$1 AND entregado_en IS NULL/)[0]!.params).toEqual(["p1"]);
    expect(base.actual.sqlDe(/FROM codigo_escaneado WHERE puesto_id = \$1 AND entregado_en IS NULL AND creado_en/)).toHaveLength(0);
  });

  // Decisión 59: la computadora le pide a su celular que haga de lector.
  it("la computadora pide el lector y su celular emparejado se entera; al abrirlo, el pedido queda atendido", async () => {
    expect((await pedir(app, "POST", "/puestos/p1/lector", { rol: "admin" })).status).toBe(404); // sin celular emparejado
    base.actual.programar(/SELECT id FROM puesto WHERE id = \$1 AND sesion_id = \$2 AND vinculado_en IS NOT NULL/, { rows: [{ id: "p1" }] });
    base.actual.programar(/SELECT sesion_id FROM puesto WHERE celular_sesion_id/, (params) => ({ rows: params[0] === "sesion-mostrador" ? [{ sesion_id: "sesion-admin" }] : [] }));
    expect(await (await pedir(app, "GET", "/puestos/avisos", { rol: "mostrador" })).json()).toEqual({ lector: false, fotos: [] });
    expect((await pedir(app, "POST", "/puestos/p1/lector", { rol: "admin" })).status).toBe(204);
    expect(await (await pedir(app, "GET", "/puestos/avisos", { rol: "mostrador" })).json()).toEqual({ lector: true, fotos: [] });
    expect(((await (await pedir(app, "GET", "/puestos/avisos", { rol: "soloVende" })).json()) as { lector: boolean }).lector).toBe(false);
    expect((await pedir(app, "DELETE", "/puestos/avisos/lector", { rol: "mostrador" })).status).toBe(204);
    expect(((await (await pedir(app, "GET", "/puestos/avisos", { rol: "mostrador" })).json()) as { lector: boolean }).lector).toBe(false);
  });
});
