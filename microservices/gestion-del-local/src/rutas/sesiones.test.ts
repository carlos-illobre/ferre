import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

// Entrar leyendo un QR se quitó el 2026-10-09 (decisión del dueño): se entra con Google o
// con la huella. Estas rutas no tienen que volver sin que alguien lo decida.
describe("sesiones", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("ya no existe el login por QR", async () => {
    expect((await pedir(app, "POST", "/sesiones/vinculaciones", { cuerpo: { dispositivo: "laptop" } })).status).toBe(404);
    expect((await pedir(app, "POST", "/sesiones/vinculaciones/abc/aprobar", { rol: "mostrador" })).status).toBe(404);
  });
});
