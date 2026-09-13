// Toda la configuración sale del entorno y ninguna variable tiene valor por omisión:
// una ausente corta el arranque acá, que es el único momento en que el error es barato
// (invariante 3 de la skill microservicios-base).
function obligatoria(nombre: string): string {
  const valor = process.env[nombre];
  if (valor === undefined) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return valor;
}

export const config = {
  port: Number(obligatoria("PORT")),
  databaseUrl: obligatoria("DATABASE_URL"),
  tokenServicio: obligatoria("TOKEN_SERVICIO"),
  importadorUrl: obligatoria("IMPORTADOR_URL"),
};
