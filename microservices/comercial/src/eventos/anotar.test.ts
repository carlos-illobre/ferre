import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { anotarEvento } = await import("./anotar.js");
const { base: db } = await import("../persistencia/conexion.js");

// El evento sale con quién lo hizo, por su nombre de ese momento, y con sus palabras (specs/027).
describe("anotar un evento", () => {
  beforeEach(() => {
    base.actual = baseFalsa();
    base.actual.programar(/from "usuario"/, (params) => ({ rows: [{ id: "u-ana", nombre: "Ana" }, { id: "u-beto", nombre: "Beto" }].filter((u) => params.includes(u.id)) }));
  });

  it("con el nombre de quien lo hizo y de la persona que nombra el detalle", async () => {
    await anotarEvento(db, { tipo: "usuario.modificado", usuarioId: "u-ana", dispositivoId: "celular-1", contenido: { id: "u-beto", cambios: { activo: false } } });
    expect(base.actual.eventos()).toEqual([expect.objectContaining({
      tipo: "usuario.modificado", quien: { id: "u-ana", nombre: "Ana" }, dispositivo: "celular-1",
      titulo: "Usuario desactivado", detalle: "Desactivó a Beto", grupo: "Usuarios", importancia: "normal", servicio: "comercial",
    })]);
  });

  it("sin quién, lo hizo el sistema; y una persona que no está se nombra igual", async () => {
    await anotarEvento(db, { tipo: "venta.pagada", usuarioId: null, contenido: { id: "v1" } });
    await anotarEvento(db, { tipo: "venta.pagada", usuarioId: "u-borrado", contenido: { id: "v2" } });
    expect(base.actual.eventos().map((e) => e.quien)).toEqual([null, { id: "u-borrado", nombre: "un usuario" }]);
  });
});
