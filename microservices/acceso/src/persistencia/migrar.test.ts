import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "kysely";
import { describe, expect, it } from "vitest";
import { base } from "./conexion.js";
import { migrar } from "./migrar.js";

// 022-E01, 022-E07: el esquema queda al día al arrancar; una migración se aplica una sola vez.
describe("las migraciones", () => {
  it("022-E07: con la base ya migrada no aplica nada otra vez", async () => {
    expect(await migrar()).toEqual([]);
    const { rows } = await sql<{ n: string }>`SELECT count(*) AS n FROM kysely_migration`.execute(base);
    expect(Number(rows[0]!.n)).toBe(1);
  });

  it("022-E01: aplica en orden solo los .sql que falten y dice cuáles", async () => {
    const carpeta = await mkdtemp(path.join(tmpdir(), "migraciones-"));
    await writeFile(path.join(carpeta, "0001_a.sql"), "CREATE TABLE prueba_a (id int)");
    await writeFile(path.join(carpeta, "0002_b.sql"), "CREATE TABLE prueba_b (id int); INSERT INTO prueba_b VALUES (1)");
    await writeFile(path.join(carpeta, "notas.md"), "no es una migración");
    await sql`DELETE FROM kysely_migration`.execute(base);
    expect(await migrar(carpeta)).toEqual(["0001_a.sql", "0002_b.sql"]);
    expect(await migrar(carpeta)).toEqual([]);
  });

  it("si una falla, no queda aplicada y el error dice cuál", async () => {
    const carpeta = await mkdtemp(path.join(tmpdir(), "migraciones-"));
    await writeFile(path.join(carpeta, "0001_bien.sql"), "CREATE TABLE prueba_c (id int)");
    await writeFile(path.join(carpeta, "0002_mal.sql"), "CREATE TABLA mal");
    await sql`DELETE FROM kysely_migration`.execute(base);
    await expect(migrar(carpeta)).rejects.toThrow(/La migración 0002_mal.sql falló: .*syntax error/);
    const { rows } = await sql<{ existe: boolean }>`SELECT to_regclass('prueba_c') IS NOT NULL AS existe`.execute(base);
    expect(rows[0]!.existe).toBe(false);
  });
});
