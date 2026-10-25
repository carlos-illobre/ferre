import { CABECERA_A_CUESTAS, crearCentral, crearIndicador } from "conexion-entre-dispositivos/navegador";
import { crearCliente, ErrorDelServidor, esFaltaDeRed } from "../../plataforma/servidor";
import { reducirImagen } from "../../plataforma/imagenes";
import type { FotoSubida } from "@servidor/productos";
import { deEsteAmbiente } from "../../plataforma/ambiente";

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
  claveDelToken: deEsteAmbiente("ferre.sesion"),
  // La sesión ya no vale: la aplicación vuelve a la entrada. El token perdido va en el aviso: con
  // él se sube lo que la persona dejó sin mandar, si la desactivaron (cola.ts, ADR-021).
  alPerderLaSesion: (token) => window.dispatchEvent(new CustomEvent(EVENTO_SESION_CERRADA, { detail: { token } })),
  alGuardar: (ruta) => window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO, { detail: ruta })),
  // Cada respuesta trae a cuestas lo permanente (la versión); un pedido que no llega dice que no
  // hay conexión (ADR-030).
  alContestar: (respuesta) => avisos.respondio(respuesta.headers?.get(CABECERA_A_CUESTAS) ?? null),
  alNoLlegar: () => avisos.fallo(),
});

// La central de avisos del dispositivo (specs/025, ADR-030): lo que se espera del otro lado, por el
// canal único con la sesión puesta. El canal lleva un nombre por pestaña: abrir otro reemplaza al
// anterior de la misma pestaña, no al de otra.
const pestana = crypto.randomUUID();
export const avisos = crearCentral({
  url: cliente.url("/canal"),
  cabeceras: () => {
    const token = cliente.leerToken();
    return { "X-Canal": pestana, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  },
});
// Si hay conexión con el servidor, sin preguntar: lo que muestran las respuestas, el navegador y el
// canal (RF-143). Arranca con lo que dice el navegador.
export const conexion = crearIndicador(avisos.sucesos, typeof navigator !== "undefined" && navigator.onLine === false ? "sin-conexion" : "en-linea");

// La sesión se cerró en el servidor (avisado por el canal): como un 401, vuelve a la entrada.
export function perderLaSesion() {
  const token = cliente.leerToken();
  if (!token) return;
  cliente.borrarToken();
  window.dispatchEvent(new CustomEvent(EVENTO_SESION_CERRADA, { detail: { token } }));
}

export { ErrorDelServidor as ErrorApi, esFaltaDeRed };
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
