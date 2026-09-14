import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", setupFiles: ["src/pruebas/preparar.ts"], include: ["src/**/*.test.ts"] },
});
