import { cambiarPreferencia, cambiarSinConexion, guardaEnElDispositivo, useMiVinculo, usePreferencias, useReducirMovimiento } from "../../../negocio/configuracion";
import { useComandos } from "../../../plataforma/comandos";
import { TEXTOS } from "../../textos";
import { DatosSinConexion } from "./DatosSinConexion";
import { MisCelulares } from "./MisCelulares";
import { RenglonDeAjuste } from "./RenglonDeAjuste";
import { VinculoConElCelular } from "./VinculoConElCelular";
import "../../mas-v2.css";
import css from "./Configuracion.module.css";

// Configuración (RF-83, decisión 79) en la computadora, como la v2 del director de arte (variante 1,
// «Dos columnas»; specs/009, decisión 148). A la izquierda, «Esta computadora»: cada preferencia un
// renglón con su baldosa, su llave y su tecla, y lo de trabajar sin conexión. A la derecha, «Tu
// cuenta»: los celulares con huella y el vínculo con el celular.
const t = TEXTOS.configuracionV2;

// Ofrece cambiar las animaciones y, con el celular vinculado, desconectarlo y desvincularlo.
function useAccionesDeConfiguracion(animaciones: boolean, v: ReturnType<typeof useMiVinculo>) {
  useComandos({
    "configuracion.animaciones": () => cambiarPreferencia("animaciones", !animaciones),
    "configuracion.desconectar": v.emparejado ? v.alternarPausa : null,
    "configuracion.desvincular": v.emparejado ? v.desvincular : null,
  });
}

export function Configuracion({ alCambiarElGuardado }: { alCambiarElGuardado?: () => void } = {}) {
  const { animaciones } = usePreferencias();
  const v = useMiVinculo();
  useAccionesDeConfiguracion(animaciones, v);

  return (
    <main id="contenido" className="pagina mv2 cfgv" tabIndex={-1} data-testid="configuracion">
      <header className={css.cabeza}><h1>{t.titulo.largo}</h1><p className="mv-detalle">{t.bajada.largo}</p></header>
      <div className={css.cols}>
        <EstaComputadora animaciones={animaciones} alCambiarElGuardado={alCambiarElGuardado} />
        <section aria-labelledby="cfgv-cuenta">
          <h2 id="cfgv-cuenta" className={css.sub}>{t.tuCuenta.largo}</h2>
          <MisCelulares />
          {v.emparejado && <VinculoConElCelular v={v} />}
        </section>
      </div>
    </main>
  );
}

function EstaComputadora({ animaciones, alCambiarElGuardado }: { animaciones: boolean; alCambiarElGuardado?: () => void }) {
  const sinConexion = guardaEnElDispositivo();
  return (
    <section aria-labelledby="cfgv-esta">
      <h2 id="cfgv-esta" className={css.sub}>{t.estaComputadora.largo}</h2>
      <div className={`mv-tarjeta-2 ${css.tarjeta}`}>
        <Animaciones animaciones={animaciones} />
        <RenglonDeAjuste icono={sinConexion ? "disco" : "sin-senal"} titulo={t.sinConexion.largo} id="cfg-sin-conexion" encendida={sinConexion} alCambiar={() => void cambiarSinConexion("esta computadora", alCambiarElGuardado)} testId="cfg-sin-conexion"
          detalle={sinConexion ? t.sinConexionSi.largo : t.sinConexionNo.largo} />
      </div>
      {sinConexion && <DatosSinConexion />}
    </section>
  );
}

// Las animaciones, con cómo se ve cada opción y el aviso si el sistema pide menos movimiento.
function Animaciones({ animaciones }: { animaciones: boolean }) {
  const reducir = useReducirMovimiento();
  return (
    <RenglonDeAjuste icono="destellos" titulo={t.animaciones.largo} id="cfg-animaciones" accion="configuracion.animaciones" encendida={animaciones} alCambiar={() => cambiarPreferencia("animaciones", !animaciones)} testId="cfg-animaciones"
      detalle={animaciones ? t.animacionesSi.largo : t.animacionesNo.largo}>
      {reducir && animaciones && <p className="mv-aviso urgente" data-testid="cfg-reducir-movimiento">{t.reducirMovimiento.largo}</p>}
      <div className={css.muestra}><span className={`${css.mueve} ${animaciones ? "" : "quieto"}`} aria-hidden="true"><i /><b /></span><span className="mv-detalle">{animaciones ? t.asiSeMueve.largo : t.asiAparece.largo}</span></div>
    </RenglonDeAjuste>
  );
}
