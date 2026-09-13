// Única puerta a la API. El origen se fija al construir (ADR-010): falta = error al
// construir, no un fallback silencioso.
const origen = import.meta.env.VITE_API_URL;
if (origen === undefined) throw new Error("Falta VITE_API_URL al construir el cliente web");

export function urlApi(ruta: string): string {
  return `${origen}${ruta}`;
}

export class ErrorApi extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}

// Todas las llamadas llevan el token de sesión si existe. Un 401 significa que la
// sesión ya no vale: se borra y la app vuelve al login.
export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const cabeceras = new Headers(opciones.headers);
  // Un FormData (subida de archivos) fija su propio Content-Type con el separador.
  if (!(opciones.body instanceof FormData)) cabeceras.set("Content-Type", "application/json");
  const token = leerToken();
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  const respuesta = await fetch(urlApi(ruta), { ...opciones, headers: cabeceras });
  if (respuesta.status === 401 && token) {
    borrarToken();
    window.dispatchEvent(new Event("sesion-cerrada"));
  }
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
    throw new ErrorApi(respuesta.status, cuerpo.error ?? `Error ${respuesta.status}`);
  }
  return respuesta.status === 204 ? (undefined as T) : ((await respuesta.json()) as T);
}

// El token de sesión vive en este dispositivo (ADR-011). Sin conexión, sigue valiendo.
const CLAVE = "ferre.sesion";
export function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}
export function guardarToken(token: string): void {
  localStorage.setItem(CLAVE, token);
}
export function borrarToken(): void {
  localStorage.removeItem(CLAVE);
}
