import { z } from "zod";

// Lo que llega sobre los clientes (decisión 89). Solo Zod: el contrato toma de acá la forma de lo
// que manda el front, así que este archivo no importa nada del servidor.

const NOMBRE = "Hace falta el nombre del cliente";

// POST /clientes: sin nombre no se da de alta; a cuenta corriente si no se dice otra cosa.
export const clienteNuevo = z.object({
  nombre: z.string(NOMBRE).trim().min(1, NOMBRE),
  telefono: z.string("El teléfono es un texto").trim().optional(),
  cuenta_corriente: z.boolean("cuenta_corriente es sí o no").optional(),
}, NOMBRE);
