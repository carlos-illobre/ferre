import { cambiarPreferencia, cambiarSinConexion, guardaEnElDispositivo, useMiVinculo, usePreferencias, useReducirMovimiento } from "../../../negocio/configuracion";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { DatosSinConexionCelu } from "./DatosSinConexionCelu";
import { MisCelularesCelu } from "./MisCelularesCelu";
import { RenglonDeAjusteCelu } from "./RenglonDeAjusteCelu";
import { VinculoConLaComputadora } from "./VinculoConLaComputadora";
import "../../mas-v2.css";
import css from "./Configuracion.module.css";

// Configuración (RF-83, decisión 79) en el celular, como la v2 del director de arte (variante 1,
// «Ajustes»; specs/009, decisión 148): una columna de tarjetas. Arriba cuánto se guarda en este
// celular; «Este celular» con las animaciones y trabajar sin conexión; «Versión nueva»; «Mis
// celulares con huella» y el vínculo con la computadora. «Cómo buscar productos» ya no está acá
// (decisión 138).
const t = TEXTOS.configuracionV2;

export function ConfiguracionCelu({ alCambiarElGuardado }: { alCambiarElGuardado?: () => void } = {}) {
  const v = useMiVinculo();
  return (
    <main id="contenido" className="mv2 cfgvc" tabIndex={-1} data-testid="configuracion">
      <h1>{t.titulo.corto}</h1>
      <div className={`mv-tarjeta-2 ${css.guardado}`}>
        <span className={css.baldosa}><Icono nombre="disco" tam={24} /></span>
        <div><div className="mv-detalle">{t.guardadoEn.corto}</div><div className="va">—</div><div className="mv-barra"><b style={{ width: 0 }} /></div></div>
      </div>
      <EsteCelular alCambiarElGuardado={alCambiarElGuardado} />
      <MisCelularesCelu />
      {v.emparejado && <VinculoConLaComputadora v={v} />}
    </main>
  );
}

function EsteCelular({ alCambiarElGuardado }: { alCambiarElGuardado?: () => void }) {
  const { animaciones } = usePreferencias();
  const reducir = useReducirMovimiento();
  const sinConexion = guardaEnElDispositivo();
  return (
    <>
      <h2 className={css.sub}>{t.estaComputadora.corto}</h2>
      <div className={`mv-tarjeta-2 ${css.tarjeta}`}>
        <RenglonDeAjusteCelu icono="destellos" titulo={t.animaciones.corto} id="cfg-animaciones" encendida={animaciones} alCambiar={() => cambiarPreferencia("animaciones", !animaciones)} testId="cfg-animaciones"
          detalle={animaciones ? t.animacionesSi.corto : t.animacionesNo.corto}>
          {reducir && animaciones && <p className="mv-aviso urgente" data-testid="cfg-reducir-movimiento">{t.reducirMovimiento.corto}</p>}
        </RenglonDeAjusteCelu>
        <RenglonDeAjusteCelu icono={sinConexion ? "disco" : "sin-senal"} titulo={t.sinConexion.corto} id="cfg-sin-conexion" encendida={sinConexion} alCambiar={() => void cambiarSinConexion("este celular", alCambiarElGuardado)} testId="cfg-sin-conexion"
          detalle={sinConexion ? t.sinConexionSi.corto : t.sinConexionNo.corto} />
      </div>
      {sinConexion && <DatosSinConexionCelu />}
    </>
  );
}
