import { useCallback } from "react";
import { cambiarPreferencia, cambiarSinConexion, guardaEnElDispositivo, useMiVinculo, usePreferencias, useReducirMovimiento } from "../../../negocio/configuracion";
import { useTeclasGlobales } from "../../../plataforma/teclado";
import { TEXTOS } from "../../textos";
import { DatosSinConexion } from "./DatosSinConexion";
import { MisCelulares } from "./MisCelulares";
import { RenglonDeAjuste } from "./RenglonDeAjuste";
import { VinculoConElCelular } from "./VinculoConElCelular";
import "../../mas-v2.css";
import css from "./Configuracion.module.css";

// Configuración (RF-83, decisión 79) en la computadora, como la v2 del director de arte (variante 1,
// «Dos columnas»; specs/009, decisión 148). A la izquierda, «Esta computadora»: cada preferencia un
// renglón con su baldosa, su llave y su tecla (Alt A, Alt B), y lo de trabajar sin conexión. A la
// derecha, «Tu cuenta»: los celulares con huella y el vínculo con el celular (Alt O, Alt U).
const t = TEXTOS.configuracionV2;

// Alt A: las animaciones; con el celular vinculado, Alt O desconecta y Alt U desvincula.
function queHace(e: KeyboardEvent, animaciones: boolean, v: ReturnType<typeof useMiVinculo>): (() => void) | null {
  if (!e.altKey || e.ctrlKey || e.metaKey) return null;
  const k = e.key.toLowerCase();
  if (k === "a") return () => cambiarPreferencia("animaciones", !animaciones);
  if (!v.emparejado) return null;
  return k === "o" ? v.alternarPausa : k === "u" ? v.desvincular : null;
}

export function Configuracion({ alCambiarElGuardado }: { alCambiarElGuardado?: () => void } = {}) {
  const { animaciones } = usePreferencias();
  const v = useMiVinculo();
  const teclas = useCallback((e: KeyboardEvent) => {
    const accion = queHace(e, animaciones, v);
    if (accion) { e.preventDefault(); accion(); }
  }, [animaciones, v]);
  useTeclasGlobales(teclas);

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
    <RenglonDeAjuste icono="destellos" titulo={t.animaciones.largo} id="cfg-animaciones" tecla="Alt A" encendida={animaciones} alCambiar={() => cambiarPreferencia("animaciones", !animaciones)} testId="cfg-animaciones"
      detalle={animaciones ? t.animacionesSi.largo : t.animacionesNo.largo}>
      {reducir && animaciones && <p className="mv-aviso urgente" data-testid="cfg-reducir-movimiento">{t.reducirMovimiento.largo}</p>}
      <div className={css.muestra}><span className={`${css.mueve} ${animaciones ? "" : "quieto"}`} aria-hidden="true"><i /><b /></span><span className="mv-detalle">{animaciones ? t.asiSeMueve.largo : t.asiAparece.largo}</span></div>
    </RenglonDeAjuste>
  );
}
