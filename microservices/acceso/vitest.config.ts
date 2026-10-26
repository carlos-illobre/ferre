import { configDefaults, defineConfig } from "vitest/config";

// 022-E15 022-E16: dos proyectos (vitest.workspace.ts): las unitarias de siempre y las de la capa de datos, contra
// PostgreSQL. La cobertura se mide solo con las de la capa de datos y tiene que ser del 100 %
// (ADR-004, ADR-025): `pnpm test:persistencia`.
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/persistencia/**/*.ts"],
      exclude: [...configDefaults.coverage.exclude!, "src/persistencia/pruebas/**", "src/persistencia/tablas.ts"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text-summary", "text"],
    },
  },
});
