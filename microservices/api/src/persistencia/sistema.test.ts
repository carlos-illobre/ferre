import { describe, expect, it } from "vitest";
import { sql } from "kysely";
import { guardar, leer } from "./sistema.js";
import { enTransaccion } from "./transaccion.js";

// Los ajustes de todos los dispositivos (specs/020), una fila por clave.
describe("los ajustes del sistema", () => {
  it("guarda un valor nuevo o reemplaza el que había, y lee solo las claves pedidas", async () => {
    await guardar("prueba.uno", 5);
    await guardar("prueba.uno", 7);
    await guardar("prueba.dos", 1);
    expect(await leer(["prueba.uno", "prueba.tres"])).toEqual(new Map([["prueba.uno", "7"]]));
  });

  it("dentro de una transacción lee lo que esa transacción ya cambió", async () => {
    await guardar("prueba.cuatro", 1);
    const leido = await enTransaccion(async (trx) => {
      await sql`UPDATE configuracion SET valor = '9' WHERE clave = 'prueba.cuatro'`.execute(trx);
      return leer(["prueba.cuatro"], trx);
    });
    expect(leido.get("prueba.cuatro")).toBe("9");
  });
});
