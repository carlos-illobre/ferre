import { preferencias } from "./preferencias";

// Si este dispositivo guarda los datos del negocio (RF-84): lo que falta enviar y, si se bajaron a
// mano, los datos para trabajar sin conexión (specs/018). Lo dice «Trabajar sin conexión» en
// Configuración, en el celular y en la computadora. Hasta que la persona la toca, la computadora
// guarda (como siempre) y el celular, que es de quien trabaja y tiene poco lugar, no. Sin
// guardar queda lo mínimo para mantener la sesión y el vínculo.
// «Celular» es el aparato (un teléfono o una tableta con Android o iOS), no el ancho de la
// ventana: una computadora con la ventana angosta sigue siendo una computadora, y achicarla no
// puede borrarle lo que tiene guardado.
export const esCelularAca = (): boolean => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
export const guardaEnElDispositivo = (): boolean => preferencias().sinConexion ?? !esCelularAca();
// Con el guardado deshabilitado, cómo se buscan los productos (RF-85).
export const buscaEnElServidor = (): boolean => !guardaEnElDispositivo() && preferencias().buscar === "servidor";

export const SIN_CONEXION_Y_SIN_GUARDADO = "Sin conexión: no se registró. Este celular no guarda nada; para trabajar sin conexión, habilitalo en Más → Configuración.";
