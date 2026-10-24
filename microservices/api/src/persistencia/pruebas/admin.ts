import pg from "pg";

// Las pruebas de la capa de datos usan un PostgreSQL de verdad (ADR-025). BASE_DE_PRUEBAS es la
// cadena de un usuario que puede crear bases (tests/utest.sh la arma con el .env).
export function cadena(base: string): string {
  const admin = process.env.BASE_DE_PRUEBAS;
  if (!admin) throw new Error("Falta BASE_DE_PRUEBAS: la cadena de un PostgreSQL donde las pruebas puedan crear bases (tests/utest.sh la arma).");
  const url = new URL(admin);
  url.pathname = `/${base}`;
  return url.toString();
}

// Corre algo como administrador, en la base `postgres`.
export async function comoAdmin(consulta: string): Promise<void> {
  const cliente = new pg.Client({ connectionString: cadena("postgres") });
  await cliente.connect();
  try { await cliente.query(consulta); } finally { await cliente.end(); }
}
