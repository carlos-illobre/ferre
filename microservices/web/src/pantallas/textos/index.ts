import { catalogo } from "./catalogo";
import { vender } from "./vender";
import { compras } from "./compras";
import { contar } from "./contar";
import { stock } from "./stock";
import { inventario } from "./inventario";
import { usuarios } from "./usuarios";
import { configuracion } from "./configuracion";
import { conexion } from "./conexion";
import { sistema } from "./sistema";
import { entrar } from "./entrar";
import { negocio } from "./negocio";
import { tablero } from "./tablero";
import { hoy } from "./hoy";
import { ficha } from "./ficha";
import { anomaliasV2 } from "./anomaliasV2";
import { listas } from "./listas";
import { duplicados } from "./duplicados";
import { ticketsV2 } from "./ticketsV2";
import { configuracionV2 } from "./configuracionV2";

export * from "./base";
export * from "./comunes";

// Los textos de cada parte, una sola vez para las dos interfaces (decisión 47).
export const TEXTOS = { catalogo, vender, compras, contar, stock, inventario, usuarios, configuracion, conexion, sistema, entrar, negocio, tablero, hoy, ficha, anomaliasV2, listas, duplicados, ticketsV2, configuracionV2 };
