import { z } from "zod";

// Lo que llega sobre el stock (decisión 89). Solo Zod: el contrato toma de acá la forma de lo que
// manda el front, así que este archivo no importa nada del servidor.

const CANTIDAD = "Decí cuántas hay (un número mayor o igual a cero)";
const MOTIVO = "Falta el motivo: sin motivo no se guarda";

// POST /stock/:productoId/ajustes: «hay tantas», con el motivo, que es obligatorio (RF-53).
export const ajusteDeStock = z.object({
  cantidad_real: z.number(CANTIDAD).min(0, CANTIDAD),
  motivo: z.string(MOTIVO).trim().min(1, MOTIVO),
}, CANTIDAD);
