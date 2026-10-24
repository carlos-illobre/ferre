import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Unitarias del cliente: React sobre jsdom, IndexedDB simulada. Son la red de seguridad
// del CI (ADR-004, enmienda 2026-09-14): los E2E quedaron para correr a mano.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["src/pruebas/preparar.ts"],
    // El ambiente de las pruebas: como cualquier otro, por variables (022-E19).
    env: { VITE_API_URL: "http://api.prueba", VITE_AMBIENTE: "prueba", VITE_VERSION: "prueba" },
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**"],
  },
});
