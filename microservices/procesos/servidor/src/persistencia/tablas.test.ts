import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, it } from "vitest";
import { migrar } from "./migrar.js";
import { baseDePrueba } from "./pruebas/base.js";

// La forma de las tablas (`tablas.ts`) se genera de la base migrada, no se escribe a mano
// (ADR-025). Si una migración la cambia, esto falla hasta correr `pnpm tablas`.
const GENERADOR = fileURLToPath(new URL("../../node_modules/.bin/kysely-codegen", import.meta.url));
const TABLAS = fileURLToPath(new URL("./tablas.ts", import.meta.url));
const base = baseDePrueba();

describe("tablas.ts", () => {
  beforeAll(() => migrar(base));
  it("coincide con lo que dejan las migraciones", () => {
    execFileSync(GENERADOR, [...(process.env.ACTUALIZAR_TABLAS ? [] : ["--verify"]), "--url", process.env.BASE_DE_PROCESOS!, "--out-file", TABLAS,
      "--default-schema", "procesos", "--include-pattern", "procesos.*", "--exclude-pattern", "procesos.kysely_*", "--log-level", "error"], { stdio: "pipe" });
  });
});
