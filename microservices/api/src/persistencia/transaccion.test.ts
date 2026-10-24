import { describe, expect, it } from "vitest";
import { cuantas, proveedor } from "./pruebas/datos.js";
import { Deshacer, enTransaccion, enUnaFoto } from "./transaccion.js";

// 022-E18: una transacción es todo o nada.
describe("las transacciones", () => {
  it("guarda todo cuando termina bien", async () => {
    const antes = await cuantas("proveedor");
    expect(await enTransaccion(async (trx) => { await trx.insertInto("proveedor").values({ id: crypto.randomUUID(), nombre: "Uno" }).execute(); return "listo"; })).toBe("listo");
    expect(await cuantas("proveedor")).toBe(antes + 1);
  });

  it("022-E18: si algo falla, no queda nada a medias y el error llega a quien llamó", async () => {
    const antes = await cuantas("proveedor");
    await expect(enTransaccion(async (trx) => {
      await trx.insertInto("proveedor").values({ id: crypto.randomUUID(), nombre: "Dos" }).execute();
      await trx.insertInto("proveedor").values({ id: "no-es-un-uuid", nombre: "Tres" }).execute();
    })).rejects.toThrow(/uuid/);
    expect(await cuantas("proveedor")).toBe(antes);
  });

  it("Deshacer vuelve atrás y devuelve la respuesta, sin error", async () => {
    const antes = await cuantas("proveedor");
    expect(await enTransaccion(async (trx) => {
      await trx.insertInto("proveedor").values({ id: crypto.randomUUID(), nombre: "Cuatro" }).execute();
      throw new Deshacer({ ok: false });
    })).toEqual({ ok: false });
    expect(await cuantas("proveedor")).toBe(antes);
  });

  it("lee en una sola foto, con su marca y su tope", async () => {
    await proveedor();
    const { marca, resultado } = await enUnaFoto(async (trx, tope) => ({ tope, filas: await trx.selectFrom("proveedor").select("id").execute() }));
    expect(BigInt(marca)).toBeLessThanOrEqual(BigInt(resultado.tope));
    expect(resultado.filas.length).toBeGreaterThan(0);
    await expect(enUnaFoto((trx) => trx.insertInto("proveedor").values({ id: crypto.randomUUID(), nombre: "No" }).execute())).rejects.toThrow(/read-only/);
  });
});
