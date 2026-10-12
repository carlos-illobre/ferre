import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir, usuarios } from "../pruebas/base-falsa.js";
import { hashear } from "../sesiones.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

// Entrar a la computadora con el celular (RF-76, decisión 57): volvió el 2026-10-12, sin paso
// de confirmar. La computadora pide un código, el celular lo aprueba y la computadora retira su sesión.
describe("entrar a la computadora con el celular", () => {
  beforeEach(() => { base.actual = baseFalsa(); });
  const pedirCodigo = async () => (await (await pedir(app, "POST", "/sesiones/vinculaciones", { rol: null, cuerpo: { dispositivo: "computadora · Chrome" } })).json()) as { id: string; codigo: string; clave: string; expiraEnSegundos: number };

  it("la computadora pide un código sin sesión: recibe el código para el QR y una clave aparte, y se guardan hasheados", async () => {
    const r = await pedir(app, "POST", "/sesiones/vinculaciones", { rol: null, cuerpo: { dispositivo: "computadora · Chrome" } });
    expect(r.status).toBe(201);
    const { id, codigo, clave, expiraEnSegundos } = (await r.json()) as Awaited<ReturnType<typeof pedirCodigo>>;
    expect(expiraEnSegundos).toBe(300);
    expect(codigo).not.toBe(clave);
    const guardado = base.actual.sqlDe(/INSERT INTO vinculacion/)[0]!.params;
    expect(guardado.slice(0, 4)).toEqual([id, hashear(codigo), hashear(clave), "computadora · Chrome"]);
    expect(JSON.stringify(guardado)).not.toContain(codigo);
  });

  it("aprobar pide sesión; un código vencido o ya usado dice que hay que leer el que se muestra ahora", async () => {
    expect((await pedir(app, "POST", "/sesiones/vinculaciones/aprobar", { rol: null, cuerpo: { codigo: "x" } })).status).toBe(401);
    expect((await pedir(app, "POST", "/sesiones/vinculaciones/aprobar", { rol: "soloVende", cuerpo: {} })).status).toBe(400);
    const vencido = await pedir(app, "POST", "/sesiones/vinculaciones/aprobar", { rol: "soloVende", cuerpo: { codigo: "viejo" } });
    expect(vencido.status).toBe(410);
    expect(((await vencido.json()) as { error: string }).error).toContain("Leé el que la computadora muestra ahora");
    // Solo se aprueba el que no fue aprobado y no venció.
    const sql = base.actual.sqlDe(/UPDATE vinculacion SET aprobada_en/)[0]!;
    expect(sql.sql).toMatch(/aprobada_en IS NULL AND expira_en > now\(\)/);
    expect(sql.params).toEqual(["u-solo-vende", hashear("viejo")]);
    base.actual.programar(/UPDATE vinculacion SET aprobada_en/, { rows: [{ id: "v1", dispositivo: "computadora · Chrome" }] });
    expect((await pedir(app, "POST", "/sesiones/vinculaciones/aprobar", { rol: "soloVende", cuerpo: { codigo: "bueno" } })).status).toBe(200);
  });

  it("la computadora retira su sesión una sola vez, con el usuario que aprobó, y queda registrado que fue desde el celular", async () => {
    expect((await pedir(app, "POST", "/sesiones/vinculaciones/v1/estado", { rol: null, cuerpo: {} })).status).toBe(400);
    const pendiente = await pedir(app, "POST", "/sesiones/vinculaciones/v1/estado", { rol: null, cuerpo: { clave: "la-clave" } });
    expect(await pendiente.json()).toEqual({ estado: "vencida" }); // no existe o venció
    base.actual.programar(/AS vigente FROM vinculacion/, { rows: [{ vigente: true }] });
    expect(await (await pedir(app, "POST", "/sesiones/vinculaciones/v1/estado", { rol: null, cuerpo: { clave: "la-clave" } })).json()).toEqual({ estado: "pendiente" });

    base.actual.programar(/UPDATE vinculacion SET retirada_en/, { rows: [{ aprobada_por: "u-cajero", dispositivo: "computadora · Chrome" }] });
    base.actual.programar(/FROM usuario u WHERE u\.id = \$1 AND u\.activo/, { rows: [{ ...usuarios.cajero }] });
    const r = await pedir(app, "POST", "/sesiones/vinculaciones/v1/estado", { rol: null, cuerpo: { clave: "la-clave" } });
    const cuerpo = (await r.json()) as { estado: string; token: string; usuario: { nombre: string; permisos: string[] } };
    expect(cuerpo.estado).toBe("aprobada");
    expect(cuerpo.token.length).toBeGreaterThan(30);
    expect(cuerpo.usuario.nombre).toBe("Cajero");
    // Se retira con la clave, no con el código del QR, y solo si nadie la retiró antes.
    const retiro = base.actual.sqlDe(/UPDATE vinculacion SET retirada_en/).at(-1)!;
    expect(retiro.sql).toMatch(/clave_hash = \$2 AND aprobada_en IS NOT NULL AND retirada_en IS NULL/);
    expect(retiro.params).toEqual(["v1", hashear("la-clave")]);
    expect(base.actual.sqlDe(/INSERT INTO sesion/).at(-1)!.params[1]).toBe("u-cajero");
    const evento = base.actual.sqlDe(/INSERT INTO evento/).at(-1)!.params;
    expect(JSON.stringify(evento)).toContain("sesion.iniciada");
    expect(JSON.stringify(evento)).toContain("celular");
  });

  it("si quien aprobó fue desactivado antes de que la computadora retire, no entra", async () => {
    base.actual.programar(/UPDATE vinculacion SET retirada_en/, { rows: [{ aprobada_por: "u-baja", dispositivo: null }] });
    const r = await pedir(app, "POST", "/sesiones/vinculaciones/v1/estado", { rol: null, cuerpo: { clave: "la-clave" } });
    expect(await r.json()).toEqual({ estado: "vencida" });
    expect(base.actual.sqlDe(/INSERT INTO sesion/)).toHaveLength(0);
  });
});
