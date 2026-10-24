import { configDefaults, defineWorkspace } from "vitest/config";

export default defineWorkspace([
  { test: { name: "unitarias", environment: "node", include: ["src/**/*.test.ts"], exclude: [...configDefaults.exclude, "src/persistencia/**"] } },
  // Cada archivo de pruebas de la capa de datos tiene su propia base, vacía.
  { test: { name: "persistencia", environment: "node", include: ["src/persistencia/**/*.test.ts"], setupFiles: ["src/persistencia/pruebas/base-propia.ts"] } },
]);
