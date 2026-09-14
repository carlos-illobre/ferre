import { describe, expect, it } from "vitest";
import { margenReal, precioDeVenta, redondear } from "./precio.js";

describe("redondear", () => {
  it("para arriba, al múltiplo de $1.000 siguiente", () => {
    expect(redondear(1994.57)).toBe(2000);
    expect(redondear(1000.01)).toBe(2000);
    expect(redondear(1000)).toBe(1000);
    expect(redondear(15.1)).toBe(1000);
    expect(redondear(181_500)).toBe(182_000);
  });
});

describe("precioDeVenta", () => {
  it("costo × (1 + margen) × (1 + IVA), redondeado, con los pasos", () => {
    const r = precioDeVenta({ costoNeto: 1649.14, margen: 100, iva: 0.21 });
    expect(r.valor).toBe(4000); // 1649,14 × 2 × 1,21 = 3990,92 → 4000
    expect(r.pasos).toEqual(["Costo $1.649,14", "+ 100 % de margen = $3.298,28", "+ IVA 21 % = $3.990,92", "Redondeado para arriba a $4.000,00 (múltiplo de $1.000,00)"]);
  });
  it("un clavo con 300 % y un taladro con 25 %", () => {
    expect(precioDeVenta({ costoNeto: 12.5, margen: 300, iva: 0.21 }).valor).toBe(1000);
    expect(precioDeVenta({ costoNeto: 120_000, margen: 25, iva: 0.21 }).valor).toBe(182_000);
  });
  it("acepta un margen tipeado a mano, no solo los de los botones", () => {
    expect(precioDeVenta({ costoNeto: 1500, margen: 20, iva: 0.21 }).valor).toBe(3000); // 2178 → 3000
  });
  it("respeta el IVA reducido de la fila", () => {
    expect(precioDeVenta({ costoNeto: 1000, margen: 50, iva: 0.105 }).valor).toBe(2000); // 1657,5 → 2000
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

describe("esMargenBoton", () => {
  it("distingue los cinco botones de un margen tipeado a mano", async () => {
    const { esMargenBoton } = await import("./precio.js");
    expect([300, 200, 100, 50, 25].every(esMargenBoton)).toBe(true);
    expect(esMargenBoton(20)).toBe(false);
    expect(esMargenBoton(150)).toBe(false);
  });
});
