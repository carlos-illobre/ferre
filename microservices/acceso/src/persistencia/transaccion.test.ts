import { describe, expect, it } from "vitest";
import { cuantas } from "./pruebas/datos.js";
import { Deshacer, enTransaccion } from "./transaccion.js";

// 022-E18: una transacción es todo o nada.
describe("las transacciones", () => {
  it("guarda todo cuando termina bien", async () => {
    const antes = await cuantas("rol");
    expect(await enTransaccion(async (trx) => { await trx.insertInto("rol").values({ id: crypto.randomUUID(), nombre: "Uno" }).execute(); return "listo"; })).toBe("listo");
    expect(await cuantas("rol")).toBe(antes + 1);
  });

  it("022-E18: si algo falla, no queda nada a medias y el error llega a quien llamó", async () => {
    const antes = await cuantas("rol");
    await expect(enTransaccion(async (trx) => {
      await trx.insertInto("rol").values({ id: crypto.randomUUID(), nombre: "Dos" }).execute();
      await trx.insertInto("rol").values({ id: "no-es-un-uuid", nombre: "Tres" }).execute();
    })).rejects.toThrow(/uuid/);
    expect(await cuantas("rol")).toBe(antes);
  });

  it("Deshacer vuelve atrás y devuelve la respuesta, sin error", async () => {
    const antes = await cuantas("rol");
    expect(await enTransaccion(async (trx) => {
      await trx.insertInto("rol").values({ id: crypto.randomUUID(), nombre: "Cuatro" }).execute();
      throw new Deshacer({ ok: false });
    })).toEqual({ ok: false });
    expect(await cuantas("rol")).toBe(antes);
  });

});
