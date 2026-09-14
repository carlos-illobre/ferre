import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

// Rol admin: como el dueño, salvo que no crea, cambia ni desactiva dueños ni da ese rol.
describe("usuarios y roles", () => {
  beforeEach(() => {
    base.actual = baseFalsa();
    base.actual.programar(/UPDATE usuario SET/, { rowCount: 1 });
    base.actual.programar(/SELECT rol FROM usuario WHERE id = \$1/, (p) => ({ rows: [{ rol: p[0] === "u-dueño" ? "dueño" : "mostrador" }] }));
  });

  it("el mostrador no administra", async () => {
    expect((await pedir(app, "GET", "/usuarios", { rol: "mostrador" })).status).toBe(403);
  });

  it("el admin crea mostradores y admins, pero no dueños", async () => {
    expect((await pedir(app, "POST", "/usuarios", { rol: "admin", cuerpo: { email: "x@y.z", nombre: "X", rol: "admin" } })).status).toBe(201);
    expect((await pedir(app, "POST", "/usuarios", { rol: "admin", cuerpo: { email: "x@y.z", nombre: "X", rol: "dueño" } })).status).toBe(403);
    expect((await pedir(app, "POST", "/usuarios", { rol: "dueño", cuerpo: { email: "x@y.z", nombre: "X", rol: "dueño" } })).status).toBe(201);
    expect((await pedir(app, "POST", "/usuarios", { rol: "dueño", cuerpo: { email: "sin-arroba", nombre: "X", rol: "mostrador" } })).status).toBe(400);
  });

  it("el admin no toca a un dueño ni da ese rol; nadie se desactiva a sí mismo", async () => {
    expect((await pedir(app, "PATCH", "/usuarios/u-dueño", { rol: "admin", cuerpo: { activo: false } })).status).toBe(403);
    expect((await pedir(app, "PATCH", "/usuarios/u-mostrador", { rol: "admin", cuerpo: { rol: "dueño" } })).status).toBe(403);
    expect((await pedir(app, "PATCH", "/usuarios/u-mostrador", { rol: "admin", cuerpo: { rol: "admin" } })).status).toBe(204);
    expect((await pedir(app, "PATCH", "/usuarios/u-admin", { rol: "admin", cuerpo: { activo: false } })).status).toBe(400);
    expect((await pedir(app, "PATCH", "/usuarios/u-dueño", { rol: "dueño", cuerpo: { rol: "mostrador" } })).status).toBe(400);
  });

  it("desactivar a alguien le cierra las sesiones", async () => {
    await pedir(app, "PATCH", "/usuarios/u-mostrador", { rol: "dueño", cuerpo: { activo: false } });
    expect(base.actual.sqlDe(/UPDATE sesion SET revocada_en/)).toHaveLength(1);
  });
});
