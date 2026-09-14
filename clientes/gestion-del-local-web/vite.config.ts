import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// VITE_API_URL: origen de la API (https://api.dominio en producción, http://localhost en
// desarrollo con el compose). VITE_BASE: ruta base cuando se publica bajo un subdirectorio
// de GitHub Pages ("/ferre/"); "/" con dominio propio o en local.
export default defineConfig(({ command }) => {
  // Falta = error al construir, no un fallback silencioso. Los tests no construyen.
  if (command === "build" && process.env.VITE_API_URL === undefined) {
    throw new Error("Falta VITE_API_URL al construir el cliente web");
  }
  return {
    plugins: [
      react(),
      // Service worker (issue #18): precachea la app entera para que abra sin conexión y
      // se actualice sola. La API y Google nunca pasan por el caché.
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icono.svg"],
        manifest: {
          name: "ferre",
          short_name: "ferre",
          description: "Gestión del local: ventas, compras, stock y precios",
          lang: "es",
          start_url: "./",
          scope: "./",
          display: "standalone",
          background_color: "#eef0f4",
          theme_color: "#1b3f77",
          icons: [
            { src: "icono-192.png", sizes: "192x192", type: "image/png" },
            { src: "icono-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        },
        workbox: {
          navigateFallback: "index.html",
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          // Nada de la API ni de Google se cachea: siempre red.
          runtimeCaching: [],
        },
      }),
    ],
    base: process.env.VITE_BASE ?? "/",
    build: { outDir: "dist", emptyOutDir: true },
  };
});
