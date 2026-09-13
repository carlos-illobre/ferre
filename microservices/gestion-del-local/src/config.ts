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
  // Origen del cliente web (GitHub Pages en producción). Es el único al que la API le
  // responde desde el navegador (CORS).
  origenWeb: obligatoria("ORIGEN_WEB"),
  // ID de cliente OAuth de Google (docs/google-cloud.md). No es secreto; identifica la app.
  googleClientId: obligatoria("GOOGLE_CLIENT_ID"),
  // Dónde se guardan los archivos originales de las listas cargadas (volumen del compose).
  carpetaListas: obligatoria("CARPETA_LISTAS"),
};
