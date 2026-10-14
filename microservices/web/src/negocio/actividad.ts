import { useDelServidor } from "./del-servidor";

// Quién hizo qué (el registro de acciones), una sola vez para el celular y la computadora (RNF-60).
export type Evento = { id: string; tipo: string; fecha: string; email: string | null; nombre: string | null; contenido: Record<string, unknown> };
export type PaginaDeEventos = { eventos: Evento[]; total: number; pagina: number; por_pagina: number };
export type FiltrosDeActividad = { pagina: number; usuario?: string; tipo?: string; desde?: string; hasta?: string };

// `desde` y `hasta` van como momentos (ISO); quien filtra por días los arma.
export function useActividad(f: FiltrosDeActividad) {
  const consulta = new URLSearchParams({ pagina: String(f.pagina) });
  for (const k of ["usuario", "tipo", "desde", "hasta"] as const) if (f[k]) consulta.set(k, f[k]!);
  return useDelServidor<PaginaDeEventos>(["auditoria", consulta.toString()], `/auditoria?${consulta}`, { mantenerAnterior: true });
}

export const paginasDe = (d: PaginaDeEventos | null): number => (d ? Math.max(1, Math.ceil(d.total / d.por_pagina)) : 1);
