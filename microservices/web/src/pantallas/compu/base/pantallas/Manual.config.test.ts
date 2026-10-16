import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Lo que del manual de uso se decide en la configuración (RF-97, specs/012-manual-de-uso).
const RAIZ = resolve(__dirname, "../../../../../../..");
const leer = (ruta: string) => readFileSync(resolve(RAIZ, ruta), "utf8");

describe("el manual de uso, en la configuración", () => {
  it("012-E08: las capturas y el clip los arma un recorrido propio; las pruebas de punta a punta no graban video ni lo usan", () => {
    expect(leer("tests/capturas/tutorial/entrar.py")).toContain("record_video_dir");
    expect(leer("tests/e2e/playwright.config.ts")).toMatch(/video:\s*"off"/);
    for (const carpeta of ["tests/e2e/escritorio", "tests/e2e/celular"]) {
      for (const archivo of readdirSync(resolve(RAIZ, carpeta))) {
        const texto = leer(`${carpeta}/${archivo}`);
        expect(texto, archivo).not.toMatch(/capturas\/tutorial|recordVideo|video:\s*"on"/);
      }
    }
    // Lo que la pantalla muestra está en la carpeta pública del manual.
    expect(readdirSync(resolve(RAIZ, "microservices/web/public/manual/entrar"))).toEqual(expect.arrayContaining(["clip.mp4", "clip-portada.jpg", "compu-codigo.png"]));
  });

  it("012-E09: el manual no se guarda en el dispositivo para usar sin conexión", () => {
    expect(leer("microservices/web/vite.config.ts")).toMatch(/globIgnores:\s*\[[^\]]*"\*\*\/manual\/\*\*"/);
  });
});
