// La parte del servidor del módulo: los canales (ADR-030, que siguen a la central de ADR-027) y lo
// que va a cuestas en cada respuesta.
export { crearCanales, rechazar, MAXIMO_POR_MENSAJE, MAXIMO_POR_TANDA } from "./canales.js";
export type { Canales, OpcionesDeLosCanales, TemaAbierto } from "./canales.js";
export { crearACuestas } from "./a-cuestas.js";
export type { LoQueVaACuestas } from "./a-cuestas.js";
export { CABECERA_A_CUESTAS, CABECERA_DE_TEMAS, leerTemas } from "../comun/temas.js";
export type { PedidoDeTema } from "../comun/temas.js";
