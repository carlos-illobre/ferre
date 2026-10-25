import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "kysely";
import { describe, expect, it } from "vitest";
import { migrar } from "./migrar.js";
import { baseDePrueba } from "./pruebas/base.js";

// 027: las tablas de Auditoría quedan en su base, en su esquema, con su propio registro.
describe("las migraciones de Auditoría", () => {
  const base = baseDePrueba();

  it("si una falla, no queda aplicada y el error dice cuál", async () => {
    const carpeta = await mkdtemp(path.join(tmpdir(), "auditoria-"));
    await writeFile(path.join(carpeta, "0001_mal.sql"), "CREATE TABLA mal");
    await expect(migrar(base, carpeta)).rejects.toThrow(/La migración 0001_mal.sql de auditoria falló: .*syntax error/);
  });

  it("027: en una base vacía aplica las suyas una sola vez, en el esquema auditoria", async () => {
    expect(await migrar(base)).toEqual(["0001_eventos.sql"]);
    expect(await migrar(base)).toEqual([]);
    const { rows } = await sql<{ table_name: string }>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'auditoria' ORDER BY 1`.execute(base);
    expect(rows.map((r) => r.table_name)).toEqual(["evento", "kysely_migration", "kysely_migration_lock"]);
  });
});
