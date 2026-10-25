import { fecha } from "../../../formato";
import type { useMiVinculo } from "../../../negocio/configuracion";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Configuracion.module.css";

const t = TEXTOS.configuracionV2;

// El vínculo con la computadora: si están trabajando juntos, hasta cuándo, desconectar y desvincular.
export function VinculoConLaComputadora({ v }: { v: ReturnType<typeof useMiVinculo> }) {
  return (
    <>
      <h2 className={css.sub}>{t.vinculoConLaComputadora.corto}</h2>
      <div className={`mv-tarjeta-2 ${css.vinculo}`} data-testid="vinculo">
        <div className={css.linea} aria-hidden="true">
          <span className={css.aparato}><Icono nombre="celular" /></span><i />
          <span className={`mv-pastilla ${v.pausado ? "" : "logro"}`}><span className="punto" />{v.pausado ? t.desconectados.corto : t.trabajandoJuntos.corto}</span><i />
          <span className={css.aparato}><Icono nombre="pantalla" /></span>
        </div>
        <b className={css.vinculoTitulo} data-testid="vinculo-actual">{t.vinculadaConTuCelular.corto}</b>
        {v.vence && <p className="mv-detalle">{t.hasta.corto} {fecha(v.vence.slice(0, 10))}</p>}
        <div className={css.botones}>
          <button type="button" className="mv-btn" onClick={v.alternarPausa} data-testid="desconectar-vinculo">{v.pausado ? t.reconectar.corto : t.desconectar.corto}</button>
          <button type="button" className="mv-btn peligro" onClick={v.desvincular} data-testid="desvincular-vinculo" aria-label="Desvincular la computadora">{t.desvincular.corto}</button>
        </div>
      </div>
    </>
  );
}
