import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "./pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("./pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("./persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("./app.js");

const conToken = (cabeceras: Record<string, string>) => ({ headers: { "X-Token-Servicio": process.env.TOKEN_SERVICIO!, ...cabeceras } });

// Quién llama lo dice la puerta, que le preguntó a Acceso (specs/029): Comercial no busca sesiones.
describe("la persona que llega de la puerta", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("029-E02: con quién es y sus permisos en las cabeceras, atiende; sin persona, 401", async () => {
    expect((await pedir(app, "GET", "/ventas", { rol: "cajero" })).status).toBe(200);
    const sin = await app.request("/ventas", conToken({}));
    expect([sin.status, await sin.json()]).toEqual([401, { error: "Hay que iniciar sesión" }]);
    // Un nombre mal codificado no es una persona.
    expect((await app.request("/ventas", conToken({ "X-Usuario-Id": "u1", "X-Usuario-Nombre": "%E0%A4%A", "X-Permisos": "ventas.ver" }))).status).toBe(401);
  });

  it("029-E02: los permisos son los de X-Permisos: sin el que hace falta, 403 diciendo cuál", async () => {
    const r = await app.request("/ventas", conToken({ "X-Usuario-Id": "u1", "X-Usuario-Nombre": "Ana", "X-Permisos": " negocio.ventas , ,ventas.registrar" }));
    expect(r.status).toBe(200);
    const no = await app.request("/ventas", conToken({ "X-Usuario-Id": "u1", "X-Permisos": "ventas.registrar" }));
    expect(no.status).toBe(403);
    expect(((await no.json()) as { error: string }).error).toContain("Ver las ventas del día");
  });

  it("029-E10: el evento de una acción va con el nombre que trae el pedido; sin nombre, con el identificador", async () => {
    await app.request("/clientes", { method: "POST", ...conToken({ "X-Usuario-Id": "u-ana", "X-Usuario-Nombre": encodeURIComponent("Ana Núñez"), "X-Permisos": "ventas.registrar", "Content-Type": "application/json" }), body: JSON.stringify({ nombre: "Juan" }) });
    await app.request("/clientes", { method: "POST", ...conToken({ "X-Usuario-Id": "u-beto", "X-Permisos": "ventas.registrar", "Content-Type": "application/json" }), body: JSON.stringify({ nombre: "Pedro" }) });
    expect(base.actual.eventos().map((e) => e.quien)).toEqual([{ id: "u-ana", nombre: "Ana Núñez" }, { id: "u-beto", nombre: "u-beto" }]);
  });
});
