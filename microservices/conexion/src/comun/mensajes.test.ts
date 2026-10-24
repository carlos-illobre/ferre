import { describe, expect, it } from "vitest";
import { escribir, leer } from "./mensajes.js";

describe("mensajes (023-E28)", () => {
  it("lee cada clase de mensaje con su forma", () => {
    const todos = [
      { t: "hola", e: "a", desde: 1, re: "", rh: 0 },
      { t: "dato", e: "a", n: 1, d: "x", s: false },
      { t: "ok", e: "a", h: 3 },
      { t: "senal", d: { sdp: "x" } },
      { t: "sin-directa", motivo: "red" },
      { t: "probar" },
    ] as const;
    for (const m of todos) expect(leer(escribir(m))).toEqual(m);
  });

  it("descarta lo que no tiene la forma de un mensaje", () => {
    for (const texto of ["no es json", "null", "5", '{"t":"otro"}', '{"t":"toString"}', '{"t":"ok","e":"a"}', '{"t":"senal","d":null}', '{"t":"dato","e":"a","n":"1","d":"x","s":false}'])
      expect(leer(texto)).toBeNull();
  });
});
