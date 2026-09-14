import { describe, expect, it } from "vitest";
import { esAmbienteDePrueba } from "./ambiente";

describe("esAmbienteDePrueba", () => {
  it("solo producción se ve como producción", () => {
    expect(esAmbienteDePrueba("produccion 3cfd3eb")).toBe(false);
    expect(esAmbienteDePrueba("pruebas 3cfd3eb")).toBe(true);
    expect(esAmbienteDePrueba("local")).toBe(true);
    expect(esAmbienteDePrueba(undefined)).toBe(true);
  });
});
