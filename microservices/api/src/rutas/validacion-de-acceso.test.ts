import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

const rechazo = async (r: Response) => [r.status, ((await r.json()) as { error: string }).error];

// Entrar y el vínculo: lo que llega mal se dice antes de tocar la base o a Google (decisión 89).
describe("lo que llega al entrar y al vincular", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("entrar con Google sin credencial, aprobar sin código y preguntar sin clave dicen qué falta", async () => {
    expect(await rechazo(await pedir(app, "POST", "/sesiones/google", { rol: null, cuerpo: {} }))).toEqual([400, "Falta la credencial de Google"]);
    expect(await rechazo(await pedir(app, "POST", "/sesiones/vinculaciones/aprobar", { cuerpo: { codigo: "" } }))).toEqual([400, "Falta el código"]);
    expect(await rechazo(await pedir(app, "POST", "/sesiones/vinculaciones/v1/estado", { rol: null, cuerpo: {} }))).toEqual([400, "Falta la clave"]);
  });

  it("los días del vínculo van de 1 a 365, enteros", async () => {
    for (const dias of [0, 366, 2.5, "30"]) {
      expect(await rechazo(await pedir(app, "PUT", "/puestos/configuracion", { cuerpo: { dias } }))).toEqual([400, "Los días tienen que ser un número entero entre 1 y 365"]);
    }
  });
});
