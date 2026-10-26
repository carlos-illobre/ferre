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
  listasDeProveedoresUrl: obligatoria("LISTAS_DE_PROVEEDORES_URL"),
  // Dónde se guardan los archivos originales de las listas cargadas (volumen del compose).
  carpetaListas: obligatoria("CARPETA_LISTAS"),
  // Qué versión corre (la imagen); la salud la dice. No cambia el comportamiento.
  version: obligatoria("VERSION"),
  // Dónde está Auditoría (specs/027). Es la única que puede faltar, a propósito: sin ella, Comercial
  // funciona igual y no manda sus eventos (decisión 167).
  auditoriaUrl: process.env.AUDITORIA_URL || undefined,
};
