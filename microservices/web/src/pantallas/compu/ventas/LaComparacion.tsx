import { nombreDelDia, type Comparacion } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { pesosCortos } from "../base/ui";
import css from "./VentasDelDia.module.css";

// Contra el día anterior: el porcentaje en su pastilla y cuánto se vendió aquel día.
const t = TEXTOS.hoy;
const tendencia = (p: number) => (p < 0 ? "baja" : p > 0 ? "sube" : "igual");

export function LaComparacion({ comparacion: c, esHoy, diaAnterior }: { comparacion: Comparacion | null; esHoy: boolean; diaAnterior: string }) {
  if (!c) return null;
  if (c.sinVentas) return <div className={css.compara} data-testid="comparacion">{esHoy ? t.ayerSinVentas.largo : t.diaSinVentas.largo}</div>;
  return (
    <div className={css.compara} data-testid="comparacion">
      <span className={`${css.pastilla} ${tendencia(c.porcentaje)}`}>{c.porcentaje > 0 ? "+" : ""}{c.porcentaje} %</span>
      <span>{esHoy ? t.vsAyer.largo : `${t.vsDia.largo} ${nombreDelDia(diaAnterior)}`} ({pesosCortos(c.anterior)})</span>
    </div>
  );
}
