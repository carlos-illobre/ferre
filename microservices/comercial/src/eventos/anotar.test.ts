import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { anotarEvento, contenidoQueEntra } = await import("./anotar.js");
const { base: db } = await import("../persistencia/conexion.js");
const { comoPersona } = await import("../autenticacion.js");

// El evento sale con quién lo hizo, por su nombre de ese momento, y con sus palabras (specs/027).
describe("anotar un evento", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("029-E10: con el nombre de quien hace el pedido, el que trae de la puerta", async () => {
    await comoPersona({ id: "u-ana", nombre: "Ana", permisos: [] }, () => anotarEvento(db, { tipo: "venta.anulada", usuarioId: "u-ana", dispositivoId: "celular-1", contenido: { id: "v1", motivo: "error" } }));
    expect(base.actual.eventos()).toEqual([expect.objectContaining({
      tipo: "venta.anulada", quien: { id: "u-ana", nombre: "Ana" }, dispositivo: "celular-1",
      titulo: "Venta anulada", detalle: "Motivo: error", grupo: "Ventas", importancia: "anulacion", servicio: "comercial",
    })]);
  });

  it("sin quién, lo hizo el sistema; y una persona que no está se nombra igual", async () => {
    await anotarEvento(db, { tipo: "venta.pagada", usuarioId: null, contenido: { id: "v1" } });
    await anotarEvento(db, { tipo: "venta.pagada", usuarioId: "u-borrado", contenido: { id: "v2" } });
    expect(base.actual.eventos().map((e) => e.quien)).toEqual([null, { id: "u-borrado", nombre: "un usuario" }]);
  });

  it("una acción grande no falla por el tamaño: las listas quedan como cuántas eran, y lo largo se corta", async () => {
    const renglones = Array.from({ length: 200 }, (_, i) => ({ descripcion: `Tornillo número ${i} de prueba`, cantidad: 1, precio_unitario: 100 }));
    await anotarEvento(db, { tipo: "venta.corregida", usuarioId: "u-ana", contenido: { id: "v1", antes: { total: 1, items: renglones }, despues: { total: 2, items: renglones } } });
    expect(base.actual.eventos()[0]!.contenido).toEqual({ id: "v1", antes: { total: 1, items: "200 elementos" }, despues: { total: 2, items: "200 elementos" }, recortado: true });
    expect(contenidoQueEntra({ id: "v1", motivo: "x".repeat(20_000) })).toEqual({ id: "v1", motivo: `${"x".repeat(499)}…`, recortado: true });
    const muchos = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, { texto: "y".repeat(400) }]));
    expect(contenidoQueEntra({ id: "v1", total: 12, ...muchos })).toEqual({ id: "v1", total: 12, recortado: true });
    expect(contenidoQueEntra({ id: "v1" })).toEqual({ id: "v1" });
  });

  it("un nombre o un dispositivo más largos que el contrato se cortan: la acción no falla", async () => {
    await comoPersona({ id: "u-largo", nombre: "N".repeat(200), permisos: [] }, () => anotarEvento(db, { tipo: "venta.anulada", usuarioId: "u-largo", dispositivoId: "d".repeat(200), contenido: { id: "v1", motivo: "m".repeat(400) } }));
    const [e] = base.actual.eventos();
    expect([e!.quien!.nombre.length, e!.dispositivo!.length, e!.detalle!.length]).toEqual([120, 120, 300]);
  });
});
