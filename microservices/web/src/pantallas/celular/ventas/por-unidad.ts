import type { Unidad } from "../../../negocio/catalogo";

// Debajo del precio: a qué cantidad corresponde.
export const POR_UNIDAD: Record<Unidad, string> = { unidad: "cada uno", kg: "el kg", m: "el metro", l: "el litro" };
