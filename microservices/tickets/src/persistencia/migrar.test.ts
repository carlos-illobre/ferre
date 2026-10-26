import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "kysely";
import { describe, expect, it } from "vitest";
import { migrar } from "./migrar.js";
import { baseDePrueba } from "./pruebas/base.js";

// 028: las tablas de Tickets quedan en su base, en su esquema, con su propio registro.
describe("las migraciones de Tickets", () => {
  const base = baseDePrueba();

  it("si una falla, no queda aplicada y el error dice cuál", async () => {
    const carpeta = await mkdtemp(path.join(tmpdir(), "tickets-"));
    await writeFile(path.join(carpeta, "0001_mal.sql"), "CREATE TABLA mal");
    await expect(migrar(base, carpeta)).rejects.toThrow(/La migración 0001_mal.sql de tickets falló: .*syntax error/);
  });

  it("028: en una base vacía aplica las suyas una sola vez, en el esquema tickets", async () => {
    expect(await migrar(base)).toEqual(["0001_tickets.sql"]);
    expect(await migrar(base)).toEqual([]);
    const { rows } = await sql<{ table_name: string }>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'tickets' ORDER BY 1`.execute(base);
    expect(rows.map((r) => r.table_name)).toEqual(["kysely_migration", "kysely_migration_lock", "ticket", "ticket_foto"]);
  });
});
