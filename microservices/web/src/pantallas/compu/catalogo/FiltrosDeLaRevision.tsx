import type { Cargada } from "../../../negocio/catalogo";
import { numero } from "../base/ui";
import css from "./Listas.module.css";

// Qué filas ver. Los filtros que el sistema todavía no sabe hacer quedan a la vista y apagados (021, E02).
export type FiltroDeRevision = "cambian" | "salteadas";
// Una subida de más del 15 % se marca en ámbar, como en la v2.
export const SUBA_GRANDE = 15;

export function FiltrosDeLaRevision({ r, filtro, alElegir }: { r: Cargada["resumen"]; filtro: FiltroDeRevision; alElegir: (f: FiltroDeRevision) => void }) {
  const chips: { valor: FiltroDeRevision | null; nombre: string; cuenta: string }[] = [
    { valor: "cambian", nombre: "Cambian", cuenta: numero(r.modificados) },
    { valor: null, nombre: `Subas de más de ${SUBA_GRANDE} %`, cuenta: "—" },
    { valor: null, nombre: "Nuevos", cuenta: numero(r.nuevos) },
    { valor: null, nombre: "Ya no están", cuenta: numero(r.dados_de_baja) },
    { valor: "salteadas", nombre: "Salteadas", cuenta: numero(r.salteadas) },
  ];
  return (
    <div className={css.filtros} role="tablist" aria-label="Qué filas ver">
      {chips.map((c) => (
        <button key={c.nombre} type="button" role="tab" className={css.chip} aria-selected={c.valor === filtro} disabled={c.valor === null}
          title={c.valor === null ? "Todavía no se puede filtrar por esto" : undefined} onClick={() => c.valor && alElegir(c.valor)}>
          {c.nombre} <b>{c.cuenta}</b>
        </button>
      ))}
    </div>
  );
}
