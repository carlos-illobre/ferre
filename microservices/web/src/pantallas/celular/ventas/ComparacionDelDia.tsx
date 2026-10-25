import { nombreDelDia, type Comparacion } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import css from "./VentasDelDia.module.css";

// Contra el día anterior: el porcentaje (con su flecha) y cuánto se vendió aquel día.
const t = TEXTOS.hoy;
const tendencia = (p: number) => (p < 0 ? "baja" : p > 0 ? "sube" : "igual");

export function ComparacionDelDia({ comparacion: c, esHoy, diaAnterior }: { comparacion: Comparacion | null; esHoy: boolean; diaAnterior: string }) {
  if (!c) return null;
  if (c.sinVentas) return <div className={css.compara} data-testid="comparacion">{esHoy ? t.ayerSinVentas.corto : t.diaSinVentas.corto}</div>;
  const contra = esHoy ? t.vsAyer.corto : `${t.vsDia.corto} ${nombreDelDia(diaAnterior)}`;
  return (
    <div className={css.compara} data-testid="comparacion">
      <span className={`${css.pastilla} ${tendencia(c.porcentaje)}`}>{c.porcentaje !== 0 && <Icono nombre={c.porcentaje < 0 ? "baja" : "sube"} tam={14} grosor={2.6} />}{c.porcentaje > 0 ? "+" : ""}{c.porcentaje} %</span>
      <span>{contra} ({pesosCortos(c.anterior)})</span>
    </div>
  );
}
