import { fecha } from "../../../formato";
import { haceCuanto } from "../../../negocio/apartados";
import { useMisCelulares } from "../../../negocio/configuracion";
import { describirDispositivo } from "../../../plataforma/dispositivo";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Configuracion.module.css";

const t = TEXTOS.configuracionV2;

// Mis celulares con huella (decisión 99): cuántos, cada uno con cuándo se usó, quitarlo y vincular este.
export function MisCelularesCelu() {
  const c = useMisCelulares();
  return (
    <>
      <h2 className={css.sub}>{t.misCelulares.corto}{c.filas && <span className="mv-pastilla">{c.filas.length}</span>}</h2>
      <div className={`mv-tarjeta-2 ${css.celulares}`} data-testid="celulares">
        {c.error && <p className="mv-aviso error" role="alert">{c.error}</p>}
        {c.mensaje && <p className="mv-aviso logro" role="status" data-testid="mensaje-celular">{c.mensaje}</p>}
        {c.filas?.map((x) => (
          <div key={x.id} className={css.celular} data-testid="celular">
            <span className={css.baldosa}><Icono nombre="huella" /></span>
            <div className={css.texto}><b>{x.dispositivo ?? "Celular"}</b><p className="mv-detalle">{x.ultimo_uso_en ? `Última vez ${haceCuanto(x.ultimo_uso_en)}` : `${t.conHuellaDesde.corto} ${fecha(x.creada_en.slice(0, 10))}`}</p></div>
            <button type="button" className="mv-btn chico fantasma" onClick={() => void c.quitar(x)}>{t.quitar.corto}</button>
          </div>
        ))}
        {c.filas && c.filas.length === 0 && <p className={`mv-detalle ${css.sin}`}>{t.sinCelulares.corto}</p>}
        {c.puedeVincular ? <button type="button" className={`mv-btn ${css.vincular}`} onClick={() => void c.vincular(describirDispositivo())} data-testid="vincular-celular"><Icono nombre="huella" tam={18} />{t.vincularConHuella.corto}</button>
          : <p className={css.nota}><Icono nombre="info" tam={16} />Este dispositivo no tiene lector de huella o desbloqueo compatible.</p>}
      </div>
    </>
  );
}
