import { MEDIOS, NOMBRE_DE_MEDIO, type ResumenDelDia as Resumen, type useResumenDelDia } from "../../../negocio/ventas";
import { IconoDeMedio } from "../../IconoDeMedio";
import { TEXTOS } from "../../textos";
import { pesosCortos } from "../base/ui";
import { LaComparacion } from "./LaComparacion";
import { PorHora } from "./PorHora";
import css from "./VentasDelDia.module.css";

// Arriba, el día: el total con la comparación y los tres números, lo vendido por hora y los medios.
const t = TEXTOS.hoy;

export function ResumenDelDia({ r }: { r: ReturnType<typeof useResumenDelDia> }) {
  const resumen = r.resumen!;
  return (
    <section className={css.diaTarjeta} data-testid="resumen-hoy">
      <div className={css.total}>
        <span className={css.etiqueta}>{t.totalDeVentas.largo}</span>
        <span className={`${css.monto} importe`} data-testid="total-de-hoy">{pesosCortos(resumen.total)}</span>
        <LaComparacion comparacion={r.comparacion} esHoy={r.esHoy} diaAnterior={r.diaAnterior} />
        <div className={css.tres} data-testid="numeros">
          <span><b data-testid="cuantas-ventas">{resumen.ventas}</b>{t.ventas.largo}</span>
          <span><b data-testid="cuantos-productos">{resumen.productos}</b>{t.productos.largo}</span>
          <span><b data-testid="ticket">{resumen.ticket === null ? "—" : pesosCortos(resumen.ticket)}</b>{t.ticket.largo}</span>
        </div>
      </div>
      <PorHora barras={r.barras} anterior={r.anteriorPorHora} esHoy={r.esHoy} />
      <MediosDelDia medios={resumen.medios} />
    </section>
  );
}

function MediosDelDia({ medios }: { medios: Resumen["medios"] }) {
  return (
    <div className={css.medios} data-testid="medios">
      {MEDIOS.map((m) => (
        <div key={m} className={`${css.medio} medio-${m}`} data-testid={`medio-${m}`}>
          <IconoDeMedio medio={m} tam={16} conFondo />
          <b>{NOMBRE_DE_MEDIO[m]}</b>
          <small>{medios[m].cuantas} {medios[m].cuantas === 1 ? t.venta.largo : t.ventas.largo}</small>
          <strong className="importe">{pesosCortos(medios[m].total)}</strong>
        </div>
      ))}
    </div>
  );
}
