import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

const VENDEDOR = "00000000-0000-4000-8000-0000000000a1";
const ADMINISTRADOR = "00000000-0000-4000-8000-0000000000a4";
const OTRO = "0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11";
// Quiénes pueden administrar después del cambio (lo que contesta la base a quedaQuienAdministre).
const administran = (...ids: string[]) => base.actual.programar(/FROM usuario u\s+WHERE u\.activo AND \(SELECT count\(DISTINCT rp\.permiso\)/, { rows: ids.map((id) => ({ id })) });
const existenLosRoles = () => base.actual.programar(/SELECT id FROM rol WHERE id = ANY/, (p) => ({ rows: (p[0] as string[]).map((id) => ({ id })) }));

// Usuarios autorizados y sus roles (RF-70, RF-72, RF-75).
describe("usuarios", () => {
  beforeEach(() => { base.actual = baseFalsa(); existenLosRoles(); administran("u-admin", "u-dueño"); base.actual.programar(/UPDATE usuario SET activo/, { rowCount: 1 }); });

  it("solo con el permiso de administrar usuarios", async () => {
    expect((await pedir(app, "GET", "/usuarios", { rol: null })).status).toBe(401);
    const r = await pedir(app, "GET", "/usuarios", { rol: "mostrador" });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: string }).error).toContain("Administrar usuarios");
    expect((await pedir(app, "GET", "/usuarios", { rol: "admin" })).status).toBe(200);
  });

  it("se autoriza a alguien con su correo y uno o más roles", async () => {
    const r = await pedir(app, "POST", "/usuarios", { rol: "admin", cuerpo: { email: " Nueva@Gmail.com ", nombre: "Nueva", roles: [VENDEDOR, ADMINISTRADOR] } });
    expect(r.status).toBe(201);
    expect(base.actual.sqlDe(/INSERT INTO usuario \(/)[0]!.params.slice(1)).toEqual(["nueva@gmail.com", "Nueva"]);
    expect(base.actual.sqlDe(/INSERT INTO usuario_rol/)[0]!.params[1]).toEqual([VENDEDOR, ADMINISTRADOR]);
    expect(base.actual.sqlDe(/INSERT INTO evento/)[0]!.params[1]).toBe("usuario.creado");
  });

  it("sin correo válido, sin nombre, sin ningún rol o con un rol que no existe, no se guarda", async () => {
    const casos: [unknown, string][] = [
      [{ email: "sin-arroba", nombre: "X", roles: [VENDEDOR] }, "correo válido"],
      [{ email: "a@b.c", nombre: " ", roles: [VENDEDOR] }, "nombre"],
      [{ email: "a@b.c", nombre: "X", roles: [] }, "al menos un rol"],
      [{ email: "a@b.c", nombre: "X" }, "al menos un rol"],
      [{ email: "a@b.c", nombre: "X", roles: ["no-es-un-rol"] }, "no existe"],
    ];
    for (const [cuerpo, mensaje] of casos) {
      const r = await pedir(app, "POST", "/usuarios", { rol: "admin", cuerpo });
      expect(r.status, mensaje).toBe(400);
      expect(((await r.json()) as { error: string }).error).toContain(mensaje);
    }
    base.actual.programar(/SELECT id FROM rol WHERE id = ANY/, { rows: [] });
    expect((await pedir(app, "POST", "/usuarios", { rol: "admin", cuerpo: { email: "a@b.c", nombre: "X", roles: [OTRO] } })).status).toBe(400);
    expect(base.actual.sqlDe(/INSERT INTO usuario \(/)).toHaveLength(0);
  });

  it("cambiar los roles de alguien reemplaza los que tenía", async () => {
    const r = await pedir(app, "PATCH", `/usuarios/${OTRO}`, { rol: "admin", cuerpo: { roles: [VENDEDOR] } });
    expect(r.status).toBe(204);
    expect(base.actual.sqlDe(/DELETE FROM usuario_rol WHERE usuario_id/)[0]!.params).toEqual([OTRO]);
    expect(base.actual.sqlDe(/INSERT INTO usuario_rol/)[0]!.params).toEqual([OTRO, [VENDEDOR]]);
    expect(base.actual.sqlDe(/^COMMIT/)).toHaveLength(1);
  });

  it("nunca queda el sistema sin quien administre: ni sacando el rol ni desactivando", async () => {
    administran(); // después del cambio no quedaría nadie
    const r = await pedir(app, "PATCH", `/usuarios/${OTRO}`, { rol: "admin", cuerpo: { roles: [VENDEDOR] } });
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toContain("sin nadie que pueda administrar");
    expect((await pedir(app, "PATCH", `/usuarios/${OTRO}`, { rol: "admin", cuerpo: { activo: false } })).status).toBe(409);
    expect(base.actual.sqlDe(/^COMMIT/)).toHaveLength(0);
    expect(base.actual.sqlDe(/^ROLLBACK/).length).toBe(2);
  });

  it("nadie se desactiva ni se quita a sí mismo los permisos de administrar", async () => {
    expect((await pedir(app, "PATCH", "/usuarios/u-admin", { rol: "admin", cuerpo: { activo: false } })).status).toBe(400);
    administran("u-dueño"); // después del cambio, quien lo pide ya no administraría
    const r = await pedir(app, "PATCH", "/usuarios/u-admin", { rol: "admin", cuerpo: { roles: [VENDEDOR] } });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toContain("a vos mismo");
    expect(base.actual.sqlDe(/^COMMIT/)).toHaveLength(0);
  });

  it("desactivar a alguien le cierra las sesiones; un usuario que no existe, 404", async () => {
    expect((await pedir(app, "PATCH", `/usuarios/${OTRO}`, { rol: "admin", cuerpo: { activo: false } })).status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE sesion SET revocada_en/)[0]!.params).toEqual([OTRO]);
    base.actual.programar(/UPDATE usuario SET activo/, { rowCount: 0 });
    expect((await pedir(app, "PATCH", `/usuarios/${OTRO}`, { rol: "admin", cuerpo: { nombre: "X" } })).status).toBe(404);
  });
});
