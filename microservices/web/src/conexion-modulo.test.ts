import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// El módulo de la conexión entre dispositivos se lleva a otro proyecto (RNF-68, ADR-027): se
// comprueba en su configuración, que es lo que hacen cumplir su `pnpm capas` y su `vitest`.
const leer = (archivo: string) => readFileSync(`${process.cwd()}/../conexion/${archivo}`, "utf8");

describe("el módulo de conexión", () => {
  it("023-E20: no depende de nada de Ferrebress ni de bibliotecas: sin dependencias de ejecución, y sus capas lo prohíben", () => {
    const paquete = JSON.parse(leer("package.json")) as { dependencies?: object; peerDependencies?: object };
    expect(paquete.dependencies).toBeUndefined();
    expect(paquete.peerDependencies).toBeUndefined();
    expect(leer(".dependency-cruiser.cjs")).toContain('name: "no-importa-nada-de-afuera"');
  });

  it("023-E21: sus pruebas tienen que recorrer cada línea, rama y función", () => {
    expect(leer("vitest.config.ts")).toMatch(/thresholds: \{ 100: true \}/);
    expect(JSON.parse(leer("package.json")).scripts.test).toBe("vitest run --coverage");
  });
});
