import { describe, expect, it } from "vitest";
import { leerACuestas, leerEvento, leerRechazo, leerTemas } from "./temas.js";

describe("temas", () => {
  it("lee lo que pide el dispositivo, o nada si no tiene la forma", () => {
    expect(leerTemas('[{"t":"x"},{"t":"v","l":"celular","k":"secreto"}]')).toEqual([{ t: "x" }, { t: "v", l: "celular", k: "secreto" }]);
    for (const malo of [null, undefined, "no", "[]", "{}", '[{"t":1}]', '[{"t":"x","l":2}]', '[{"t":"x","k":{}}]', "[null]"]) expect(leerTemas(malo)).toBeNull();
  });

  it("lee lo que va a cuestas", () => {
    expect(leerACuestas('{"version":"v1"}')).toEqual({ version: "v1" });
    for (const malo of [null, "x", "[1]", "3"]) expect(leerACuestas(malo)).toBeNull();
  });

  it("lee cada evento del canal y descarta lo que no tiene la forma (025-E34)", () => {
    for (const e of [{ t: "x", d: null }, { t: "x", p: false }, { t: "x", c: true }, { a: { v: 1 } }]) expect(leerEvento(JSON.stringify(e))).toEqual(e);
    for (const malo of ["no", "[]", "null", '{"t":"x"}', '{"t":"x","p":1}', '{"t":"x","c":false}', '{"a":3}', "{}"]) expect(leerEvento(malo)).toBeNull();
  });

  it("lee qué temas rechazó el servidor; si no lo dice, son todos", () => {
    expect(leerRechazo('{"rechazados":["x"]}')).toEqual(["x"]);
    for (const todos of ["", "{}", '{"rechazados":[1]}', '{"rechazados":"x"}']) expect(leerRechazo(todos)).toBeNull();
  });
});
