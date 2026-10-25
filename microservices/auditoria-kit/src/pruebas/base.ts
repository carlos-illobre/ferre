import pg from "pg";
import type { GlobalSetupContext } from "vitest/node";
import type {} from "vitest";

declare module "vitest" {
  export interface ProvidedContext { conexion: string }
}

// Una base vacía por corrida, en el PostgreSQL de las pruebas (BASE_DE_PRUEBAS, como la capa de
// datos de cada servicio; tests/utest.sh la arma). Se borra al terminar.
export default async function ({ provide }: GlobalSetupContext) {
  const admin = process.env.BASE_DE_PRUEBAS;
  if (!admin) throw new Error("Falta BASE_DE_PRUEBAS: la cadena de un PostgreSQL donde las pruebas puedan crear bases (tests/utest.sh la arma).");
  const nombre = `kit_auditoria_${process.pid}_${Date.now()}`;
  const como = async (consulta: string) => { const c = new pg.Client({ connectionString: admin }); await c.connect(); try { await c.query(consulta); } finally { await c.end(); } };
  await como(`CREATE DATABASE ${nombre}`);
  const url = new URL(admin);
  url.pathname = `/${nombre}`;
  provide("conexion", url.toString());
  return () => como(`DROP DATABASE ${nombre} WITH (FORCE)`);
}
