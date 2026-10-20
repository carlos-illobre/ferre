import { describe, expect, it } from "vitest";
import { diferenciaDeCosto } from "./ficha";

describe("diferenciaDeCosto", () => {
  it("dice cuánto más caro o más barato es otro proveedor, en porcentaje", () => {
    expect(diferenciaDeCosto("9980", 9350.85)).toBe("+6,7 %");
    expect(diferenciaDeCosto(900, 1000)).toBe("−10 %");
    expect(diferenciaDeCosto(1000, 1000)).toBe("mismo costo");
    expect(diferenciaDeCosto(1000, null)).toBeNull();
  });
});
