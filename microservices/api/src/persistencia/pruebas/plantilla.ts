import type { GlobalSetupContext } from "vitest/node";
import { cadena, comoAdmin } from "./admin.js";

declare module "vitest" {
  export interface ProvidedContext { plantilla: string }
}

// Una base migrada una vez por corrida: cada archivo de pruebas copia la suya de esta.
export default async function ({ provide }: GlobalSetupContext) {
  const nombre = `plantilla_${process.pid}_${Date.now()}`;
  await comoAdmin(`CREATE DATABASE ${nombre}`);
  await import("../../pruebas/preparar.js");
  process.env.DATABASE_URL = cadena(nombre);
  const { migrar } = await import("../migrar.js");
  const { pool } = await import("../pool.js");
  await migrar();
  await pool.end();
  provide("plantilla", nombre);
  return () => comoAdmin(`DROP DATABASE ${nombre} WITH (FORCE)`);
}
