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
    // Solo se prueba la versión elegida, la 5, que es la que abre la raíz (decisión 43). Las
    // otras versiones siguen publicadas pero sin pruebas: sus archivos de prueba quedaron en
    // su lugar y no corren. Las pruebas de la v5 están en src/v5/ (incluidas las de las
    // pantallas de la versión 2 que la v5 usa tal cual en la computadora).
    exclude: [
      "node_modules/**",
      "src/pantallas/**", "src/componentes/**", "src/escritorio/**", // versión 1
      "src/v2/**",
      "src/v4/**",
    ],
  },
});
