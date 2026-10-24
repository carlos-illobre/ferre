import { defineConfig } from "vitest/config";

// Durante el rediseño como la v2 (specs/021, decisión 148) las pruebas de las pantallas (celu y
// compu) no corren en el CI (PANTALLAS_EN_PAUSA=1); se arreglan todas juntas al final.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], setupFiles: ["src/pruebas/preparar.ts"],
    exclude: ["node_modules/**", ...(process.env.PANTALLAS_EN_PAUSA ? ["src/celu/**", "src/compu/**"] : [])],
  },
});
