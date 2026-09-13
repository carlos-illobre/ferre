import { defineConfig } from "@playwright/test";

// El cliente web servido por `vite preview` (:4173) contra la API del compose (:80 vía
// Caddy), como lo usaría el empleado. BASE_URL permite apuntar a otro ambiente.
export default defineConfig({
  testDir: "./escenarios",
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:4173", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
