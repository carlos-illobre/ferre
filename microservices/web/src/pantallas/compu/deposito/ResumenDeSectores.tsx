import type { resumenDeSectores } from "../../../negocio/deposito";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { plural } from "./deposito-comun";
import css from "./Contar.module.css";

// Arriba: cuánto del stock está cargado (los sectores contados), los nunca contados, los conteos en
// curso y lo que hoy toca contar (todavía no).
const t = TEXTOS.contar;

export function ResumenDeSectores({ resumen: r }: { resumen: ReturnType<typeof resumenDeSectores> }) {
  return (
    <div className={css.resumenes}>
      <div className={css.resumen} data-testid="stock-cargado">
        <span className={css.ico}><Icono nombre="layers-3" /></span>
        <span className={css.resTexto}><span className={css.et}>{t.stockCargado.largo}</span><span className={css.va}>{r.contados} <small>de {plural(r.total, "sector", "sectores")}</small></span>
          <span className={css.riel}><i style={{ width: `${r.total ? (r.contados / r.total) * 100 : 0}%` }} /></span></span>
      </div>
      <div className={`${css.resumen} urgente`} data-testid="nunca-contados">
        <span className={css.ico}><Icono nombre="circle-dashed" /></span>
        <span className={css.resTexto}><span className={css.et}>{t.nuncaContados.largo}</span><span className={css.va}>{r.nunca} <small>{r.nunca === 1 ? "sector" : "sectores"}</small></span></span>
      </div>
      <div className={css.resumen} data-testid="conteos-en-curso">
        <span className={`${css.ico} accion`}><Icono nombre="pause" /></span>
        <span className={css.resTexto}><span className={css.et}>{t.conteosEnCurso.largo}</span><span className={css.va}>{r.enCurso}</span></span>
      </div>
      <div className={css.resumen} data-testid="hoy-toca">
        <span className={css.ico}><Icono nombre="calendar-check" /></span>
        <span className={css.resTexto}><span className={css.et}>{t.hoyToca.largo}</span><span className={css.va}>— <small>productos</small></span>
          <span className={css.riel} /></span>
      </div>
    </div>
  );
}
