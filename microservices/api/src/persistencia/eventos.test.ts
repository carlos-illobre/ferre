import { describe, expect, it } from "vitest";
import { base } from "./conexion.js";
import { anotarEvento } from "./eventos.js";
import { enTransaccion } from "./transaccion.js";
import { usuario } from "./pruebas/datos.js";

// Cada acción queda con quién la hizo (constitución, principio V).
describe("los eventos", () => {
  it("anota el tipo, quién, desde dónde, la versión y el contenido", async () => {
    const quien = await usuario();
    const id = await anotarEvento(base, { tipo: "prueba.hecha", usuarioId: quien, dispositivoId: "celular-1", version: 2, contenido: { a: 1 } });
    const fila = await base.selectFrom("evento").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
    expect(fila).toMatchObject({ tipo: "prueba.hecha", usuario_id: quien, dispositivo_id: "celular-1", version: 2, contenido: { a: 1 } });
  });

  it("sin dispositivo ni versión, va sin dispositivo y en la versión 1", async () => {
    const id = await anotarEvento(base, { tipo: "prueba.sola", usuarioId: null, contenido: {} });
    expect(await base.selectFrom("evento").select(["dispositivo_id", "version"]).where("id", "=", id).executeTakeFirstOrThrow()).toEqual({ dispositivo_id: null, version: 1 });
  });

  it("la hora es la de la base: los eventos de una transacción comparten la hora de la transacción", async () => {
    const ids = await enTransaccion(async (trx) => {
      const primero = await anotarEvento(trx, { tipo: "prueba.uno", usuarioId: null, contenido: {} });
      await new Promise((listo) => setTimeout(listo, 20));
      return [primero, await anotarEvento(trx, { tipo: "prueba.dos", usuarioId: null, contenido: {} })];
    });
    const fechas = await base.selectFrom("evento").select("fecha").where("id", "in", ids).execute();
    expect(new Set(fechas.map((f) => f.fecha.getTime())).size).toBe(1);
  });
});
