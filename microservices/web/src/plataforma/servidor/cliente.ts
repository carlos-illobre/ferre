// Un cliente para hablar con un servidor que pide una sesión en la cabecera. Sirve para
// cualquier aplicación: quien lo usa dice dónde está el servidor, bajo qué clave guarda el
// token en el dispositivo, y qué hacer cuando la sesión deja de valer o cuando algo se guardó.
export class ErrorDelServidor extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}

// Que el pedido no llegó al servidor: sin red, fetch falla con un TypeError. Cualquier otro
// error (el servidor contestó con un error, una respuesta que no se entiende) no es falta de red.
export const esFaltaDeRed = (e: unknown): boolean =>
  e instanceof TypeError || (typeof navigator !== "undefined" && navigator.onLine === false && !(e instanceof ErrorDelServidor));

export type OpcionesDeCliente = {
  origen: string;
  // La clave bajo la que el token de sesión vive en este dispositivo. Sin conexión, sigue valiendo.
  claveDelToken: string;
  // El servidor contestó que la sesión ya no vale (401): el token ya se borró. Se pasa el token
  // perdido por si quien usa el cliente lo necesita una última vez.
  alPerderLaSesion?: (tokenPerdido: string) => void;
  // Un pedido que no era de lectura salió bien: algo cambió en el servidor.
  alGuardar?: (ruta: string) => void;
  // Llegó una respuesta del servidor, cualquiera: para mirar sus cabeceras.
  alContestar?: (respuesta: Response) => void;
  // Un pedido no llegó al servidor (falta de red).
  alNoLlegar?: () => void;
};

async function fallar(respuesta: Response): Promise<never> {
  const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
  throw new ErrorDelServidor(respuesta.status, cuerpo.error ?? `Error ${respuesta.status}`);
}

// Las cabeceras de un pedido: el token de sesión, si existe, y JSON salvo en una subida de
// archivos (un FormData fija su propio Content-Type con el separador).
function cabecerasDe(pedido: RequestInit, token: string | null): Headers {
  const cabeceras = new Headers(pedido.headers);
  if (!(pedido.body instanceof FormData)) cabeceras.set("Content-Type", "application/json");
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  return cabeceras;
}

// Dispara la descarga de un archivo ya bajado.
function guardarArchivo(blob: Blob, nombre: string): void {
  const direccion = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = direccion;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(direccion), 10_000);
}

const esDeLectura = (pedido: RequestInit) => !pedido.method || pedido.method === "GET";

export function crearCliente(opciones: OpcionesDeCliente) {
  const url = (ruta: string): string => `${opciones.origen}${ruta}`;
  function leerToken(): string | null {
    try { return localStorage.getItem(opciones.claveDelToken); } catch { return null; }
  }
  const guardarToken = (token: string): void => localStorage.setItem(opciones.claveDelToken, token);
  const borrarToken = (): void => localStorage.removeItem(opciones.claveDelToken);
  // El pedido: si no llega al servidor, se avisa y sigue el error. Uno cancelado a propósito no
  // dice nada de la conexión.
  const llegar = (ruta: string, pedido: RequestInit) => fetch(url(ruta), pedido).catch((e: unknown) => {
    if (!(e instanceof DOMException && e.name === "AbortError")) opciones.alNoLlegar?.();
    throw e;
  });
  // Un 401 significa que la sesión ya no vale: se borra y se avisa.
  function revisar(respuesta: Response, token: string | null): void {
    opciones.alContestar?.(respuesta);
    if (respuesta.status === 401 && token) { borrarToken(); opciones.alPerderLaSesion?.(token); }
  }

  // Todas las llamadas llevan el token de sesión si existe.
  async function pedir<T>(ruta: string, pedido: RequestInit = {}): Promise<T> {
    const token = leerToken();
    const respuesta = await llegar(ruta, { ...pedido, headers: cabecerasDe(pedido, token) });
    revisar(respuesta, token);
    if (!respuesta.ok) await fallar(respuesta);
    if (!esDeLectura(pedido)) opciones.alGuardar?.(ruta);
    return respuesta.status === 204 ? (undefined as T) : ((await respuesta.json()) as T);
  }

  // Bajar un archivo con la sesión puesta. Un enlace común no sirve: el token va en la
  // cabecera, no en una cookie. Se pide, se arma un blob y se dispara la descarga.
  async function descargar(ruta: string, nombre: string): Promise<void> {
    const token = leerToken();
    const cabeceras = new Headers();
    if (token) cabeceras.set("Authorization", `Bearer ${token}`);
    const respuesta = await llegar(ruta, { headers: cabeceras });
    opciones.alContestar?.(respuesta);
    if (!respuesta.ok) await fallar(respuesta);
    guardarArchivo(await respuesta.blob(), nombre);
  }

  return { url, pedir, descargar, leerToken, guardarToken, borrarToken };
}
