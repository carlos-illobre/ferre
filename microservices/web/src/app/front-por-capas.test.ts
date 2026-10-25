import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { MENU } from "../pantallas/compu/marco/menu";
import { tienePantalla } from "../pantallas/compu/marco/PantallaActual";

// El front por capas (specs/024, ADR-028 y ADR-029): cada cosa en su capa, los controles de cada
// subida conectados y sin excepciones, y ninguna parte del menú sin su pantalla.
const SRC = join(__dirname, "..");
const WEB = join(SRC, "..");
const archivos = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? archivos(p) : /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [relative(SRC, p)] : [];
});
const codigo = archivos(SRC).filter((f) => !f.startsWith("pruebas/"));
const donde = (patron: RegExp, fuera: RegExp) => codigo.filter((f) => !fuera.test(f) && patron.test(readFileSync(join(SRC, f), "utf8")));
const leer = (f: string) => readFileSync(join(WEB, f), "utf8");

describe("el front por capas (024)", () => {
  it("024-E01: la raíz de src/ tiene solo las capas; las teclas están solo en teclado/, y lo guardado y el servidor solo en datos/ (y la plataforma)", () => {
    expect(readdirSync(SRC).filter((n) => statSync(join(SRC, n)).isDirectory()).sort()).toEqual(["app", "datos", "fuentes", "negocio", "pantallas", "plataforma", "pruebas", "teclado", "ui"]);
    expect(donde(/onKey(Down|Up|Press)=|addEventListener\(["']key/, /^teclado\//)).toEqual([]);
    expect(donde(/\b(localStorage|sessionStorage|indexedDB)\b|\bfetch\(/, /^(datos|plataforma|app)\//)).toEqual([]);
  });

  it("024-E02: pnpm capas corre en cada subida y no acepta ninguna dependencia fuera de regla", () => {
    expect(JSON.parse(leer(".dependency-cruiser-known-violations.json"))).toEqual([]);
    expect(JSON.parse(leer("package.json")).scripts.typecheck).toContain("pnpm capas");
  });

  it("024-E03: pnpm limites corre en cada subida, sin excepciones a los límites, y controla el código repetido", () => {
    expect(JSON.parse(leer("limites-excepciones.json"))).toEqual([]);
    const scripts = JSON.parse(leer("package.json")).scripts;
    expect(scripts.typecheck).toContain("pnpm limites");
    expect(scripts.limites).toContain("scripts/repetido.mjs");
  });

  it("024-E04: quién puede qué y quién anula una venta están una sola vez, en el negocio", () => {
    expect(donde(/function (usePuede|usePuedeAnular)\b|export const puede = /, /^negocio\/usuarios\//)).toEqual([]);
    expect(donde(/"ventas\.anular/, /^negocio\//)).toEqual([]);
  });

  it("024-E05: cada pestaña del menú de la computadora sigue abriendo su pantalla", () => {
    const sinPantalla = MENU.flatMap((p) => p.pestanas.map((x) => x.ruta)).filter((r) => !tienePantalla(r));
    expect(sinPantalla).toEqual([]);
  });
});
