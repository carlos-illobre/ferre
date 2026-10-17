import { z } from "zod";

// Lo que llega sobre los duplicados (decisión 89). Solo Zod: el contrato toma de acá la forma de
// lo que manda el front, así que este archivo no importa nada del servidor.

const DOS = "Elegí dos productos distintos";
const ABSORBIDO = "Falta absorbido_id";

// POST /equivalencias/:id/unir y /:id/rechazar: qué lado se conserva al unir (si no se dice, el «a»).
export const resolverSugerencia = z.object({ conservar: z.enum(["a", "b"], "Elegí qué producto se conserva: a o b").optional() });

// POST /equivalencias/unir: unir a mano dos productos cualesquiera.
export const unirAMano = z.object({ conservar_id: z.string(DOS).min(1, DOS), absorber_id: z.string(DOS).min(1, DOS) }, DOS)
  .refine((u) => u.conservar_id !== u.absorber_id, DOS);

// POST /equivalencias/separar: deshacer una unión.
export const separar = z.object({ absorbido_id: z.string(ABSORBIDO).min(1, ABSORBIDO) }, ABSORBIDO);
