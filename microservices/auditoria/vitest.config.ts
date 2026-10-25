import { configDefaults, defineConfig } from "vitest/config";

// Todas las pruebas corren contra PostgreSQL: cada archivo con su base (pruebas/base-propia.ts).
// La cobertura se mide en la capa de datos y tiene que ser del 100 % (RNF-66).
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["src/persistencia/pruebas/base-propia.ts"],
    coverage: {
      provider: "v8",
      include: ["src/persistencia/**/*.ts"],
      exclude: [...configDefaults.coverage.exclude!, "src/persistencia/pruebas/**", "src/persistencia/tablas.ts"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text-summary", "text"],
    },
  },
});
