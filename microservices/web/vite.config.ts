import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// VITE_API_URL: origen de la API (https://api.dominio en producción, http://localhost en
// desarrollo con el compose). VITE_BASE: ruta base cuando se publica bajo un subdirectorio
// de GitHub Pages ("/ferre/"); "/" con dominio propio o en local. VITE_AMBIENTE: «produccion»,
// «pruebas» o «desarrollo». VITE_VERSION: qué se construyó.
export default defineConfig(({ command, isPreview }) => {
  // Lo que cambia entre ambientes lo pone quien construye o levanta (022-E19): falta = error, no un
  // valor por omisión. `vite preview` sirve lo ya construido; las pruebas tienen el suyo en vitest.config.ts.
  const exigidas = command === "build" ? ["VITE_API_URL", "VITE_BASE", "VITE_AMBIENTE", "VITE_VERSION"] : isPreview ? [] : ["VITE_API_URL", "VITE_AMBIENTE", "VITE_VERSION"];
  for (const variable of exigidas) if (process.env[variable] === undefined) throw new Error(`Falta ${variable} para el cliente web`);
  return {
    plugins: [
      react(),
      // Service worker (issue #18): precachea la app entera para que abra sin conexión. La API
      // y Google nunca pasan por el caché. Es «prompt» y no «autoUpdate» porque cuándo se
      // aplica una versión nueva lo decide la app (src/pantallas/actualizacion.ts): sola al
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
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          // Procesos (con bpmn-js, unos 600 KB) se baja solo al entrar a Procesos, no en cada
          // dispositivo al instalar (ADR-019).
          // El manual de uso (capturas y clips) tampoco: no ocupa lugar en cada dispositivo (012, E09).
          // Las maquetas navegables (/v1 a /v4, decisión 113) tampoco, y abrirlas no tiene que
          // mostrar la aplicación en su lugar.
          globIgnores: ["**/procesos-*.{js,css}", "**/manual/**", "**/maquetas/**", "**/v1/**", "**/v2/**", "**/v3/**", "**/v4/**"],
          navigateFallbackDenylist: [/\/maquetas\//, /\/v[1234](\/|$)/],
          // Nada de la API ni de Google se cachea: siempre red.
          runtimeCaching: [],
        },
      }),
    ],
    base: process.env.VITE_BASE,
    // La raíz es la aplicación (src/pantallas): es la única que hay (decisión 83).
    build: {
      outDir: "dist",
      emptyOutDir: true,
      // Procesos va en su propio archivo, con nombre fijo, para que el service worker lo deje afuera.
      // React, aparte: si no, Rollup lo mete en el archivo de Procesos y la aplicación lo bajaría igual.
      rollupOptions: { output: { manualChunks: (id: string) => /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id) ? "react" : (/[\\/](procesos[\\/]web|bpmn-js|diagram-js|bpmn-moddle|moddle|moddle-xml|min-dash|min-dom|tiny-svg|path-intersection|didi|ids|inherits-browser|object-refs|saxen|diagram-js-direct-editing)[\\/]/.test(id) ? "procesos" : undefined) } },
    },
  };
});
