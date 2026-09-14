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
  },
});
