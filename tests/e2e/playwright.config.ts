import { defineConfig } from "@playwright/test";

// El cliente web servido por `vite preview` (:4173) contra la API del compose (:80 vía
// Caddy), como lo usaría el empleado. BASE_URL permite apuntar a otro ambiente.
// La app tiene dos interfaces (RNF-04 y RNF-05) y cada una tiene sus escenarios: la de
// escritorio se elige con una ventana de notebook; la de celular, con una de teléfono.
export default defineConfig({
  // Los escenarios comparten la base del compose: de a uno, para que no se pisen.
  workers: 1,
  // En CI, además de la lista: anotaciones de GitHub en las fallas y un JSON por escenario
  // con el que el workflow arma el resumen del job.
  reporter: process.env.CI
    ? [["list"], ["github"], ["json", { outputFile: process.env.PLAYWRIGHT_JSON ?? "resultados.json" }]]
    : [["list"]],
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:4173", trace: "retain-on-failure", browserName: "chromium" },
  projects: [
    { name: "escritorio", testDir: "./escritorio", use: { viewport: { width: 1366, height: 768 } } },
    { name: "celular", testDir: "./celular", use: { viewport: { width: 412, height: 915 } } },
  ],
});
