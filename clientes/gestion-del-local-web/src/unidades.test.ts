import { describe, expect, it } from "vitest";
import { cantidadValida, enteras, unidadDe } from "./unidades";
import { producto } from "./pruebas/catalogo-falso";

// Pedido del dueño: por unidad las cantidades son enteras (ni cero a la izquierda ni
// decimales); a granel (kg, m, l) admiten un solo decimal.
describe("cantidadValida", () => {
  it("por unidad recorta a entero", () => {
    expect(cantidadValida("3", "unidad")).toBe(3);
    expect(cantidadValida("2.7", "unidad")).toBe(2);
    expect(cantidadValida("03", "unidad")).toBe(3);
  });
  it("a granel deja un decimal, con coma o punto", () => {
    expect(cantidadValida("1.5", "kg")).toBe(1.5);
    expect(cantidadValida("1,25", "m")).toBe(1.3);
    expect(cantidadValida("0.05", "l")).toBe(0.1);
  });
  it("vacío, cero o negativo es 0 (la caja queda vacía)", () => {
    expect(cantidadValida("", "unidad")).toBe(0);
    expect(cantidadValida("0", "kg")).toBe(0);
    expect(cantidadValida("-2", "unidad")).toBe(0);
    expect(cantidadValida("abc", "unidad")).toBe(0);
  });
});

describe("unidadDe", () => {
  it("usa la del producto si es conocida, y 'unidad' si no", () => {
    expect(unidadDe(producto({ id: "1", descripcion: "x", unidad: "kg" }))).toBe("kg");
    expect(unidadDe(producto({ id: "1", descripcion: "x", unidad: "caja" }))).toBe("unidad");
    expect(unidadDe(null)).toBe("unidad");
    expect(enteras("unidad")).toBe(true);
    expect(enteras("m")).toBe(false);
  });
});
