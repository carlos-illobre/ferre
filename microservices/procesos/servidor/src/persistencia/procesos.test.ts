import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearBandeja } from "./auditoria.js";
import { migrar } from "./migrar.js";
import { almacenEnPostgres } from "./procesos.js";
import { baseDePrueba } from "./pruebas/base.js";

const autor = { id: "u1", nombre: "Carlos" };
const version = (pasos: number) => ({ bpmn: `<bpmn pasos="${pasos}"/>`, pasos, autor });

// Los datos de Procesos en Postgres (011): revisión, borrador, vigente e historial.
describe("los procesos en Postgres", () => {
  const base = baseDePrueba();
  const bandeja = crearBandeja(base, { conexion: process.env.BASE_DE_PROCESOS!, auditoria: "http://auditoria.prueba", token: "t" });
  const almacen = almacenEnPostgres(base, bandeja.anotar);
  beforeAll(async () => { await migrar(base); await bandeja.iniciar(); });
  afterAll(() => bandeja.parar());

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
    const anota = (tipo: string) => ({ tipo, autor, titulo: `Título de ${tipo}`, grupo: "Procesos", importancia: "normal" as const });
    // Lo que queda en la bandeja de auditoría, para mandar (specs/027).
    const eventos = async (id: string) => (await sql<{ evento: Record<string, unknown> }>`SELECT evento FROM auditoria_bandeja WHERE evento->'contenido'->>'id' = ${id} ORDER BY anotado_en`.execute(base)).rows
      .map(({ evento: e }) => ({ tipo: e.tipo, quien: e.quien, titulo: e.titulo, detalle: e.detalle, referencias: e.referencias, contenido: e.contenido }));
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
      { tipo: "proceso.creado", quien: autor, titulo: "Título de proceso.creado", detalle: "Cobro", referencias: [{ cosa: "proceso", id }], contenido: { id, nombre: "Cobro" } },
      { tipo: "proceso.renombrado", quien: autor, titulo: "Título de proceso.renombrado", detalle: "Cobro en caja", referencias: [{ cosa: "proceso", id }], contenido: { id, nombre: "Cobro en caja" } },
      { tipo: "proceso.borrador_cambiado", quien: autor, titulo: "Título de proceso.borrador_cambiado", detalle: "Cobro en caja", referencias: [{ cosa: "proceso", id }], contenido: { id, nombre: "Cobro en caja" } },
      { tipo: "proceso.vigente", quien: autor, titulo: "Título de proceso.vigente", detalle: "Cobro en caja", referencias: [{ cosa: "proceso", id }], contenido: { id, nombre: "Cobro en caja" } },
      { tipo: "proceso.borrador_descartado", quien: autor, titulo: "Título de proceso.borrador_descartado", detalle: "Cobro en caja", referencias: [{ cosa: "proceso", id }], contenido: { id, nombre: "Cobro en caja" } },
      { tipo: "proceso.borrado", quien: autor, titulo: "Título de proceso.borrado", detalle: "Cobro en caja", referencias: [{ cosa: "proceso", id }], contenido: { id, nombre: "Cobro en caja" } },
    ]);
  });
});
