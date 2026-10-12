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
      // Service worker (issue #18): precachea la app entera para que abra sin conexión. La API
      // y Google nunca pasan por el caché. Es «prompt» y no «autoUpdate» porque cuándo se
      // aplica una versión nueva lo decide la app (src/principal/actualizacion.ts): sola al
      // abrir, con un aviso si ya se estaba usando, para no perder una venta a medio armar.
      VitePWA({
        registerType: "prompt",
        includeAssets: ["icono.svg"],
        manifest: {
          id: "ferre",
          name: "Ferrebress",
          short_name: "Ferrebress",
          categories: ["business", "productivity"],
          orientation: "any",
          description: "Gestión del local: ventas, compras, stock y precios",
          lang: "es",
          // La app instalada abre la raíz, que es la aplicación.
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
          // La primera vez toma la página enseguida, para que ya abra sin conexión; una versión
          // nueva, en cambio, espera a que la app la aplique (no hay skipWaiting).
          clientsClaim: true,
          navigateFallback: "index.html",
          // La raíz es la aplicación. Las versiones históricas (historico/) y las páginas que
          // redirigen desde las direcciones viejas no son parte de la app instalada.
          navigateFallbackDenylist: [/\/historico\//, /\/v[1-5]\//, /\/v4-maqueta\//],
          globIgnores: ["historico/**", "v1/**", "v2/**", "v3/**", "v4/**", "v5/**", "v4-maqueta/**", "versiones.html"],
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          // Nada de la API ni de Google se cachea: siempre red.
          runtimeCaching: [],
        },
      }),
    ],
    base: process.env.VITE_BASE ?? "/",
    // La raíz es la aplicación (src/principal). Las versiones 1, 2 y 4 son históricas
    // (decisión 46): se publican bajo historico/ solo para ver su maquetado.
    build: { outDir: "dist", emptyOutDir: true, rollupOptions: { input: { principal: "index.html", v1: "historico/v1/index.html", v2: "historico/v2/index.html", v4: "historico/v4/index.html" } } },
  };
});
