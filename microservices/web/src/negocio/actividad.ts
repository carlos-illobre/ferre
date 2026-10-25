import { useDelServidor } from "./del-servidor";
import type { Evento, Grupos, PaginaDeEventos } from "@auditoria/reportes";

// Quién hizo qué (el registro de acciones), una sola vez para el celular y la computadora (RNF-60).
// Lo arma Auditoría con lo que mandan todos los servicios (specs/027): cada acción trae su título,
// su detalle y su grupo, así que acá no se conoce ningún tipo.
export type { Evento, PaginaDeEventos };
export type FiltrosDeActividad = { pagina: number; usuario?: string; grupo?: string; tipo?: string; desde?: string; hasta?: string };

// `desde` y `hasta` van como momentos (ISO); quien filtra por días los arma.
export function useActividad(f: FiltrosDeActividad) {
  const consulta = new URLSearchParams({ pagina: String(f.pagina) });
  for (const k of ["usuario", "grupo", "tipo", "desde", "hasta"] as const) if (f[k]) consulta.set(k, f[k]!);
  return useDelServidor<PaginaDeEventos>(["auditoria", consulta.toString()], `/auditoria?${consulta}`, { mantenerAnterior: true });
}

// Los grupos que hay, para el filtro «qué»: un servicio nuevo suma los suyos sin tocar la web.
export const useGrupos = () => useDelServidor<Grupos>(["auditoria", "grupos"], "/auditoria/grupos").datos?.grupos ?? [];

export const paginasDe = (d: PaginaDeEventos | null): number => (d ? Math.max(1, Math.ceil(d.total / d.por_pagina)) : 1);

// Los filtros del registro, iguales en el celular y la computadora: quién, qué (un grupo, o un tipo
// de los que se cuentan aparte), el período (hoy, ayer, esta semana o un rango de días) y la página.
export type Periodo = "hoy" | "ayer" | "semana" | "rango";
export type FiltrosDelRegistro = { usuario: string; grupo: string; tipo: string; periodo: Periodo; desde: string; hasta: string };
export const AL_ABRIR_EL_REGISTRO: FiltrosDelRegistro = { usuario: "", grupo: "", tipo: "", periodo: "hoy", desde: "", hasta: "" };
export const conFiltros = (f: FiltrosDelRegistro) => Boolean(f.usuario || f.grupo || f.tipo || f.periodo !== "hoy");

// Qué acciones se cuentan en «de la N a la M de T».
export function rangoDeLaPagina(d: PaginaDeEventos | null) {
  return { desde: d && d.total ? (d.pagina - 1) * d.por_pagina + 1 : 0, hasta: d ? Math.min(d.total, d.pagina * d.por_pagina) : 0 };
}

// Quién lo hizo, con el nombre que tenía en ese momento; sin nadie, el sistema.
export const nombreDe = (e: Evento) => e.quien?.nombre ?? null;
// El primer nombre de quien lo hizo, o «El sistema».
export const primerNombre = (n: string | null) => (n ? n.split(/\s+/)[0]! : "El sistema");
