import { diaAnterior, hoyLocal, nombreDelDia } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { horaCorta } from "./negocio-comun";
import css from "./Resumen.module.css";

// Qué período cuenta (hoy hasta ahora, contra ayer a la misma hora) y Hoy · Semana · Mes.
export function PeriodoDeVentas({ actualizado }: { actualizado: Date }) {
  const ahora = new Date();
  const dia = ahora.toLocaleDateString("es-AR", { weekday: "long" });
  const diaYMes = ahora.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  return (
    <div className={css.periodo}>
      <div className={css.compara}><b>{dia.charAt(0).toUpperCase() + dia.slice(1)} {diaYMes}, hasta las {horaCorta(actualizado)}</b><br />contra ayer, {nombreDelDia(diaAnterior(hoyLocal()))}, a la misma hora</div>
      <div className={css.segmentos} role="group" aria-label="Período">
        <button type="button" className="elegido" aria-pressed="true">Hoy <span className={css.segKbd}>D</span></button>
        <button type="button" disabled title={TEXTOS.tablero.sinPeriodo.largo}>Semana <span className={css.segKbd}>S</span></button>
        <button type="button" disabled title={TEXTOS.tablero.sinPeriodo.largo}>Mes <span className={css.segKbd}>M</span></button>
      </div>
    </div>
  );
}
