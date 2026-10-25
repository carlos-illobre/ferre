import { configDefaults, defineConfig } from "vitest/config";

// Las pruebas corren contra PostgreSQL (BASE_DE_PRUEBAS, como la capa de datos de cada servicio) y
// cubren el 100 % (RNF-66): el kit es parte de la capa de datos de quien lo usa.
export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["src/pruebas/base.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [...configDefaults.coverage.exclude!, "src/pruebas/**"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text-summary", "text"],
    },
  },
});
