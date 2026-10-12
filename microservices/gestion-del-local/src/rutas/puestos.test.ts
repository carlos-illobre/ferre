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

  // Decisión 60: el espejo.
  it("solo se emparejan dos sesiones del mismo usuario", async () => {
    base.actual.programar(/SELECT s\.usuario_id FROM puesto p JOIN sesion s/, { rows: [{ usuario_id: "u-admin" }] });
    const r = await pedir(app, "POST", "/puestos/codigo-del-qr/vincular", { rol: "mostrador" });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: string }).error).toContain("donde entraste vos");
    expect(base.actual.sqlDe(/UPDATE puesto SET vinculado_en = now\(\)/)).toHaveLength(0);
  });

  it("cada lado avisa sus cambios y el otro los recibe; el que llega después toma lo último; quien no es del emparejamiento, nada", async () => {
    const delPuesto = (compu: string, celular: string) => base.actual.programar(/SELECT sesion_id, celular_sesion_id FROM puesto WHERE id = \$1/, (params) => ({ rows: params[1] === compu || params[1] === celular ? [{ sesion_id: compu, celular_sesion_id: celular }] : [] }));
    delPuesto("sesion-admin", "sesion-mostrador");
    const avisar = (rol: "admin" | "mostrador" | "soloVende", tipo: string, datos: unknown) => pedir(app, "POST", "/puestos/espejo-1/espejo", { rol, cuerpo: { tipo, datos } });
    expect((await avisar("soloVende", "ir", "vender")).status).toBe(404);
    expect((await pedir(app, "GET", "/puestos/espejo-1/espejo", { rol: "soloVende" })).status).toBe(404);
    expect((await avisar("admin", "cualquiera", 1)).status).toBe(400);
    // La computadora avisa a dónde fue y cómo está la venta, antes de que el celular llegue.
    expect((await avisar("admin", "ir", "vender")).status).toBe(204);
    expect((await avisar("admin", "venta", { items: [{ productoId: "p1", cantidad: 2 }], medio: "efectivo", clienteId: "" })).status).toBe(204);
    expect((await avisar("admin", "ingreso", { proveedorId: "prov1", renglones: [] })).status).toBe(204);
    expect((await avisar("admin", "aviso", "x".repeat(400))).status).toBe(413);
    // El celular se conecta: recibe cómo está todo y quién está.
    const flujo = await pedir(app, "GET", "/puestos/espejo-1/espejo", { rol: "mostrador" });
    const lector = flujo.body!.getReader();
    const leer = async () => new TextDecoder().decode((await lector.read()).value);
    const primero = await leer();
    expect(primero).toContain("event: estado");
    const estado = JSON.parse(primero.split("data: ")[1]!.split("\n")[0]!) as { lado: string; parte: string; docs: { venta: { items: unknown[] }; ingreso: { proveedorId: string } }; pausado: boolean; presentes: { computadora: boolean; celular: boolean } };
    expect(estado).toMatchObject({ lado: "celular", parte: "vender", pausado: false, presentes: { computadora: false, celular: true } });
    expect(estado.docs.venta.items).toHaveLength(1);
    expect(estado.docs.ingreso.proveedorId).toBe("prov1"); // cada trabajo en curso se guarda aparte
    // Lo que la computadora cambia después le llega; la pausa les llega a los dos.
    let recibido = "";
    const hasta = async (texto: string) => { for (let i = 0; i < 6 && !recibido.includes(texto); i++) recibido += await leer(); return recibido; };
    await avisar("admin", "ir", "deposito/ingreso");
    expect(await hasta("deposito/ingreso")).toContain("event: ir");
    // Un aviso de algo que terminó le llega al otro y no queda guardado.
    await avisar("admin", "aviso", "Venta de $3.000 cobrada");
    expect(await hasta("event: aviso")).toContain("Venta de $3.000 cobrada");
    await avisar("mostrador", "pausa", true);
    expect(await hasta("event: pausa")).toContain("data: true");
    await lector.cancel();
  });
});
