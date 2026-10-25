import { botonDeLaDescarga, comoVaLaDescarga, porcentajeBajado, queSeBajo, useDescarga } from "../../../negocio/configuracion";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Configuracion.module.css";

// Los datos para trabajar sin conexión (specs/018, historia 5): se bajan solo al tocar el botón.
export function DatosSinConexionCelu() {
  const d = useDescarga();
  return (
    <div className={css.guarda} data-testid="cfg-descarga">
      <span className={`${css.baldosa} blanca`}><Icono nombre="disco" /></span>
      <div className={css.texto}>
        <b id="cfg-descarga">{TEXTOS.configuracionV2.datosSinConexion.corto}</b>
        <p className="mv-detalle" id="cfg-descarga-detalle" aria-live="polite">
          {d.avance ? <><span className="mv-barra" aria-hidden="true"><b style={{ width: `${porcentajeBajado(d.avance)}%` }} /></span>{comoVaLaDescarga(d, false)}</> : queSeBajo(d, false)}
          {d.error && <span className={css.error} role="alert" data-testid="cfg-descarga-error"> {d.error}</span>}
        </p>
      </div>
      <button type="button" className={`mv-btn ${d.descarga || d.avance ? "" : "oscuro"}`} disabled={!d.leida || d.avance !== null} onClick={d.descargar} aria-describedby="cfg-descarga-detalle" data-testid="cfg-descargar">{botonDeLaDescarga(d)}</button>
    </div>
  );
}
