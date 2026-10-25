import type { Linea } from "../../motor/tabla";
import { DE_CUALQUIER_PANTALLA } from "../comunes";
import { DEL_MARCO } from "./marco";
import { DE_VENDER } from "./vender";
import { DEL_DIA } from "./hoy";
import { DE_PRODUCTOS, ETIQUETAS_DE_PRODUCTOS } from "./productos";
import { DE_DUPLICADOS } from "./duplicados";
import { DE_LISTAS } from "./listas";
import { DEL_DEPOSITO } from "./deposito";
import { DE_COMPRAS } from "./compras";

// Las teclas de la computadora: qué tecla pide cada acción que ofrecen las pantallas (ADR-029).
// Las teclas mismas se rehacen en T147.
export const TABLA_DE_LA_COMPU: Linea[] = [
  ...DE_CUALQUIER_PANTALLA,
  ...DEL_MARCO,
  ...DE_VENDER,
  ...DEL_DIA,
  ...DE_PRODUCTOS,
  ...DE_DUPLICADOS,
  ...DE_LISTAS,
  ...DEL_DEPOSITO,
  ...DE_COMPRAS,
];

// Etiquetas que no son de una sola tecla.
export const ETIQUETAS_DE_LA_COMPU: Record<string, string> = { ...ETIQUETAS_DE_PRODUCTOS };
