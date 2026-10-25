import { MEDIOS, NOMBRE_DE_MEDIO, type resumenDelDia, type VentasDelDia } from "../../../negocio/ventas";
import { IconoDeMedio } from "../../IconoDeMedio";
import { usePuede } from "../../../negocio/usuarios";
import { TEXTOS } from "../../textos";
import { irA } from "../base/rutas";
import { Icono } from "../../../ui/iconos";
import { ErrorDeBloque, Esqueleto } from "./Cargas";
import { Pesos } from "./Pesos";
import type { Carga } from "./negocio-comun";
import css from "./Resumen.module.css";

// Cómo pagaron: la franja con la parte de cada medio, y por medio cuántas ventas y cuánto.
type Resumen = ReturnType<typeof resumenDelDia>;

export function ComoPagaron({ hoy, r }: { hoy: Carga<VentasDelDia>; r: Resumen | null }) {
  return (
    <section className={css.card} data-testid="resumen-hoy" aria-labelledby="resumen-medios">
      <header className={css.cardCab}>
        <h2 id="resumen-medios">{TEXTOS.tablero.comoPagaron.largo}</h2>
        <span className={css.der}>ventas · importe</span>
      </header>
      <ErrorDeBloque carga={hoy} />
      {!hoy.datos && !hoy.error && <Esqueleto renglones={4} />}
      {hoy.datos && r && <LosMedios r={r} />}
      {usePuede()("ventas.ver") && <button type="button" className={`${css.enlace} ${css.verVentas}`} onClick={() => irA("hoy")} data-testid="ver-ventas">Ver las ventas de hoy <Icono nombre="chevron-right" tam={16} /></button>}
    </section>
  );
}

function LosMedios({ r }: { r: Resumen }) {
  return (
    <>
      <div className={css.stack} aria-hidden="true">
        {r.total > 0 ? MEDIOS.map((m) => r.medios[m].total > 0 && <b key={m} className={`medio-${m}`} style={{ flex: r.medios[m].total }} />) : <b className={css.stackVacio} />}
      </div>
      <ul className={css.medios}>
        {MEDIOS.map((m) => (
          <li key={m} data-testid={`medio-${m}`}>
            <IconoDeMedio medio={m} tam={18} conFondo className={css.medioIcono} />
            <span className={css.medioNombre}>{NOMBRE_DE_MEDIO[m]} <span className={css.medioCuantas}>· {r.medios[m].cuantas}</span></span>
            <span className={css.medioImporte}><Pesos valor={r.medios[m].total} /></span>
          </li>
        ))}
      </ul>
    </>
  );
}
