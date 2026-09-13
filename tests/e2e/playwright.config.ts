import { defineConfig } from "@playwright/test";

// Contra el stack levantado por docker compose, a través del proxy, como lo usaría el
// empleado. BASE_URL permite apuntar a otro ambiente.
export default defineConfig({
  testDir: "./escenarios",
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL ?? "http://localhost", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
