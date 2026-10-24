import { defineConfig } from "vitest/config";

// Las pruebas unitarias del módulo recorren cada línea, rama, función y sentencia (RNF-68): si
// la cobertura baja del 100 %, la prueba falla. Una línea que ninguna prueba recorre no se escribe.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/pruebas/**"],
      thresholds: { 100: true },
    },
  },
});
