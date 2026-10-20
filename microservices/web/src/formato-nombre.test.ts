import { describe, expect, it } from "vitest";
import { nombreDeProducto } from "./formato";

// Los nombres de las listas vienen en mayúsculas y se muestran como frase (decisión 127).
describe("nombreDeProducto", () => {
  it("pasa a frase y deja siglas, códigos y unidades como se escriben", () => {
    expect(nombreDeProducto("PRENSA SARGENTO TIPO F 120X400MM / (WORKPRO)")).toBe("Prensa sargento tipo F 120x400mm / (Workpro)");
    expect(nombreDeProducto("MECHA ACERO RAPIDO HSS 8 MM")).toBe("Mecha acero rapido HSS 8 mm");
    expect(nombreDeProducto("CINTA AISLADORA DE PVC 20 MTS")).toBe("Cinta aisladora de PVC 20 mts");
    expect(nombreDeProducto("LAMPARA LED 9W LUZ FRIA E27")).toBe("Lampara LED 9W luz fria E27");
  });
  it("un nombre que ya trae minúsculas queda como está", () => {
    expect(nombreDeProducto("Mecha 6 mm madera")).toBe("Mecha 6 mm madera");
  });
});
