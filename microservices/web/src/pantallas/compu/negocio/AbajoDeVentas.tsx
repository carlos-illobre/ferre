import type { Consulta } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { NoLlevaron } from "./NoLlevaron";
import type { Carga } from "./negocio-comun";
import css from "./Resumen.module.css";

// Abajo: lo más vendido (todavía no), lo que no llevaron y el cierre de caja (todavía no).
const t = TEXTOS.tablero;

export function AbajoDeVentas({ consultas, deHoy }: { consultas: Carga<Consulta[]>; deHoy: number }) {
  return (
    <div className={css.filaD}>
      <section className={css.card} aria-labelledby="rv-top" data-testid="lo-mas-vendido">
        <header className={css.cardCab}><h2 id="rv-top">{t.loMasVendido.largo}</h2><span className={css.der}>por dinero</span></header>
        <p className={css.vacioChico}><b>—</b> {t.sinLoMasVendido.largo}</p>
      </section>
      <NoLlevaron consultas={consultas} deHoy={deHoy} />
      <section className={css.card} aria-labelledby="rv-caja" data-testid="cierre-de-caja">
        <header className={css.cardCab}><h2 id="rv-caja">{t.caja.largo}</h2></header>
        <div className={css.cajaVa}>—</div>
        <p className={css.vacioChico}>{t.sinCaja.largo}</p>
      </section>
    </div>
  );
}
