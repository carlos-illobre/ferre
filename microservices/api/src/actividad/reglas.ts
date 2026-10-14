import { base } from "../base.js";
import * as datos from "./datos.js";

// De a 10 por página (pedido del dueño): «quién hizo qué» crece todos los días y no se lee entero.
export const POR_PAGINA = 10;

export async function pagina(f: datos.Filtros, numero: unknown) {
  const nro = Math.max(1, Number(numero) || 1);
  const [eventos, total] = await Promise.all([datos.pagina(base, f, POR_PAGINA, (nro - 1) * POR_PAGINA), datos.cuantos(base, f)]);
  return { eventos, total, pagina: nro, por_pagina: POR_PAGINA };
}
