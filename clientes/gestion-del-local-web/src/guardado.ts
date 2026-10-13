import { preferencias } from "./preferencias";

// Si este dispositivo guarda los datos del negocio (RF-81). La computadora, siempre. El celular
// es de quien trabaja y tiene poco lugar: guarda solo si la persona habilitó «Trabajar sin
// conexión» en Configuración. Sin eso queda lo mínimo para mantener la sesión y el vínculo.
// «Celular» es lo mismo que decide qué interfaz se abre: el ancho de la ventana.
const ANCHO_DE_COMPUTADORA = 900;
export const esCelularAca = (): boolean => typeof window !== "undefined" && window.innerWidth < ANCHO_DE_COMPUTADORA;
export const guardaEnElDispositivo = (): boolean => !esCelularAca() || preferencias().sinConexion;
// Con el guardado deshabilitado, cómo se buscan los productos (RF-82).
export const buscaEnElServidor = (): boolean => !guardaEnElDispositivo() && preferencias().buscar === "servidor";

export const SIN_CONEXION_Y_SIN_GUARDADO = "Sin conexión: no se registró. Este celular no guarda nada; para trabajar sin conexión, habilitalo en Más → Configuración.";
