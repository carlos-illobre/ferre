import { describe, expect, it } from "vitest";
import { crearACuestas } from "./index.js";

describe("a cuestas (025-E09, 025-E28)", () => {
  it("cada respuesta dice el valor de cada tema agregado, en una sola cabecera", () => {
    const aCuestas = crearACuestas();
    let version = "v1";
    aCuestas.agregar("version", () => version);
    const dejar = aCuestas.agregar("otro", () => 3);
    expect(aCuestas.cabecera()).toEqual(["X-Avisos", '{"version":"v1","otro":3}']);
    version = "v2";
    dejar();
    expect(aCuestas.valores()).toEqual({ version: "v2" });
  });
});
