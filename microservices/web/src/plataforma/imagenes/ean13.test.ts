import { describe, expect, it } from "vitest";
import { barrasEan13 } from "./ean13";

describe("EAN-13", () => {
  it("dibuja 95 módulos con las guardas en su lugar", () => {
    const b = barrasEan13("7897065211580")!;
    expect(b).toHaveLength(95);
    expect(b.slice(0, 3)).toBe("101");
    expect(b.slice(45, 50)).toBe("01010");
    expect(b.slice(92)).toBe("101");
    // El 7 inicial fija la paridad de la primera mitad (LGLGGL): el 8 va con L y el 9 con G.
    expect(b.slice(3, 10)).toBe("0110111");
    expect(b.slice(10, 17)).toBe("0010111");
  });
  it("no dibuja lo que no tiene 13 dígitos", () => {
    expect(barrasEan13("12345")).toBeNull();
    expect(barrasEan13("TA-81")).toBeNull();
  });
});
