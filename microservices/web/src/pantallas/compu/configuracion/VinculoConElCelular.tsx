import { fecha } from "../../../negocio/formato";
import type { useMiVinculo } from "../../../negocio/configuracion";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { useEtiqueta } from "../../../plataforma/comandos";
import { Atajo } from "../base/ui";
import css from "./Configuracion.module.css";

const t = TEXTOS.configuracionV2;

// El vínculo con el celular: si están trabajando juntos, hasta cuándo, desconectar y desvincular.
export function VinculoConElCelular({ v }: { v: ReturnType<typeof useMiVinculo> }) {
  return (
    <div className={`mv-tarjeta-2 ${css.vinculo}`} data-testid="vinculo">
      <div className={css.linea} aria-hidden="true">
        <span className={css.aparato}><Icono nombre="celular" /></span><i />
        <span className={`mv-pastilla ${v.pausado ? "" : "logro"}`}><span className="punto" />{v.pausado ? t.desconectados.largo : t.trabajandoJuntos.largo}</span><i />
        <span className={css.aparato}><Icono nombre="pantalla" /></span>
      </div>
      <b className={css.vinculoTitulo} data-testid="vinculo-actual">{t.vinculadaConTuCelular.largo}</b>
      <p className="mv-detalle">{v.vence ? `${t.hasta.largo} ${fecha(v.vence.slice(0, 10))}. ` : ""}{t.seRenueva.largo}</p>
      <div className={css.botones}>
        <button type="button" className="mv-btn chico" onClick={v.alternarPausa} aria-keyshortcuts={useEtiqueta("configuracion.desconectar")} data-testid="desconectar-vinculo">{v.pausado ? t.reconectar.largo : t.desconectar.largo} <Atajo accion="configuracion.desconectar" className="mv-kbd" /></button>
        <button type="button" className="mv-btn chico peligro" onClick={v.desvincular} aria-keyshortcuts={useEtiqueta("configuracion.desvincular")} data-testid="desvincular-vinculo" aria-label="Desvincular el celular">{t.desvincular.largo} <Atajo accion="configuracion.desvincular" className="mv-kbd" /></button>
      </div>
    </div>
  );
}
