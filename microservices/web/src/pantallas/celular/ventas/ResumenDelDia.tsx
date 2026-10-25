import { MEDIOS, type useResumenDelDia } from "../../../negocio/ventas";
import { pesosCortos } from "../../../formato";
import { Rodar } from "../../../plataforma/animacion";
import { IconoDeMedio } from "../../IconoDeMedio";
import { MEDIOS as MEDIOS_DE_TEXTOS, TEXTOS } from "../../textos";
import { Barras } from "./Barras";
import { ComparacionDelDia } from "./ComparacionDelDia";
import css from "./VentasDelDia.module.css";

// La tarjeta del día: el total, la comparación, lo vendido por hora y los cuatro medios.
const t = TEXTOS.hoy;
const CORTO = Object.fromEntries(MEDIOS_DE_TEXTOS.map((m) => [m.valor, m.corto])) as Record<string, string>;

export function ResumenDelDia({ r }: { r: ReturnType<typeof useResumenDelDia> }) {
  const resumen = r.resumen!;
  return (
    <section className={`tarjeta ${css.total}`} data-testid="resumen-hoy">
      <small>{t.totalDeVentas.corto}</small>
      <span className={`${css.monto} importe`} data-testid="total-de-hoy"><Rodar texto={pesosCortos(resumen.total)} escalon={30} alAparecer /></span>
      <ComparacionDelDia comparacion={r.comparacion} esHoy={r.esHoy} diaAnterior={r.diaAnterior} />
      <Barras barras={r.barras} anterior={r.anteriorPorHora} />
      <ul className={css.medios}>
        {MEDIOS.map((m) => (
          <li key={m} data-testid={`medio-${m}`}>
            <IconoDeMedio medio={m} tam={18} conFondo />
            <span><b className="importe"><Rodar texto={pesosCortos(resumen.medios[m].total)} /></b>
              <small><span className={css.medioNombre}>{CORTO[m]}</span> · {resumen.medios[m].cuantas} {resumen.medios[m].cuantas === 1 ? t.venta.corto : t.ventas.corto}</small></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
