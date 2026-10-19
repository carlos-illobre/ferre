import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Las maquetas del director de arte, navegables en /v2, /v3 y /v4 del ambiente de pruebas
// (decisión 113). Son temporales: esta prueba se borra con ellas.
const RAIZ = resolve(__dirname, "../../../../../../..");
const PUBLICO = resolve(RAIZ, "microservices/web/public");
const leer = (ruta: string) => readFileSync(resolve(RAIZ, ruta), "utf8");
const PANTALLAS = ["entrar", "vender", "ventas-de-hoy", "productos", "listas", "duplicados", "stock", "compras", "contar", "resumen", "usuarios", "actividad", "anomalias", "procesos", "mejoras-y-errores", "configuracion"];

describe("las maquetas navegables", () => {
  it("la aplicación instalada no las guarda ni las muestra en su lugar", () => {
    const config = leer("microservices/web/vite.config.ts");
    expect(config).toMatch(/globIgnores:\s*\[[^\]]*"\*\*\/maquetas\/\*\*"[^\]]*"\*\*\/v2\/\*\*"[^\]]*"\*\*\/v3\/\*\*"[^\]]*"\*\*\/v4\/\*\*"/);
    expect(config).toContain("navigateFallbackDenylist: [/\\/maquetas\\//, /\\/v[234](\\/|$)/]");
  });

  it("cada versión abre su navegador, y cada pantalla tiene su variante en computadora y en celular", () => {
    for (const v of ["v2", "v3", "v4"]) expect(existsSync(resolve(PUBLICO, v, "index.html")), v).toBe(true);
    const mapa = JSON.parse(leer("microservices/web/public/maquetas/mapa.json")) as Record<string, Record<"compu" | "celu", string[]>>;
    expect(Object.keys(mapa).sort()).toEqual([...PANTALLAS].sort());
    for (const [pantalla, dispositivos] of Object.entries(mapa)) {
      for (const d of ["compu", "celu"] as const) {
        expect(dispositivos[d].length, `${pantalla} ${d}`).toBeGreaterThanOrEqual(3);
        for (const variante of dispositivos[d]) expect(existsSync(resolve(PUBLICO, "maquetas", pantalla, d, variante, "index.html")), `${pantalla}/${d}/${variante}`).toBe(true);
      }
    }
  });
});
