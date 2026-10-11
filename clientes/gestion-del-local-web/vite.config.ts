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
          id: "ferre",
          name: "Ferrebress",
          short_name: "Ferrebress",
          categories: ["business", "productivity"],
          orientation: "any",
          description: "Gestión del local: ventas, compras, stock y precios",
          lang: "es",
          // La raíz lleva a la versión que esté elegida (hoy la 5); la app instalada abre esa.
          start_url: "./",
          scope: "./",
          display: "standalone",
          background_color: "#f5f6f2",
          theme_color: "#17312b",
          icons: [
            { src: "icono-192.png", sizes: "192x192", type: "image/png" },
            { src: "icono-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        },
        workbox: {
          navigateFallback: "index.html",
          // Cada versión (/v1/ la original, /v2/, /v4/ Ferrebress) tiene su propio index.html
          // y se guarda en el dispositivo; /v3/ y /v4-maqueta/ son maquetas, que no.
          navigateFallbackDenylist: [/\/v1\//, /\/v2\//, /\/v3\//, /\/v4\//, /\/v5\//, /\/v4-maqueta\//],
          globIgnores: ["v3/**", "v4-maqueta/**"],
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          // Nada de la API ni de Google se cachea: siempre red.
          runtimeCaching: [],
        },
      }),
    ],
    base: process.env.VITE_BASE ?? "/",
    // La raíz lleva a la versión 5 (que está en /v5/); la original está en /v1/, la 2 en
    // /v2/ y la 4 en /v4/. versiones.html las lista todas.
    build: { outDir: "dist", emptyOutDir: true, rollupOptions: { input: { raiz: "index.html", v1: "v1/index.html", v2: "v2/index.html", v4: "v4/index.html", v5: "v5/index.html" } } },
  };
});
