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

describe("qué botones llevan letra", () => {
  it("lo oculto para los lectores de pantalla (aria-hidden), como el logo de una librería, no lleva letra", async () => {
    const { botonesALaVista } = await import("./atajos");
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = () => ({ width: 40, height: 20, top: 10, bottom: 30, left: 0, right: 40, x: 0, y: 10, toJSON: () => ({}) });
    document.body.innerHTML = `<button>Guardar</button><div aria-hidden="true"><a href="https://bpmn.io">Powered by bpmn.io</a></div><a href="https://bpmn.io" aria-hidden="true">Logo</a>`;
    try {
      expect(botonesALaVista().map((b) => b.textContent)).toEqual(["Guardar"]);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
      document.body.innerHTML = "";
    }
  });
});
