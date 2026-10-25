import { fecha } from "../../../negocio/formato";
import { haceCuanto } from "../../../negocio/apartados";
import { useMisCelulares } from "../../../negocio/configuracion";
import { describirDispositivo } from "../../../plataforma/dispositivo";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Configuracion.module.css";

const t = TEXTOS.configuracionV2;

// Mis celulares con huella (decisión 99): los míos, quitar uno perdido y vincular este.
export function MisCelulares() {
  const c = useMisCelulares();
  return (
    <div className={`mv-tarjeta-2 ${css.celulares}`} data-testid="celulares">
      {c.error && <p className="mv-aviso error" role="alert">{c.error}</p>}
      {c.mensaje && <p className="mv-aviso logro" role="status" data-testid="mensaje-celular">{c.mensaje}</p>}
      {c.filas?.map((x) => (
        <div key={x.id} className={css.celular} data-testid="celular">
          <span className={css.baldosa}><Icono nombre="huella" /></span>
          <div className={css.texto}><b>{x.dispositivo ?? "Celular"}</b><p className="mv-detalle">{t.conHuellaDesde.largo} {fecha(x.creada_en.slice(0, 10))}{x.ultimo_uso_en ? ` · ${t.entro.largo} ${haceCuanto(x.ultimo_uso_en)}` : ""}</p></div>
          <button type="button" className="mv-btn chico fantasma" onClick={() => void c.quitar(x)}>{t.quitar.largo}</button>
        </div>
      ))}
      {c.filas && c.filas.length === 0 && <p className={`mv-detalle ${css.sin}`}>{t.sinCelulares.largo}</p>}
      {c.puedeVincular && <button type="button" className={`mv-btn chico ${css.vincular}`} onClick={() => void c.vincular(describirDispositivo())} data-testid="vincular-celular"><Icono nombre="huella" tam={16} />{t.vincularConHuella.largo}</button>}
      <p className={css.nota}><Icono nombre="info" tam={16} />{t.paraSumar.largo}</p>
    </div>
  );
}
