// Única puerta a la API. El origen se fija al construir (ADR-010): falta = error al
// construir, no un fallback silencioso.
const origen = import.meta.env.VITE_API_URL;
if (origen === undefined) throw new Error("Falta VITE_API_URL al construir el cliente web");

export function urlApi(ruta: string): string {
  return `${origen}${ruta}`;
}
