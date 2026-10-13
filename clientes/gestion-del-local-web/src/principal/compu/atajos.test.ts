import { describe, expect, it } from "vitest";
import { repartirLetras } from "./atajos";

// Atajos de los botones (decisión 80): cómo se reparten las letras.
describe("letras de los atajos", () => {
  it("a cada botón, la primera letra de su nombre que esté libre", () => {
    expect(repartirLetras(["Guardar", "Cancelar", "Agregar"])).toEqual(["g", "c", "a"]);
    // La segunda «Guardar» ya no tiene la G: le toca la letra siguiente de su nombre.
    expect(repartirLetras(["Guardar", "Guardar y seguir"])).toEqual(["g", "u"]);
  });
  it("nunca usa la D, la E ni la F, y no mira los acentos", () => {
    expect(repartirLetras(["Descartar", "Editar", "Filtrar", "Últimas cargas"])).toEqual(["s", "i", "l", "u"]);
  });
  it("sin letras libres en su nombre toma la primera libre del abecedario; si no queda ninguna, se queda sin atajo", () => {
    expect(repartirLetras(["Sí", "Sí"])).toEqual(["s", "i"]);
    expect(repartirLetras(["Sí", "Sí", "Sí"])).toEqual(["s", "i", "a"]);
    const muchos = repartirLetras(Array.from({ length: 30 }, () => "x"));
    expect(muchos.filter(Boolean)).toHaveLength(23);
    expect(muchos.slice(23)).toEqual(Array(7).fill(null));
  });
  it("con los mismos botones a la vista, las letras son siempre las mismas", () => {
    const botones = ["Registrar ingreso", "Descartar", "Elegir proveedor"];
    expect(repartirLetras(botones)).toEqual(repartirLetras(botones));
  });
});
