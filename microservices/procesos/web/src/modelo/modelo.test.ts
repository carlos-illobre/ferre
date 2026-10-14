// @vitest-environment node
import { readFileSync } from "node:fs";
import { BpmnModdle } from "bpmn-moddle";
import { describe, expect, it } from "vitest";
import { grafoDe, type Grafo, type ObjetoBpmn } from "./grafo";
import { enOrden, erroresDeForma, filasDe } from "./recorrido";
import { alMover, alPoner, alQuitar, aplicar, listaDe, lugaresDe, type Item } from "./lista";

const VENTA = readFileSync(new URL("./ejemplos/venta.bpmn", import.meta.url), "utf8");

async function grafoDelXml(xml: string): Promise<Grafo> {
  const { rootElement } = (await new BpmnModdle().fromXML(xml)) as unknown as { rootElement: { rootElements: ObjetoBpmn[] } };
  return grafoDe(rootElement.rootElements.find((e) => e.$type === "bpmn:Process")!);
}

const nombres = (items: Item[]): unknown[] => items.map((i) => (i.ramas.length ? [i.paso.nombre, ...i.ramas.map((r) => [r.nombre, ...nombres(r.items)])] : i.paso.nombre));

// Un grafo a mano: "a>b, b>c" con tipos por la primera letra (i inicio, f fin, d decisión, t tarea).
function grafo(flechas: string, tipos: Record<string, Grafo["pasos"][number]["tipo"]> = {}): Grafo {
  const pares = flechas.split(",").map((x) => x.trim().split(">") as [string, string]);
  const ids = [...new Set(pares.flat())];
  const tipo = (id: string) => tipos[id] ?? ({ i: "inicio", f: "fin", d: "decision" } as const)[id[0] as "i"] ?? "tarea";
  return {
    pasos: ids.map((id) => ({ id, tipo: tipo(id), nombre: id, carril: null, pantalla: "", como: "" })),
    flechas: pares.map(([desde, hasta], n) => ({ id: `f${n}`, desde, hasta, nombre: "" })),
    carriles: [],
  };
}

describe("el dibujo como grafo", () => {
  it("011-E06 lee de cada paso su nombre, tipo, quién lo hace, la pantalla y cómo se hace", async () => {
    const g = await grafoDelXml(VENTA);
    expect(g.carriles).toEqual(["Cliente", "Vendedor", "Sistema"]);
    expect(g.pasos.find((p) => p.nombre === "Cobrar")).toEqual({
      id: "Cobrar", tipo: "persona", nombre: "Cobrar", carril: "Vendedor", pantalla: "Vender → Cobrar",
      como: "Efectivo viene elegido. Si paga con Mercado Pago, esperar el aviso antes de entregar.",
    });
    expect(g.pasos.find((p) => p.id === "Registrar")).toMatchObject({ tipo: "sistema", carril: "Sistema" });
    expect(g.flechas.find((f) => f.desde === "HayStock" && f.hasta === "Anotar")?.nombre).toBe("No");
  });
});

describe("los pasos, en orden", () => {
  it("011-E11 la tabla trae los pasos en el orden del recorrido, con tipo, quién, dónde y con qué sigue", async () => {
    const filas = filasDe(await grafoDelXml(VENTA));
    expect(filas.map((f) => f.nombre)).toEqual([
      "Llega el cliente", "Pide un producto", "Buscar el producto", "¿Hay stock?", "Cargar en la venta", "Cobrar",
      "Registrar la venta y el stock", "Venta lista", "Anotar el pedido", "Pedido anotado",
    ]);
    expect(filas.find((f) => f.nombre === "¿Hay stock?")).toMatchObject({ tipoTexto: "Decisión", carril: "Vendedor", pantalla: "Depósito → Inventario", sigueCon: "Sí: Cargar en la venta · No: Anotar el pedido" });
    expect(filas.find((f) => f.nombre === "Cobrar")?.sigueCon).toBe("Registrar la venta y el stock");
    expect(filas.at(-1)).toMatchObject({ nombre: "Pedido anotado", sigueCon: "—", pantalla: "—" });
  });

  it("los pasos sueltos van después del recorrido y las notas al final", () => {
    const g = grafo("i>a, a>f, x>y");
    g.pasos.push({ id: "n", tipo: "nota", nombre: "nota", carril: null, pantalla: "", como: "" });
    expect(enOrden(g).map((p) => p.id)).toEqual(["i", "a", "f", "x", "y", "n"]);
  });
});

describe("errores de forma", () => {
  it("011-E14 marca un paso al que no llega ninguna flecha, una decisión con una sola salida y la falta de inicio o de fin", () => {
    const g = grafo("i>d1, d1>a, a>f, x>f");
    const e = erroresDeForma(g);
    expect(e.porPaso.get("x")).toBe("Ninguna flecha llega a este paso");
    expect(e.porPaso.get("d1")).toBe("Una decisión necesita al menos dos salidas");
    expect(e.porPaso.has("a")).toBe(false);
    expect(e.generales).toEqual([]);
    expect(erroresDeForma(grafo("a>b")).generales).toEqual(["Falta el inicio", "Falta el fin"]);
  });

  it("011-E14 el ejemplo de la venta no tiene errores", async () => {
    const e = erroresDeForma(await grafoDelXml(VENTA));
    expect([...e.porPaso.entries()]).toEqual([]);
    expect(e.generales).toEqual([]);
  });
});

describe("«Pasos» en el celular", () => {
  it("011-E26 el recorrido es una lista, y después de una decisión cada opción es una rama con su nombre", async () => {
    expect(nombres(listaDe(await grafoDelXml(VENTA))!)).toEqual([
      "Llega el cliente", "Pide un producto", "Buscar el producto",
      ["¿Hay stock?", ["Sí", "Cargar en la venta", "Cobrar", "Registrar la venta y el stock", "Venta lista"], ["No", "Anotar el pedido", "Pedido anotado"]],
    ]);
  });

  it("011-E26 si las ramas se juntan, la lista sigue después de la decisión", () => {
    const g = grafo("i>d1, d1>a, d1>b, a>j, b>j, j>f");
    expect(nombres(listaDe(g)!)).toEqual(["i", ["d1", ["", "a"], ["", "b"]], "j", "f"]);
  });

  it("un camino que vuelve atrás no entra en una lista", () => {
    expect(listaDe(grafo("i>a, a>d1, d1>a, d1>f"))).toBeNull();
    expect(listaDe(grafo("i>a, a>f, x>y"))).toBeNull();
  });

  it("011-E28 agregar un paso entre dos lo pone en medio, y la primera flecha conserva su nombre", async () => {
    const g = await grafoDelXml(VENTA);
    const cambio = alPoner(g, "Nuevo", { desde: "HayStock", hasta: "Cargar" });
    const fSi = g.flechas.find((f) => f.desde === "HayStock" && f.hasta === "Cargar")!;
    expect(cambio).toEqual({ borrar: [fSi.id], unir: [{ desde: "HayStock", hasta: "Nuevo", nombre: "Sí" }, { desde: "Nuevo", hasta: "Cargar", nombre: "" }] });
    expect(alPoner(g, "Nuevo", { desde: "Lista", hasta: null })).toEqual({ borrar: [], unir: [{ desde: "Lista", hasta: "Nuevo", nombre: "" }] });
  });

  it("011-E29 011-E07 quitar un paso une lo que llegaba con lo que seguía", () => {
    const g = grafo("i>a, a>b, b>f");
    expect(alQuitar(g, "b")).toEqual({ borrar: ["f1", "f2"], unir: [{ desde: "a", hasta: "f", nombre: "" }] });
  });

  it("011-E27 mover un paso lo saca de donde estaba y lo pone en el lugar nuevo, aunque sea otra rama", async () => {
    const g = await grafoDelXml(VENTA);
    const [quitar, poner] = alMover(g, "Cobrar", { desde: "Anotar", hasta: "Anotado" });
    let despues = aplicar(g, quitar!, (i) => `q${i}`);
    despues = aplicar(despues, poner!, (i) => `p${i}`);
    expect(nombres(listaDe(despues)!)).toEqual([
      "Llega el cliente", "Pide un producto", "Buscar el producto",
      ["¿Hay stock?", ["Sí", "Cargar en la venta", "Registrar la venta y el stock", "Venta lista"], ["No", "Anotar el pedido", "Cobrar", "Pedido anotado"]],
    ]);
    expect(alMover(g, "Cobrar", { desde: "Cobrar", hasta: "Registrar" })).toEqual([]);
  });

  it("los lugares para soltar un paso son entre cada dos y al final de lo que no termina", () => {
    const items = listaDe(grafo("i>a, a>b"))!;
    expect(lugaresDe(items)).toEqual([{ desde: "i", hasta: "a" }, { desde: "a", hasta: "b" }, { desde: "b", hasta: null }]);
  });
});
