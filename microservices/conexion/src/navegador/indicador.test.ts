import { describe, expect, it } from "vitest";
import { crearAvisos } from "../comun/avisos.js";
import type { Suceso } from "./central.js";
import { crearIndicador } from "./indicador.js";

describe("indicador", () => {
  it("025-E12 025-E13 025-E15: dice lo que muestra lo último que pasó (sin sucesos, lo último que se supo), y avisa solo cuando cambia", () => {
    const sucesos = crearAvisos<Suceso>();
    const indicador = crearIndicador(sucesos, "en-linea");
    const visto: string[] = [];
    indicador.cambios.escuchar((e) => visto.push(e));
    expect(indicador.estado()).toBe("en-linea"); // sin nada que lo cambie, sigue con lo último (E15)
    for (const s of ["contesto", "abriendo", "abierto", "cortado", "sin-red", "con-red", "fallo", "contesto"] as Suceso[]) sucesos.avisar(s);
    expect(visto).toEqual(["conectando", "en-linea", "sin-conexion", "en-linea", "sin-conexion", "en-linea"]);
    expect(indicador.estado()).toBe("en-linea");
  });

  it("025-E16: uno nuevo se arma diciendo qué mira: lo que no está en su tabla no lo cambia", () => {
    const sucesos = crearAvisos<Suceso>();
    const soloElCanal = crearIndicador(sucesos, "conectando", { abierto: "en-linea", cortado: "sin-conexion" });
    sucesos.avisar("fallo");
    expect(soloElCanal.estado()).toBe("conectando");
    sucesos.avisar("abierto");
    expect(soloElCanal.estado()).toBe("en-linea");
  });
});
