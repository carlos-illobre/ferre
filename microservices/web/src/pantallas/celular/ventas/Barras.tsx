import { pesosCortos } from "../../../negocio/formato";
import { useBarraTocada } from "./useBarraTocada";
import css from "./VentasDelDia.module.css";

// Lo vendido por hora, como la v2: cada barra con una raya punteada en lo de ayer a esa hora. Tocar
// una barra (o arrastrar el dedo por ellas) saca el globo con su hora y su importe y baja las demás.
// Al abrir, las barras crecen una después de otra. Con el teclado, Enter elige la barra (el toque ya
// la eligió al apoyar el dedo).
type Barra = { hora: number; total: number };

export function Barras({ barras, anterior }: { barras: Barra[]; anterior: Map<number, number> }) {
  const b = useBarraTocada();
  if (barras.length === 0) return null;
  const max = Math.max(...barras.map((x) => x.total), ...barras.map((x) => anterior.get(x.hora) ?? 0), 1);
  return (
    <div className={css.grafico} data-testid="grafico">
      <div className={`${css.barras} ${b.elegida !== null ? "con-elegida" : ""}`} style={{ touchAction: "none" }} {...b.alTocar}>
        {barras.map((x, i) => <Columna key={x.hora} barra={x} i={i} ayer={anterior.get(x.hora) ?? 0} max={max} elegida={x.hora === b.elegida} alElegir={() => b.setElegida(x.hora === b.elegida ? null : x.hora)} />)}
      </div>
      <div className={css.horas} aria-hidden="true">{barras.map((x) => <span key={x.hora}>{x.hora}</span>)}</div>
    </div>
  );
}

function Columna({ barra: x, i, ayer, max, elegida, alElegir }: { barra: Barra; i: number; ayer: number; max: number; elegida: boolean; alElegir: () => void }) {
  const alto = (v: number) => `${Math.max(4, (v / max) * 100)}%`;
  return (
    <div className={`${css.col} ${elegida ? "elegida" : ""}`} data-hora={x.hora}>
      <button type="button" className={x.total === 0 ? "vacia" : ""} style={{ height: alto(x.total), animationDelay: `${i * 20}ms` }}
        onClick={(e) => { if (e.detail === 0) alElegir(); }} aria-label={`${x.hora} h: ${pesosCortos(x.total)}`} data-testid="barra" />
      {ayer > 0 && <i className={css.ayer} style={{ bottom: `${(ayer / max) * 100}%` }} aria-hidden="true" data-testid="marca-ayer" />}
      {elegida && <span className={css.globo} role="status" style={{ bottom: `calc(${alto(x.total)} + 6px)` }} data-testid="globo">{x.hora} h · {pesosCortos(x.total)}</span>}
    </div>
  );
}
