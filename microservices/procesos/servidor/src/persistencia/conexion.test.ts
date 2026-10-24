import { sql } from "kysely";
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

  it("si la base corta una conexión sin uso, el proceso sigue y la base vuelve a responder", async () => {
    const anotar = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await Promise.all([sql`SELECT pg_sleep(0.05)`.execute(base), sql`SELECT pg_sleep(0.05)`.execute(base)]);
    await sql`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
              WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = 'idle'`.execute(base);
    await vi.waitFor(() => expect(anotar).toHaveBeenCalledWith(expect.stringMatching(/^procesos: se perdió una conexión sin uso/)));
    await esperarLaBase(base, 1, 1);
  });
});
