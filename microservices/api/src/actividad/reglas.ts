import { base } from "../base.js";
import * as datos from "./datos.js";
import type { PaginaDeEventos } from "../contratos/actividad.js";
import type { Enviable } from "../enviable.js";

// De a 10 por página (pedido del dueño): «quién hizo qué» crece todos los días y no se lee entero.
export const POR_PAGINA = 10;

export async function pagina(f: datos.Filtros, numero: unknown): Promise<Enviable<PaginaDeEventos>> {
  const nro = Math.max(1, Number(numero) || 1);
  const [eventos, total] = await Promise.all([datos.pagina(base, f, POR_PAGINA, (nro - 1) * POR_PAGINA), datos.cuantos(base, f)]);
  // El detalle de cada evento es siempre un objeto: así lo anota `anotarEvento`.
  return { eventos: eventos.map((e) => ({ ...e, contenido: e.contenido as Record<string, unknown> })), total, pagina: nro, por_pagina: POR_PAGINA };
}
