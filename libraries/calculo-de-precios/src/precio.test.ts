import { describe, expect, it } from "vitest";
import { margenReal, precioDeVenta, redondear } from "./precio.js";

describe("redondear", () => {
  it("a $10 por debajo de $10.000 y a $100 desde ahí", () => {
    expect(redondear(1994.57)).toBe(1990);
    expect(redondear(1995)).toBe(2000);
    expect(redondear(9995)).toBe(10000);
    expect(redondear(12_349)).toBe(12_300);
    expect(redondear(12_350)).toBe(12_400);
  });
});

describe("precioDeVenta", () => {
  it("costo × (1 + margen) × (1 + IVA), redondeado, con los pasos", () => {
    const r = precioDeVenta({ costoNeto: 1649.14, margen: 100, iva: 0.21 });
    expect(r.valor).toBe(3990); // 1649,14 × 2 × 1,21 = 3990,92 → 3990
    expect(r.pasos).toEqual(["Costo $1.649,14", "+ 100 % de margen = $3.298,28", "+ IVA 21 % = $3.990,92", "Redondeado a $3.990,00"]);
  });
  it("un clavo con 300 % y un taladro con 25 %", () => {
    expect(precioDeVenta({ costoNeto: 12.5, margen: 300, iva: 0.21 }).valor).toBe(60);
    expect(precioDeVenta({ costoNeto: 120_000, margen: 25, iva: 0.21 }).valor).toBe(181_500);
  });
  it("respeta el IVA reducido de la fila", () => {
    expect(precioDeVenta({ costoNeto: 1000, margen: 50, iva: 0.105 }).valor).toBe(1660); // 1657,5 → 1660
  });
});

describe("margenReal", () => {
  it("dice qué margen deja un precio tipeado a mano", () => {
    const r = margenReal({ costoNeto: 1000, iva: 0.21, precio: 2420 });
    expect(r.valor).toBe(100);
    expect(r.pasos[3]).toBe("Margen real 100 %");
  });
  it("no divide por cero si el costo es cero", () => {
    expect(margenReal({ costoNeto: 0, iva: 0.21, precio: 100 }).valor).toBe(0);
  });
});
