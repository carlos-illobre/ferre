import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { listarMigraciones } from "./migraciones.js";

// Lo único con lógica propia del corredor: el orden y el filtro de archivos. Aplicarlas
// de verdad se prueba contra el stack en tests/integration/migraciones.sh.
describe("listarMigraciones", () => {
  it("devuelve solo los .sql, ordenados por nombre", async () => {
    const carpeta = await mkdtemp(path.join(tmpdir(), "mig-"));
    await writeFile(path.join(carpeta, "0002_b.sql"), "");
    await writeFile(path.join(carpeta, "0001_a.sql"), "");
    await writeFile(path.join(carpeta, "notas.md"), "");
    expect(await listarMigraciones(carpeta)).toEqual(["0001_a.sql", "0002_b.sql"]);
  });
});
