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
};

export function crearCliente(opciones: OpcionesDeCliente) {
  const url = (ruta: string): string => `${opciones.origen}${ruta}`;

  function leerToken(): string | null {
    try { return localStorage.getItem(opciones.claveDelToken); } catch { return null; }
  }
  function guardarToken(token: string): void { localStorage.setItem(opciones.claveDelToken, token); }
  function borrarToken(): void { localStorage.removeItem(opciones.claveDelToken); }

  async function fallar(respuesta: Response): Promise<never> {
    const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
    throw new ErrorDelServidor(respuesta.status, cuerpo.error ?? `Error ${respuesta.status}`);
  }

  // Todas las llamadas llevan el token de sesión si existe. Un 401 significa que la sesión ya
  // no vale: se borra y se avisa.
  async function pedir<T>(ruta: string, opcionesDelPedido: RequestInit = {}): Promise<T> {
    const cabeceras = new Headers(opcionesDelPedido.headers);
    // Un FormData (subida de archivos) fija su propio Content-Type con el separador.
    if (!(opcionesDelPedido.body instanceof FormData)) cabeceras.set("Content-Type", "application/json");
    const token = leerToken();
    if (token) cabeceras.set("Authorization", `Bearer ${token}`);
    const respuesta = await fetch(url(ruta), { ...opcionesDelPedido, headers: cabeceras });
    if (respuesta.status === 401 && token) {
      borrarToken();
      opciones.alPerderLaSesion?.(token);
    }
    if (!respuesta.ok) await fallar(respuesta);
    if (opcionesDelPedido.method && opcionesDelPedido.method !== "GET") opciones.alGuardar?.(ruta);
    return respuesta.status === 204 ? (undefined as T) : ((await respuesta.json()) as T);
  }

  // Bajar un archivo con la sesión puesta. Un enlace común no sirve: el token va en la
  // cabecera, no en una cookie. Se pide, se arma un blob y se dispara la descarga.
  async function descargar(ruta: string, nombre: string): Promise<void> {
    const cabeceras = new Headers();
    const token = leerToken();
    if (token) cabeceras.set("Authorization", `Bearer ${token}`);
    const respuesta = await fetch(url(ruta), { headers: cabeceras });
    if (!respuesta.ok) await fallar(respuesta);
    const direccion = URL.createObjectURL(await respuesta.blob());
    const a = document.createElement("a");
    a.href = direccion;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(direccion), 10_000);
  }

  return { url, pedir, descargar, leerToken, guardarToken, borrarToken };
}
