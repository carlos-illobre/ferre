import { type compararConElAnterior, pasosDeLoVendido, type resumenDelDia, type VentasDelDia } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { Numero, textoDeEspera } from "./Cargas";
import { Comparacion } from "./Comparacion";
import { Kpi } from "./Kpi";
import { Pesos } from "./Pesos";
import { useEnLinea, type Carga } from "./negocio-comun";
import css from "./Resumen.module.css";

// Los cuatro números de arriba: lo vendido (que se explica), la ganancia (todavía no), cuántas
// ventas y el ticket promedio, cada uno contra ayer a la misma hora.
type Props = { hoy: Carga<VentasDelDia>; r: ReturnType<typeof resumenDelDia> | null; comp: ReturnType<typeof compararConElAnterior> | null };
const t = TEXTOS.tablero;

export function KpisDeVentas(props: Props) {
  return <div className={css.kpis}><Principales {...props} /><Secundarios {...props} /></div>;
}

// Lo vendido (que se explica) y la ganancia (todavía no).
function Principales({ hoy, r, comp }: Props) {
  const espera = textoDeEspera(hoy, useEnLinea());
  return (
    <>
      <Kpi principal icono="banknote" rotulo={t.vendido.largo} testId="indicador-vendido"
        pasos={hoy.datos ? pasosDeLoVendido(hoy.datos) : null} titulo="De dónde sale lo vendido hoy"
        valor={<Numero carga={hoy}>{r && <Pesos valor={r.total} />}</Numero>}
        comp={r ? <Comparacion c={comp?.vendido ?? null} pesos actual={r.total} /> : espera} />
      <Kpi principal icono="trending-up" rotulo={t.ganancia.largo} testId="indicador-ganancia"
        valor={<span className={css.sinDato} title={t.sinGanancia.largo}>—</span>}
        comp={<><span className={css.delta}>—</span><span className={css.compTexto}>{t.sinGanancia.corto}</span></>} />
    </>
  );
}

// Cuántas ventas y el ticket promedio.
function Secundarios({ hoy, r, comp }: Props) {
  const espera = textoDeEspera(hoy, useEnLinea());
  return (
    <>
      <Kpi icono="receipt" rotulo={t.ventas.largo} testId="indicador-ventas"
        valor={<Numero carga={hoy}>{r?.ventas.toLocaleString("es-AR")}</Numero>}
        comp={r ? <Comparacion c={comp?.ventas ?? null} actual={r.ventas} /> : espera} />
      <Kpi icono="shopping-bag" rotulo={t.ticket.largo} testId="indicador-ticket"
        valor={<Numero carga={hoy}>{r && (r.ticket === null ? <span className={css.sinDato}>—</span> : <Pesos valor={r.ticket} />)}</Numero>}
        comp={r ? <CompDelTicket r={r} comp={comp} /> : espera} />
    </>
  );
}

function CompDelTicket({ r, comp }: { r: NonNullable<Props["r"]>; comp: Props["comp"] }) {
  if (r.ticket === null) return <><span className={css.delta}>—</span>Sin ventas todavía</>;
  return <Comparacion c={comp?.ticket ?? null} pesos actual={r.ticket} />;
}
