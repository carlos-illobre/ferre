import { describe, expect, it, vi } from "vitest";
import { crearBase, esperarLaBase } from "./conexion.js";
import { baseDePrueba } from "./pruebas/base.js";

describe("la conexión", () => {
  const base = baseDePrueba();

  it("espera a la base: si responde, sigue; si no, reintenta y pasados los intentos es un error", async () => {
    await esperarLaBase(base, 3, 1);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const ausente = crearBase("postgres://nadie:nada@127.0.0.1:1/ninguna");
    await expect(esperarLaBase(ausente, 2, 1)).rejects.toThrow("La base no respondió en 2 intentos");
    await ausente.destroy();
  });
});
