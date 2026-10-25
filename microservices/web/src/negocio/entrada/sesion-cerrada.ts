// Si el servidor dio por terminada la sesión (la cerraron a distancia o venció), la app vuelve sola
// a la entrada y la entrada lo dice. Se anota acá porque la entrada todavía no está en pantalla
// cuando llega el aviso.
let cerradaPorElServidor = false;
if (typeof window !== "undefined") window.addEventListener("sesion-cerrada", () => { cerradaPorElServidor = true; });
export const sesionCerradaPorElServidor = () => cerradaPorElServidor;
export const olvidarSesionCerrada = () => { cerradaPorElServidor = false; };
