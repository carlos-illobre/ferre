import { useState } from "react";
import { TEXTOS } from "../../textos";
import { pesosCortos } from "../base/ui";
import css from "./VentasDelDia.module.css";

// Lo vendido por hora: la barra de cada hora, con una raya punteada en lo que se vendió a esa hora el
// día anterior; la hora actual resaltada con su importe en un globo, y señalar otra muestra el suyo.
const t = TEXTOS.hoy;
type Barra = { hora: number; total: number };

export function PorHora({ barras, anterior, esHoy }: { barras: Barra[]; anterior: Map<number, number>; esHoy: boolean }) {
  const [senalada, setSenalada] = useState<number | null>(null);
  const ahora = esHoy ? new Date().getHours() : null;
  const max = Math.max(1, ...barras.map((b) => b.total), ...barras.map((b) => anterior.get(b.hora) ?? 0));
  const conGlobo = senalada ?? (ahora !== null && barras.some((b) => b.hora === ahora && b.total > 0) ? ahora : null);
  return (
    <div className={css.porHora}>
      <div className="cab"><span className={css.etiqueta}>{t.porHora.largo}</span><span className="ley"><span><em />{t.hoy.largo}</span><span><i />{t.ayer.largo}</span></span></div>
      <div className={css.horas} data-testid="grafico" onMouseLeave={() => setSenalada(null)}>
        {barras.map((b) => <LaHora key={b.hora} barra={b} ayer={anterior.get(b.hora) ?? 0} max={max} ahora={b.hora === ahora} globo={conGlobo === b.hora} alSenalar={() => setSenalada(b.hora)} />)}
      </div>
    </div>
  );
}

function LaHora({ barra: b, ayer, max, ahora, globo, alSenalar }: { barra: Barra; ayer: number; max: number; ahora: boolean; globo: boolean; alSenalar: () => void }) {
  return (
    <div className={`h ${b.total === 0 ? "sin" : ""} ${ahora ? "ahora" : ""}`} data-testid="barra" role="img" aria-label={`${b.hora} h: ${pesosCortos(b.total)}`} onMouseEnter={alSenalar}>
      <div className="col">
        <b style={{ height: b.total ? `${(b.total / max) * 100}%` : undefined }} />
        {ayer > 0 && <i className="ayer" style={{ bottom: `${(ayer / max) * 100}%` }} />}
        {globo && <span className="globo" style={{ bottom: `calc(${(b.total / max) * 100}% + 8px)` }}>{b.hora} h · {pesosCortos(b.total)}</span>}
      </div>
      <span>{b.hora}</span>
    </div>
  );
}
