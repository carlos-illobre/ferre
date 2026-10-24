import { defineConfig } from "@playwright/test";

// El cliente web servido por `vite preview` (:4173) contra la API del compose (:80 vía
// Caddy), como lo usaría el empleado. BASE_URL permite apuntar a otro ambiente.
// La app tiene dos interfaces (RNF-04 y RNF-05) y cada una tiene sus escenarios: la de
// escritorio se elige con una ventana de notebook; la de celular, con una de teléfono.
// tests/e2e.sh, en la corrida completa, le da al celular su propio stack (E2E_CELULAR_WEB, y la
// base en comun/stack.ts): entonces las dos interfaces corren a la vez, una por stack. Dentro de
// cada interfaz los escenarios comparten la base, así que van de a uno.
const dosStacks = Boolean(process.env.E2E_CELULAR_WEB);
export default defineConfig({
  workers: dosStacks ? 2 : 1,
  // En CI, además de la lista: anotaciones de GitHub en las fallas y un JSON por escenario
  // con el que el workflow arma el resumen del job.
  reporter: process.env.CI
    ? [["list"], ["github"], ["json", { outputFile: process.env.PLAYWRIGHT_JSON ?? "resultados.json" }]]
    : [["list"]],
  // Sin video: los clips del manual de uso se graban aparte (tests/capturas/tutorial/), para que estas
  // pruebas no se hagan más lentas (ADR-004, pedido de Carlos del 2026-10-16).
  // Chromium oculta las direcciones locales detrás de nombres mDNS, que en el contenedor de las pruebas
  // no se resuelven: sin esto, la conexión directa entre dos ventanas no se podría armar (specs/023).
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:4173", trace: "retain-on-failure", video: "off", browserName: "chromium", launchOptions: { args: ["--disable-features=WebRtcHideLocalIpsWithMdns"] } },
  projects: [
    { name: "escritorio", testDir: "./escritorio", workers: 1, use: { viewport: { width: 1366, height: 768 } } },
    // El celular se reconoce por el aparato, no por el ancho (RF-84): la prueba se presenta como un teléfono.
    { name: "celular", testDir: "./celular", workers: 1, use: { ...(dosStacks ? { baseURL: process.env.E2E_CELULAR_WEB } : {}), viewport: { width: 412, height: 915 }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36" } },
  ],
});
