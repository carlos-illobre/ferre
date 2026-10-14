import { z } from "zod";

// Lo que llega sobre los pedidos de foto (decisión 89). Solo Zod: el contrato toma de acá la forma
// de lo que manda el front, así que este archivo no importa nada del servidor.

// POST /pedidos-de-foto: para qué es la foto, que se le muestra a quien la saca (hasta 120 letras).
export const pedidoDeFotoNuevo = z.object({ para: z.string("Para qué es la foto va como texto").optional().transform((p) => p?.trim().slice(0, 120)) });
