// Lo que el servidor responde sobre los ajustes del sistema (specs/020). Solo tipos: el cliente web
// los toma al compilar (ADR-018). Lo que manda el front sale de la validación del servidor.
import type { z } from "zod";
import type { cambiosDeAjustes } from "../sistema/esquemas.js";

// GET y PUT /sistema/ajustes: lo que vale para todos, en segundos y en días.
export type ValoresDelSistema = { sesion_segundos: number; celular_segundos: number; vinculo_dias: number };
// Con los tramos que se pueden elegir de cada tiempo: los decide el servidor y la pantalla los muestra.
export type AjustesDelSistema = ValoresDelSistema & { tramos: { sesion_segundos: number[]; celular_segundos: number[] } };
export type CambiosDeAjustes = z.input<typeof cambiosDeAjustes>;
