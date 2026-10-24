import { configDefaults, defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "unitarias", environment: "node", setupFiles: ["src/pruebas/preparar.ts"],
      include: ["src/**/*.test.ts"], exclude: [...configDefaults.exclude, "src/persistencia/**"],
    },
  },
  {
    // Cada archivo de pruebas tiene su propia base, copiada de una plantilla ya migrada.
    test: {
      name: "persistencia", environment: "node", include: ["src/persistencia/**/*.test.ts"],
      globalSetup: ["src/persistencia/pruebas/plantilla.ts"],
      setupFiles: ["src/pruebas/preparar.ts", "src/persistencia/pruebas/base-propia.ts"],
    },
  },
]);
