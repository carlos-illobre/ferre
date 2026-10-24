import { beforeAll, describe, expect, it } from "vitest";
import { migrar } from "./migrar.js";
import { almacenEnPostgres } from "./procesos.js";
import { baseDePrueba } from "./pruebas/base.js";

const autor = { id: "u1", nombre: "Carlos" };
const version = (pasos: number) => ({ bpmn: `<bpmn pasos="${pasos}"/>`, pasos, autor });

// Los datos de Procesos en Postgres (011): revisión, borrador, vigente e historial.
describe("los procesos en Postgres", () => {
  const base = baseDePrueba();
  const almacen = almacenEnPostgres(base);
  beforeAll(() => migrar(base));

  it("011-E17: se crea con su borrador y se encuentra por nombre, sin importar mayúsculas", async () => {
    const id = await almacen.crear("Venta en el mostrador", version(3));
    expect(await almacen.conNombre("VENTA en el mostrador")).toBe(id);
    expect(await almacen.conNombre("Otro")).toBeNull();
    expect(await almacen.leer(id)).toMatchObject({ nombre: "Venta en el mostrador", revision: 1, vigente: null, borrador: { pasos: 3, hechaPor: "Carlos" } });
    expect(await almacen.leer(crypto.randomUUID())).toBeNull();
  });

  it("011-E22 011-E41: guardar sube la revisión; con una revisión vieja no cambia nada", async () => {
    const id = await almacen.crear("Compra", version(1));
    expect(await almacen.guardarBorrador(id, 1, version(2))).toBe(2);
    expect(await almacen.guardarBorrador(id, 1, version(9))).toBeNull();
    expect((await almacen.leer(id))!.borrador!.pasos).toBe(2);
  });

  it("011-E20: marcar vigente pasa el borrador a vigente y el vigente a anterior; un borrador nuevo se crea", async () => {
    const id = await almacen.crear("Ingreso", version(3));
    expect(await almacen.marcarVigente(id, 1)).toBe(2);
    expect(await almacen.marcarVigente(id, 1)).toBeNull();
    expect(await almacen.guardarBorrador(id, 2, version(5))).toBe(3);
    expect(await almacen.leer(id)).toMatchObject({ vigente: { pasos: 3 }, borrador: { pasos: 5 } });
    expect(await almacen.marcarVigente(id, 3)).toBe(4);
    expect((await almacen.historial(id)).map((v) => [v.estado, v.pasos])).toEqual([["vigente", 5], ["anterior", 3]]);
    expect(await almacen.guardarBorrador(id, 4, version(1))).toBe(5);
    expect(await almacen.descartarBorrador(id, 5)).toBe(6);
    expect(await almacen.descartarBorrador(id, 5)).toBeNull();
    expect((await almacen.leer(id))!.borrador).toBeNull();
  });

  it("se cambia el nombre y se borra todo junto; lo que no existe dice que no", async () => {
    const id = await almacen.crear("Viejo", version(1));
    expect(await almacen.renombrar(id, "Nuevo")).toBe(true);
    expect(await almacen.renombrar(crypto.randomUUID(), "x")).toBe(false);
    expect((await almacen.listar()).find((p) => p.id === id)!.nombre).toBe("Nuevo");
    expect(await almacen.borrar(id)).toBe(true);
    expect(await almacen.borrar(id)).toBe(false);
    expect(await almacen.historial(id)).toEqual([]);
  });
});
