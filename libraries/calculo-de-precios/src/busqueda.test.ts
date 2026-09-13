import { describe, expect, it } from "vitest";
import { buscar, indexar, normalizar } from "./busqueda.js";

const catalogo = indexar([
  { id: "1", descripcion: "MECHA PARA MADERA DE 6 MM / (BLACK & DECKER) - 17060E", marca: "BLACK & DECKER", codigos: ["BB17060E"] },
  { id: "2", descripcion: "MECHA PARA MADERA DE 8 MM", marca: "BLACK & DECKER", codigos: ["BB17061E"] },
  { id: "3", descripcion: "Mecha Widia 6mm para pared", marca: "Tramontina", codigos: ["TW-06", "7790000000017"] },
  { id: "4", descripcion: "Adhesivo de contacto 250 cc", marca: "Suprabond", codigos: ["SBD TR 1/4"] },
  { id: "5", descripcion: "CAÑO PVC 110", marca: null, codigos: [] },
]);

describe("normalizar", () => {
  it("quita acentos, mayúsculas y símbolos raros", () => {
    expect(normalizar("CAÑO  PVC / Ñandú")).toBe("cano pvc / nandu");
  });
});

describe("buscar", () => {
  it("varias palabras en cualquier orden, y un número no coincide dentro de un código", () => {
    expect(buscar(catalogo, "6 madera mecha").map((p) => p.id)).toEqual(["1"]);
    expect(buscar(catalogo, "mecha 6").map((p) => p.id).sort()).toEqual(["1", "3"]); // "6 mm" y "6mm"; no "17061e"
  });
  it("una palabra empezada encuentra la completa", () => {
    expect(buscar(catalogo, "mad mec").map((p) => p.id).sort()).toEqual(["1", "2"]);
  });
  it("sin acentos ni mayúsculas", () => {
    expect(buscar(catalogo, "caño").map((p) => p.id)).toEqual(["5"]);
    expect(buscar(catalogo, "cano pvc").map((p) => p.id)).toEqual(["5"]);
  });
  it("por código del proveedor y por código de barras, primero", () => {
    expect(buscar(catalogo, "bb17061e").map((p) => p.id)).toEqual(["2"]);
    expect(buscar(catalogo, "7790000000017")[0]?.id).toBe("3");
  });
  it("por marca", () => {
    expect(buscar(catalogo, "tramontina mecha").map((p) => p.id)).toEqual(["3"]);
  });
  it("la descripción más específica va primero a igual coincidencia", () => {
    const ids = buscar(catalogo, "mecha").map((p) => p.id);
    expect(ids).toHaveLength(3);
    expect(ids.slice(0, 2).sort()).toEqual(["2", "3"]); // las dos que empiezan con "mecha" van antes que la del código largo
  });
  it("sin consulta no devuelve nada", () => {
    expect(buscar(catalogo, "   ")).toEqual([]);
  });
  it("es rápida con 50.000 productos", () => {
    const grande = indexar(Array.from({ length: 50_000 }, (_, i) => ({ id: String(i), descripcion: `PRODUCTO ${i} TORNILLO ${i % 97} MM`, marca: `MARCA ${i % 13}`, codigos: [`C${i}`] })));
    const inicio = performance.now();
    const r = buscar(grande, "tornillo 42 marca 3");
    expect(performance.now() - inicio).toBeLessThan(100);
    expect(r.length).toBeGreaterThan(0);
  });
});
