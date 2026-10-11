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
    // EN PAUSA (decisión 25, 2026-10-11): las pruebas de las pantallas no corren hasta que
    // Carlos elija cuál de las versiones de la interfaz (v1, v2 o v4) queda como definitiva.
    // Los archivos siguen en su lugar. Para reactivarlas, dejá acá solo las carpetas de las
    // versiones que se descarten (o borrá esta lista si quedan todas). Las pruebas de lo que
    // no es pantalla (cola de cambios, unidades, formato) siguen corriendo.
    exclude: [
      "node_modules/**",
      "src/pantallas/**", "src/componentes/**", "src/escritorio/**", // versión 1
      "src/v2/**",
      "src/v4/**",
    ],
  },
});
