import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Unitarias del cliente: React sobre jsdom, IndexedDB simulada. Son la red de seguridad
// del CI (ADR-004, enmienda 2026-09-14): los E2E quedaron para correr a mano.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["src/pruebas/preparar.ts"],
    env: { VITE_API_URL: "http://api.prueba" },
    include: ["src/**/*.test.{ts,tsx}"],
    // Durante el rediseño como la v2 (specs/021, decisión 148) las pruebas de las pantallas no
    // corren en el CI (PANTALLAS_EN_PAUSA=1), como en la decisión 25: se arreglan todas juntas al
    // final y se vuelve a sacar la variable. A mano siguen corriendo todas.
    exclude: ["node_modules/**", ...(process.env.PANTALLAS_EN_PAUSA ? ["src/pantallas/**"] : [])],
  },
});
