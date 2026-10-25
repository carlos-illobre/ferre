import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "kysely";
import { describe, expect, it } from "vitest";
import { migrar } from "./migrar.js";
import { baseDePrueba } from "./pruebas/base.js";

// 022-E08: las tablas de Procesos quedan en su base, en su esquema, con su propio registro.
describe("las migraciones de Procesos", () => {
  const base = baseDePrueba();

  it("si una falla, no queda aplicada y el error dice cuál", async () => {
    const carpeta = await mkdtemp(path.join(tmpdir(), "procesos-"));
    await writeFile(path.join(carpeta, "0001_mal.sql"), "CREATE TABLA mal");
    await expect(migrar(base, carpeta)).rejects.toThrow(/La migración 0001_mal.sql de procesos falló: .*syntax error/);
  });

  it("022-E08: en una base vacía aplica las del módulo una sola vez, en el esquema procesos", async () => {
    expect(await migrar(base)).toEqual(["0001_procesos.sql", "0002_eventos.sql", "0003_eventos_a_auditoria.sql"]);
    expect(await migrar(base)).toEqual([]);
    const { rows } = await sql<{ table_name: string }>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'procesos' ORDER BY 1`.execute(base);
    expect(rows.map((r) => r.table_name)).toEqual(["kysely_migration", "kysely_migration_lock", "proceso", "version"]);
  });
});
