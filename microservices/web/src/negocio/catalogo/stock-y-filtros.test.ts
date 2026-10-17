import { describe, expect, it } from "vitest";
import { cuantosFiltros, filtrar, marcasDe, SIN_FILTROS, stockDe } from "./stock-y-filtros";
import type { Producto } from "../../producto";

// specs/015-catalogo-para-vender: el stock en el Catálogo y los filtros.
const producto = (id: string, marca: string | null, unidad = "unidad") => ({ id, descripcion: id, marca, unidad } as unknown as Producto);
const MECHA = producto("mecha", "Bosch"), CLAVO = producto("clavo", "Erpa", "kg"), CABLE = producto("cable", "erpa", "m"), CINTA = producto("cinta", "3M"), CINTA2 = producto("cinta2", "3m"), SIN_MARCA = producto("arandela", null);
const stock = new Map([["mecha", 12], ["clavo", 3.5], ["cable", 120], ["cinta", 0], ["cinta2", -2]]);

describe("el stock en el Catálogo", () => {
  it("015-E01: por unidad, la cantidad entera con «u.»", () => {
    expect(stockDe(MECHA, stock)).toEqual({ hay: true, texto: "12 u." });
  });
  it("015-E02: por kilo o metro, con su unidad y un decimal", () => {
    expect(stockDe(CLAVO, stock).texto).toBe("3,5 kg");
    expect(stockDe(CABLE, stock).texto).toBe("120 m");
  });
  it("015-E03: cero, negativo o nunca cargado es «Sin stock»", () => {
    for (const p of [CINTA, CINTA2, SIN_MARCA]) expect(stockDe(p, stock)).toEqual({ hay: false, texto: "Sin stock" });
  });
  it("015-E05: con el stock nuevo, dice el stock nuevo", () => {
    expect(stockDe(MECHA, new Map([["mecha", 4]])).texto).toBe("4 u.");
  });
});

describe("los filtros del Catálogo", () => {
  const todos = [MECHA, CLAVO, CABLE, CINTA, CINTA2, SIN_MARCA];
  it("015-E16: con stock, sin stock o todos", () => {
    expect(filtrar(todos, stock, { disponibilidad: "con-stock", marca: null }).map((p) => p.id)).toEqual(["mecha", "clavo", "cable"]);
    expect(filtrar(todos, stock, { disponibilidad: "sin-stock", marca: null }).map((p) => p.id)).toEqual(["cinta", "cinta2", "arandela"]);
    expect(filtrar(todos, stock, SIN_FILTROS)).toHaveLength(6);
  });
  it("015-E17 015-E28: una marca, sin distinguir mayúsculas; la lista de marcas no las repite", () => {
    expect(marcasDe(todos)).toEqual(["3M", "Bosch", "Erpa"]);
    expect(filtrar(todos, stock, { disponibilidad: "todos", marca: "3M" }).map((p) => p.id)).toEqual(["cinta", "cinta2"]);
  });
  it("015-E18: la disponibilidad y la marca se cumplen juntas, y el botón cuenta cuántos filtros hay", () => {
    const f = { disponibilidad: "con-stock" as const, marca: "erpa" };
    expect(filtrar(todos, stock, f).map((p) => p.id)).toEqual(["clavo", "cable"]);
    expect(cuantosFiltros(f)).toBe(2);
    expect(cuantosFiltros(SIN_FILTROS)).toBe(0);
  });
  it("015-E29: buscando en el servidor, las marcas son las de lo encontrado", () => {
    expect(marcasDe([MECHA, SIN_MARCA])).toEqual(["Bosch"]);
  });
});
