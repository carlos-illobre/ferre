import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Ningún valor que llega en un pedido se pega en el texto del SQL (plan, «Seguridad»): los
// valores van siempre como parámetros ($1, $2…). Esta prueba lee todo el código del servidor y
// busca SQL armado con `${…}` fuera de la plantilla `sql` de Kysely (que convierte cada `${…}`
// en un parámetro). Lo único que se puede pegar son estas constantes del propio código y los
// números de los parámetros: cualquier otra cosa hace fallar la prueba.
const SE_PUEDE_PEGAR = new Set([
  "ROLES_Y_PERMISOS", "VIGENTE", "NORMALIZAR", "soloNuevos", "CONSULTA_DEL_CATALOGO", // fragmentos fijos de SQL
  "tabla", // de listas fijas (TABLAS_MOVIBLES, y «producto» o «precio_proveedor» en las listas)
  'columnas.join(", ")', // columnas fijas de las listas
  'sets.join(", ")', // columnas de producto que pasan por COLUMNAS_QUE_SE_CAMBIAN
  "valores", // solo números de parámetro ($1, $2…)
  "j * 4 + 1", "j * 4 + 2", "j * 4 + 3", "j * 4 + 4", "valores.length", "i * columnas.length + j + 1",
]);

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const r = path.join(dir, n);
    if (statSync(r).isDirectory()) return n === "pruebas" ? [] : archivos(r);
    return r.endsWith(".ts") && !r.endsWith(".test.ts") ? [r] : [];
  });
}

describe("el SQL va con parámetros", () => {
  it("ningún texto de SQL pega algo que no sea una constante del código o un número de parámetro", () => {
    const pegado: string[] = [];
    for (const f of archivos(path.join(import.meta.dirname))) {
      const s = readFileSync(f, "utf8");
      for (const m of s.matchAll(/(sql(?:<[^>]*>)?)?`((?:[^`\\]|\\.)*)`/g)) {
        if (m[1] || !/\b(SELECT|UPDATE|INSERT|DELETE|WHERE|LIMIT|OFFSET|SET)\b/.test(m[2]!)) continue;
        for (const e of m[2]!.matchAll(/\$\{([^}]*)\}/g)) {
          if (!SE_PUEDE_PEGAR.has(e[1]!.trim())) pegado.push(`${path.relative(import.meta.dirname, f)}: \${${e[1]}}`);
        }
      }
    }
    expect(pegado).toEqual([]);
  });
});
