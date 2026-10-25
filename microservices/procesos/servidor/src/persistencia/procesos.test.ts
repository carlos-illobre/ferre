import { sql } from "kysely";
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

  it("026-E10 026-E12: cada cambio anota su evento en la misma transacción, con el proceso; sin anotación o si no cambió, nada", async () => {
    const anota = (tipo: string) => ({ tipo, autor });
    const eventos = async (id: string) => (await base.selectFrom("procesos.evento").select(["tipo", "usuario_id", "usuario_nombre", "contenido"]).where(sql`contenido->>'id'`, "=", id).orderBy("fecha").execute());
    const id = await almacen.crear("Cobro", version(1), anota("proceso.creado"));
    expect(await almacen.renombrar(id, "Cobro en caja", anota("proceso.renombrado"))).toBe(true);
    expect(await almacen.guardarBorrador(id, 1, version(2), anota("proceso.borrador_cambiado"))).toBe(2);
    expect(await almacen.guardarBorrador(id, 1, version(3), anota("proceso.borrador_cambiado"))).toBeNull();
    expect(await almacen.marcarVigente(id, 2, anota("proceso.vigente"))).toBe(3);
    expect(await almacen.guardarBorrador(id, 3, version(4))).toBe(4);
    expect(await almacen.descartarBorrador(id, 4, anota("proceso.borrador_descartado"))).toBe(5);
    expect(await almacen.borrar(id, anota("proceso.borrado"))).toBe(true);
    expect(await almacen.borrar(id, anota("proceso.borrado"))).toBe(false);
    expect(await almacen.renombrar(id, "Otro", anota("proceso.renombrado"))).toBe(false);
    expect(await eventos(id)).toEqual([
      { tipo: "proceso.creado", usuario_id: "u1", usuario_nombre: "Carlos", contenido: { id, nombre: "Cobro" } },
      { tipo: "proceso.renombrado", usuario_id: "u1", usuario_nombre: "Carlos", contenido: { id, nombre: "Cobro en caja" } },
      { tipo: "proceso.borrador_cambiado", usuario_id: "u1", usuario_nombre: "Carlos", contenido: { id, nombre: "Cobro en caja" } },
      { tipo: "proceso.vigente", usuario_id: "u1", usuario_nombre: "Carlos", contenido: { id, nombre: "Cobro en caja" } },
      { tipo: "proceso.borrador_descartado", usuario_id: "u1", usuario_nombre: "Carlos", contenido: { id, nombre: "Cobro en caja" } },
      { tipo: "proceso.borrado", usuario_id: "u1", usuario_nombre: "Carlos", contenido: { id, nombre: "Cobro en caja" } },
    ]);
  });
});
