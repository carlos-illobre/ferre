import { describe, expect, it } from "vitest";
import { almacenEnMemoria, crearMemoria } from "./memoria.js";

describe("memoria de la directa", () => {
  it("anota, lee y olvida, y si lo guardado está roto lo da por no anotado", () => {
    const almacen = almacenEnMemoria();
    const memoria = crearMemoria(almacen, "sala");
    expect(memoria.leer()).toBeNull();
    memoria.anotar({ motivo: "red", en: 5 });
    expect(memoria.leer()).toEqual({ motivo: "red", en: 5 });
    memoria.olvidar();
    expect(memoria.leer()).toBeNull();
    almacen.setItem("sala", "{roto");
    expect(memoria.leer()).toBeNull();
  });
});
