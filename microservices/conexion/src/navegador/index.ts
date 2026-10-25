// La parte del navegador del módulo: la central de avisos y sus indicadores (ADR-030), y el enlace
// con el otro dispositivo (ADR-027), que usa el canal de la central.
export { crearCentral } from "./central.js";
export type { Central, Espera, EstadoDelTema, OpcionesDeLaCentral, Suceso } from "./central.js";
export { crearIndicador, TABLA_DE_SIEMPRE } from "./indicador.js";
export type { Disponibilidad, Indicador, TablaDelIndicador } from "./indicador.js";
export { crearEnlace } from "./enlace.js";
export type { Conexion, Enlace, EstadoDelEnlace, OpcionesDelEnlace } from "./enlace.js";
export type { Almacen } from "./memoria.js";
export type { Motivo } from "../comun/mensajes.js";
export { CABECERA_A_CUESTAS } from "../comun/temas.js";
