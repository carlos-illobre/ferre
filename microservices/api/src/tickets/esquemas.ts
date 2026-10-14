import { z } from "zod";

// Lo que llega sobre los tickets en JSON (decisión 89). Solo Zod: el contrato toma de acá la forma
// de lo que manda el front, así que este archivo no importa nada del servidor. El alta llega
// como formulario con fotos y se valida en las reglas, porque una foto grande es un 413.

// POST /tickets/:id/resolver: con una nota de qué se hizo, de hasta 2.000 letras.
export const resolucionDeTicket = z.object({ nota: z.string("La nota es un texto").optional() });
