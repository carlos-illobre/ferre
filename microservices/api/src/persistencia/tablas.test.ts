import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

// La forma de las tablas (`tablas.ts`) se genera de la base migrada, no se escribe a mano
// (ADR-025). Si una migración la cambia, esto falla hasta correr `pnpm tablas`.
const GENERADOR = fileURLToPath(new URL("../../node_modules/.bin/kysely-codegen", import.meta.url));
const TABLAS = fileURLToPath(new URL("./tablas.ts", import.meta.url));

describe("tablas.ts", () => {
  it("coincide con lo que dejan las migraciones", () => {
    execFileSync(GENERADOR, [...(process.env.ACTUALIZAR_TABLAS ? [] : ["--verify"]), "--url", process.env.DATABASE_URL!, "--out-file", TABLAS, "--exclude-pattern", "kysely_*", "--log-level", "error"], { stdio: "pipe" });
  });
});
