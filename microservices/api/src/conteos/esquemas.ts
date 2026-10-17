import { z } from "zod";

// Lo que llega sobre los sectores y los conteos (decisión 89). Solo Zod: el contrato toma de acá
// la forma de lo que manda el front, así que este archivo no importa nada del servidor.

const NOMBRE = "Hace falta el nombre del sector (por ejemplo: Estantería 1)";
const SECTOR = "Elegí el sector";
const CANTIDAD = "Decí cuántas hay (un número mayor o igual a cero)";

// POST /sectores
export const sectorNuevo = z.object({ nombre: z.string(NOMBRE).trim().min(1, NOMBRE) }, NOMBRE);
// POST /conteos: abre el conteo del sector, o retoma el que está abierto.
export const conteoNuevo = z.object({ sector_id: z.string(SECTOR).min(1, SECTOR) }, SECTOR);
// PUT /conteos/:id/renglones/:productoId
export const renglonContado = z.object({ cantidad: z.number(CANTIDAD).min(0, CANTIDAD) }, CANTIDAD);
// POST /conteos/:id/cerrar: con `faltantes_en_cero`, lo que no se contó se da por inexistente.
export const cierreDeConteo = z.object({ faltantes_en_cero: z.coerce.boolean().optional() });
