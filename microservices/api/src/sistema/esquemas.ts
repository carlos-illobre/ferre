import { z } from "zod";

// Lo que llega para cambiar los ajustes del sistema (specs/020). Solo Zod: el contrato toma de acá
// la forma de lo que manda el front, así que este archivo no importa nada del servidor.

// Los tramos que se pueden elegir en Más → Sistema (decisión 147), en segundos.
export const TRAMOS_DE_SESION = [0, 30, 60, 300, 600] as const;

const SESION = "Cuánto recuerda la sesión puede ser: no recordarla, 30 segundos, 1, 5 o 10 minutos";
const DIAS = "Los días del vínculo tienen que ser un número entero entre 1 y 365";
const tramo = (tramos: readonly number[], mensaje: string) => z.number(mensaje).refine((n) => tramos.includes(n), mensaje);

// PUT /sistema/ajustes: uno o los dos.
export const cambiosDeAjustes = z.object({
  sesion_segundos: tramo(TRAMOS_DE_SESION, SESION).optional(),
  vinculo_dias: z.number(DIAS).int(DIAS).min(1, DIAS).max(365, DIAS).optional(),
}, "Los ajustes van como un objeto").refine((a) => Object.values(a).some((v) => v !== undefined), "No hay nada que cambiar");
