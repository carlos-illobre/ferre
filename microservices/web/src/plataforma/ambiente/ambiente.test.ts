import { describe, expect, it } from "vitest";
import { AMBIENTE, deEsteAmbiente, esAmbienteDePrueba } from "./ambiente";

describe("el ambiente", () => {
  it("022-E20: solo producción se ve como producción; lo decide la variable del ambiente, no la versión", () => {
    expect(esAmbienteDePrueba("produccion")).toBe(false);
    expect(esAmbienteDePrueba("pruebas")).toBe(true);
    expect(esAmbienteDePrueba("desarrollo")).toBe(true);
    expect(esAmbienteDePrueba()).toBe(AMBIENTE !== "produccion");
  });

  it("022-E21: lo que se guarda en el dispositivo lleva el ambiente", () => {
    expect(deEsteAmbiente("ferre.sesion")).toBe(`ferre.sesion.${AMBIENTE}`);
  });
});
