import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { beforeAll, describe, expect, it } from "vitest";
import type { EventoMandado } from "auditoria-kit";
import { cuantos, grupos, guardar, pagina, type Filtros } from "./eventos.js";
import { migrar } from "./migrar.js";
import { baseDePrueba } from "./pruebas/base.js";

const base = baseDePrueba();
beforeAll(() => migrar(base));
const sinFiltro: Filtros = { usuario: null, grupo: null, tipo: null, desde: null, hasta: null };
const evento = (cambios: Partial<EventoMandado> = {}): EventoMandado => ({
  id: randomUUID(), servicio: "comercial", tipo: "venta.registrada", fecha: "2026-10-25T12:00:00Z", titulo: "Venta cobrada", grupo: "Ventas", importancia: "normal", ...cambios,
});

// Los eventos de todos los servicios en la base de Auditoría (specs/027).
describe("los eventos en la base de Auditoría", () => {
  it("027-E07: guarda el lote; un id repetido no se guarda dos veces y cuenta como guardado", async () => {
    const uno = evento({ quien: { id: "u1", nombre: "Ana" }, dispositivo: "Celular", detalle: "$12.000", referencias: [{ cosa: "venta", id: "v1" }], contenido: { total: 12000 } });
    expect(await guardar(base, [uno, evento({ id: uno.id, titulo: "Otro" })])).toBe(2);
    expect(await guardar(base, [uno])).toBe(1);
    const [guardado] = await pagina(base, { ...sinFiltro, usuario: "u1" }, 10, 0);
    expect(guardado).toEqual({
      id: uno.id, servicio: "comercial", tipo: "venta.registrada", fecha: "2026-10-25T12:00:00.000Z", dispositivo: "Celular", quien: { id: "u1", nombre: "Ana" },
      titulo: "Venta cobrada", detalle: "$12.000", grupo: "Ventas", importancia: "normal", referencias: [{ cosa: "venta", id: "v1" }], contenido: { total: 12000 },
    });
    expect(await cuantos(base, { ...sinFiltro, usuario: "u1" })).toBe(1);
  });

  it("un evento sin quién, sin detalle ni dispositivo, se lee así", async () => {
    const solo = evento({ servicio: "solo-sistema" });
    await guardar(base, [solo]);
    const filtro = { ...sinFiltro, tipo: "venta.", desde: "2026-10-25T11:59:59Z", hasta: "2026-10-25T12:00:01Z" };
    expect((await pagina(base, filtro, 100, 0)).find((e) => e.id === solo.id)).toMatchObject({ quien: null, detalle: null, dispositivo: null, referencias: [], contenido: {} });
  });

  it("027-E02: filtra por persona, grupo, comienzo del tipo y fechas; de la más nueva a la más vieja, por páginas", async () => {
    await guardar(base, [
      evento({ quien: { id: "f1", nombre: "Bea" }, fecha: "2026-10-20T10:00:00Z", grupo: "Filtros", tipo: "proceso.creado" }),
      evento({ quien: { id: "f1", nombre: "Bea" }, fecha: "2026-10-21T10:00:00Z", grupo: "Filtros", tipo: "proceso.borrado" }),
      evento({ quien: { id: "f1", nombre: "Bea" }, fecha: "2026-10-22T10:00:00Z", grupo: "Filtros", tipo: "proceso_x.creado" }),
    ]);
    const deBea = { ...sinFiltro, usuario: "f1", grupo: "Filtros" };
    expect((await pagina(base, deBea, 10, 0)).map((e) => e.fecha.slice(0, 10))).toEqual(["2026-10-22", "2026-10-21", "2026-10-20"]);
    expect((await pagina(base, deBea, 1, 1)).map((e) => e.fecha.slice(0, 10))).toEqual(["2026-10-21"]);
    // El comienzo del tipo se compara tal cual: «proceso_» no es un comodín.
    expect((await pagina(base, { ...deBea, tipo: "proceso_" }, 10, 0)).map((e) => e.tipo)).toEqual(["proceso_x.creado"]);
    expect(await cuantos(base, { ...deBea, desde: "2026-10-21T00:00:00Z", hasta: "2026-10-22T00:00:00Z" })).toBe(1);
  });

  it("los grupos que hay, en orden, para el filtro «qué»", async () => {
    await guardar(base, [evento({ grupo: "Procesos" }), evento({ grupo: "Compras" })]);
    const lista = await grupos(base);
    expect(lista).toEqual([...lista].sort());
    expect(lista).toEqual(expect.arrayContaining(["Compras", "Procesos", "Ventas"]));
    expect(new Set(lista).size).toBe(lista.length);
  });

  it("RNF-30: un evento no se cambia ni se borra, ni desde la base", async () => {
    const uno = evento();
    await guardar(base, [uno]);
    await expect(sql`UPDATE auditoria.evento SET titulo = 'otro' WHERE id = ${uno.id}`.execute(base)).rejects.toThrow("Los eventos de auditoría no se cambian ni se borran");
    await expect(sql`DELETE FROM auditoria.evento WHERE id = ${uno.id}`.execute(base)).rejects.toThrow("Los eventos de auditoría no se cambian ni se borran");
    await expect(sql`TRUNCATE auditoria.evento`.execute(base)).rejects.toThrow("Los eventos de auditoría no se cambian ni se borran");
  });
});
