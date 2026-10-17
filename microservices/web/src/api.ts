import { crearCliente, ErrorDelServidor } from "./plataforma/servidor/cliente";
import { reducirImagen } from "./plataforma/imagenes/reducir";
import type { FotoSubida } from "@servidor/productos";

// Única puerta a la API de Ferrebress. El cliente en sí es tecnología de la plataforma; acá
// se dice dónde está la API, dónde vive la sesión (ADR-011) y qué pasa cuando se pierde o
// cuando algo se guarda. El origen se fija al construir (ADR-010): falta = error al construir,
// no un fallback silencioso.
const origen = import.meta.env.VITE_API_URL;
if (origen === undefined) throw new Error("Falta VITE_API_URL al construir el cliente web");

// Lo que se guardó en el servidor puede cambiar lo que el dispositivo tiene en memoria (el
// catálogo, el stock): quien lo tenga se entera y lo vuelve a pedir cuando haga falta.
export const EVENTO_CAMBIO = "ferre:cambio-guardado";
export const EVENTO_SESION_CERRADA = "sesion-cerrada";

const cliente = crearCliente({
  origen,
  claveDelToken: "ferre.sesion",
  // La sesión ya no vale: la aplicación vuelve a la entrada. El token perdido va en el aviso: con
  // él se sube lo que la persona dejó sin mandar, si la desactivaron (cola.ts, ADR-021).
  alPerderLaSesion: (token) => window.dispatchEvent(new CustomEvent(EVENTO_SESION_CERRADA, { detail: { token } })),
  alGuardar: (ruta) => window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO, { detail: ruta })),
});

export { ErrorDelServidor as ErrorApi };
export const urlApi = cliente.url;
export const api = cliente.pedir;
export const descargar = cliente.descargar;
export const leerToken = cliente.leerToken;
export const guardarToken = cliente.guardarToken;
export const borrarToken = cliente.borrarToken;
export { reducirImagen };

// Una foto subida se guarda como "/fotos/..." (relativa a la API); una externa, completa.
export function urlDeFoto(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/") ? urlApi(url) : url;
}

// La foto del celular se achica a 800 px de lado antes de subir.
export async function subirFoto(productoId: string, archivo: File): Promise<string> {
  const datos = new FormData();
  datos.append("foto", await reducirImagen(archivo), "foto.jpg");
  const r = await api<FotoSubida>(`/productos/${productoId}/foto`, { method: "POST", body: datos });
  return r.foto_url;
}
