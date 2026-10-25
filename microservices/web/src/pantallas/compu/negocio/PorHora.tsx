import { graficoPorHora, type VentasDelDia as DatosHoy } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { pesosCortos } from "../base/ui";
import { ErrorDeBloque } from "./Cargas";
import type { Carga } from "./negocio-comun";
import css from "./Resumen.module.css";

// Lo vendido por hora, como la v2: la barra de hoy en cada hora, la de ayer a la misma hora como
// una raya punteada atrás, la hora de ahora rayada y la más alta con su importe en un globo.
type Ventas = DatosHoy["ventas"];
const miles = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M` : n >= 1000 ? `${(n / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} mil` : n.toLocaleString("es-AR"));

export function PorHora({ ventas, anteriores, carga }: { ventas: Ventas | null; anteriores: Ventas | null; carga: Carga<unknown> }) {
  const ahora = new Date().getHours();
  const g = graficoPorHora(ventas, anteriores, ahora);
  const tope = g.paso * 3;
  const alto = (v: number) => `${tope ? (v / tope) * 100 : 0}%`;
  return (
    <section className={css.card} aria-labelledby="rv-por-hora" data-testid="vendido-por-hora">
      <header className={css.cardCab}>
        <h2 id="rv-por-hora">{TEXTOS.tablero.porHora.largo}</h2>
        <span className={css.leyendas}><span className={css.ley}><i className={css.leyHoy} />{TEXTOS.hoy.hoy.largo}</span><span className={css.ley}><i className={css.leyAntes} />{TEXTOS.hoy.ayer.largo}</span></span>
      </header>
      <ErrorDeBloque carga={carga} />
      <div className={css.grafico}>
        <div className={css.eje} aria-hidden="true">{[3, 2, 1, 0].map((i) => <span key={i}>{i === 0 ? "0" : miles(g.paso * i)}</span>)}</div>
        <div className={css.area}>
          <div className={css.lineas} aria-hidden="true"><span /><span /><span /><span /></div>
          <div className={css.barras} style={{ gridTemplateColumns: `repeat(${g.horas.length}, 1fr)` }}>
            {g.horas.map((h) => <Barra key={h.hora} h={h} ahora={h.hora === ahora && Boolean(ventas)} pico={h.hora === g.pico} alto={alto} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Barra({ h, ahora, pico, alto }: { h: { hora: number; hoy: number; ayer: number }; ahora: boolean; pico: boolean; alto: (v: number) => string }) {
  return (
    <div className={`${css.col} ${ahora ? "ahora" : ""}`} data-testid="barra" role="img" aria-label={`${h.hora} h: ${pesosCortos(h.hoy)}${h.ayer ? `; ayer ${pesosCortos(h.ayer)}` : ""}`}>
      {h.ayer > 0 && <span className={css.antes} style={{ height: alto(h.ayer) }} />}
      {h.hoy > 0 && <span className={css.hoy} style={{ height: alto(h.hoy) }}>{pico && <span className={css.globo}>{pesosCortos(h.hoy)}</span>}</span>}
      <span className={css.h}>{h.hora}</span>
    </div>
  );
}
