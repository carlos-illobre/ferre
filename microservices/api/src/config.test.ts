import { afterEach, describe, expect, it, vi } from "vitest";

// 022-E19: una variable que falta en el .env corta el arranque con un mensaje que la nombra; no hay
// valores por omisión.
describe("la configuración", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it("022-E19: sin una variable, no arranca y dice cuál falta", async () => {
    vi.stubEnv("VERSION", undefined as never);
    vi.resetModules();
    await expect(import("./config.js")).rejects.toThrow("Falta la variable de entorno VERSION");
  });

  it("con todas, toma cada una del entorno", async () => {
    vi.stubEnv("VERSION", "abc1234");
    vi.resetModules();
    expect((await import("./config.js")).config.version).toBe("abc1234");
  });
});
