import { describe, expect, it } from "vitest";
import { vistaPara } from "./vista";

describe("vistaPara", () => {
  it("un celular (incluso grande o acostado angosto) usa la interfaz de celular", () => {
    expect(vistaPara(360)).toBe("celular");
    expect(vistaPara(412)).toBe("celular");
    expect(vistaPara(899)).toBe("celular");
  });
  it("la notebook y cualquier pantalla de 900 px o más usan la de escritorio", () => {
    expect(vistaPara(900)).toBe("escritorio");
    expect(vistaPara(1366)).toBe("escritorio");
    expect(vistaPara(1920)).toBe("escritorio");
  });
});
