import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll } from "vitest";

// 022-E17: las pruebas de la capa de datos usan un PostgreSQL de verdad (ADR-025). BASE_DE_PRUEBAS es la
// cadena de un usuario que puede crear bases (tests/utest.sh la arma). Cada archivo de pruebas
// tiene su propia base, vacía, que se borra al terminar: BASE_DE_TICKETS.
const admin = process.env.BASE_DE_PRUEBAS;
if (!admin) throw new Error("Falta BASE_DE_PRUEBAS: la cadena de un PostgreSQL donde las pruebas puedan crear bases (tests/utest.sh la arma).");
const comoAdmin = async (consulta: string) => {
  const cliente = new pg.Client({ connectionString: admin });
  await cliente.connect();
  try { await cliente.query(consulta); } finally { await cliente.end(); }
};

const nombre = `tickets_${randomUUID().replaceAll("-", "")}`;
await comoAdmin(`CREATE DATABASE ${nombre}`);
const url = new URL(admin);
url.pathname = `/${nombre}`;
process.env.BASE_DE_TICKETS = url.toString();

afterAll(() => comoAdmin(`DROP DATABASE ${nombre} WITH (FORCE)`));
