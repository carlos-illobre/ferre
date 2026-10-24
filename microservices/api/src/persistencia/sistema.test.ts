import { describe, expect, it } from "vitest";
import { guardar, leer } from "./sistema.js";

// Los ajustes de todos los dispositivos (specs/020), una fila por clave.
describe("los ajustes del sistema", () => {
  it("guarda un valor nuevo o reemplaza el que había, y lee solo las claves pedidas", async () => {
    await guardar("prueba.uno", 5);
    await guardar("prueba.uno", 7);
    await guardar("prueba.dos", 1);
    expect(await leer(["prueba.uno", "prueba.tres"])).toEqual(new Map([["prueba.uno", "7"]]));
  });
});
