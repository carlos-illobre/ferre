import { MAXIMO_POR_LOTE, problemaDelEvento, type EventoMandado } from "auditoria-kit";
import * as datos from "./persistencia/eventos.js";
import type { Base } from "./persistencia/conexion.js";
import type { Grupos, PaginaDeEventos } from "./contratos/reportes.js";

// Lo que decide Auditoría (specs/027): qué lote se acepta (el contrato v1, validado con el mismo
// código que usa el kit) y cómo se arma cada reporte.
export const POR_PAGINA = 10;

export type Resultado<T> = { ok: true; cuerpo: T } | { ok: false; error: string };
const mal = (error: string) => ({ ok: false as const, error });

export function crearReglas(base: Base) {
  return {
    /** POST /v1/eventos: todo el lote o nada; un id repetido cuenta como guardado. */
    async recibir(cuerpo: unknown): Promise<Resultado<{ guardados: number }>> {
      const eventos = (cuerpo as { eventos?: unknown } | null)?.eventos;
      if (!Array.isArray(eventos) || eventos.length < 1 || eventos.length > MAXIMO_POR_LOTE) return mal(`Hace falta un lote de 1 a ${MAXIMO_POR_LOTE} eventos en «eventos»`);
      for (const [i, e] of eventos.entries()) {
        const problema = problemaDelEvento(e);
        if (problema) return mal(`Evento ${i + 1}: ${problema}`);
      }
      return { ok: true, cuerpo: { guardados: await datos.guardar(base, eventos as EventoMandado[]) } };
    },

    /** GET /auditoria: de a 10, con los filtros de siempre. */
    async reporte(f: datos.Filtros, numero: unknown): Promise<Resultado<PaginaDeEventos>> {
      if ([f.desde, f.hasta].some((d) => d !== null && Number.isNaN(Date.parse(d)))) return mal("Las fechas van como momentos (ISO 8601)");
      const nro = Math.max(1, Math.trunc(Number(numero)) || 1);
      const [eventos, total] = await Promise.all([datos.pagina(base, f, POR_PAGINA, (nro - 1) * POR_PAGINA), datos.cuantos(base, f)]);
      return { ok: true, cuerpo: { eventos, total, pagina: nro, por_pagina: POR_PAGINA } };
    },

    grupos: async (): Promise<Grupos> => ({ grupos: await datos.grupos(base) }),
  };
}
export type Reglas = ReturnType<typeof crearReglas>;
