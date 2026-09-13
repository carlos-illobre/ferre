import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_API_URL: origen de la API (https://api.dominio en producción, http://localhost en
// desarrollo con el compose). VITE_BASE: ruta base cuando se publica bajo un subdirectorio
// de GitHub Pages ("/ferre/"); "/" con dominio propio o en local.
export default defineConfig(({ command }) => {
  // Falta = error al construir, no un fallback silencioso. Los tests no construyen.
  if (command === "build" && process.env.VITE_API_URL === undefined) {
    throw new Error("Falta VITE_API_URL al construir el cliente web");
  }
  return {
    plugins: [react()],
    base: process.env.VITE_BASE ?? "/",
    build: { outDir: "dist", emptyOutDir: true },
  };
});
