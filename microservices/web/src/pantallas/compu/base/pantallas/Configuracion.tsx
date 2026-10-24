import { useCallback, type ReactNode } from "react";
import { cambiarPreferencia, TIEMPOS_DE_VERSION, usePreferencias } from "../../../../datos/almacenamiento";
import { guardaEnElDispositivo } from "../../../../datos/almacenamiento";
import { useDescarga } from "../../../../datos/almacenamiento";
import { fecha } from "../../../../formato";
import { useTeclasGlobales } from "../../../../plataforma/teclado/teclas";
import { cambiarSinConexion, NOMBRE_DEL_TIEMPO, useMiVinculo, useMisCelulares, useReducirMovimiento } from "../../../configuracion-comun";
import { IconoDeLaV2, type IconoV2 } from "../../../IconoDeLaV2";
import { haceCuanto } from "../../../../negocio/apartados";
import { describirDispositivo } from "../dispositivo";
import { TEXTOS } from "../../../textos";
import "../../../mas-v2.css";
import "../estilos/configuracion-v2.css";

// Configuración (RF-83, decisión 79) en la computadora, como la v2 del director de arte (variante 1,
// «Dos columnas»; specs/009, decisión 148). A la izquierda, «Esta computadora»: cada preferencia un
// renglón con su baldosa, su llave y su tecla (Alt A, Alt B), y lo de trabajar sin conexión. A la
// derecha, «Tu cuenta»: los celulares con huella y el vínculo con el celular (Alt O, Alt U).
const t = TEXTOS.configuracionV2;

export function Configuracion({ alCambiarElGuardado }: { alCambiarElGuardado?: () => void } = {}) {
  const { animaciones, versionCada, versionNunca } = usePreferencias();
  const reducir = useReducirMovimiento();
  const sinConexion = guardaEnElDispositivo();
  const v = useMiVinculo();
  const teclas = useCallback((e: KeyboardEvent) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (k === "a") { e.preventDefault(); cambiarPreferencia("animaciones", !animaciones); }
    else if (k === "b") { e.preventDefault(); cambiarPreferencia("versionNunca", !versionNunca); }
    else if (k === "o" && v.emparejado) { e.preventDefault(); v.alternarPausa(); }
    else if (k === "u" && v.emparejado) { e.preventDefault(); v.desvincular(); }
  }, [animaciones, versionNunca, v]);
  useTeclasGlobales(teclas);

  return (
    <main id="contenido" className="pagina mv2 cfgv" tabIndex={-1} data-testid="configuracion">
      <header className="cfgv-cabeza"><h1>{t.titulo.largo}</h1><p className="mv-detalle">{t.bajada.largo}</p></header>
      <div className="cfgv-cols">
        <section aria-labelledby="cfgv-esta">
          <h2 id="cfgv-esta" className="cfgv-sub">{t.estaComputadora.largo}</h2>
          <div className="mv-tarjeta-2 cfgv-tarjeta">
            <Renglon icono="destellos" titulo={t.animaciones.largo} id="cfg-animaciones" tecla="Alt A" encendida={animaciones} alCambiar={() => cambiarPreferencia("animaciones", !animaciones)} testId="cfg-animaciones"
              detalle={animaciones ? t.animacionesSi.largo : t.animacionesNo.largo}>
              {reducir && animaciones && <p className="mv-aviso urgente" data-testid="cfg-reducir-movimiento">{t.reducirMovimiento.largo}</p>}
              <div className="cfgv-muestra"><span className={`cfgv-mueve ${animaciones ? "" : "quieto"}`} aria-hidden="true"><i /><b /></span><span className="mv-detalle">{animaciones ? t.asiSeMueve.largo : t.asiAparece.largo}</span></div>
            </Renglon>
            <Renglon icono="repetir" titulo={t.buscarVersion.largo} id="cfg-version" tecla="Alt B" encendida={!versionNunca} alCambiar={() => cambiarPreferencia("versionNunca", !versionNunca)} testId="cfg-version-llave" filaTestId="cfg-version"
              detalle={versionNunca ? t.versionNo.largo : t.versionSi.largo}>
              {!versionNunca && (
                <div className="cfgv-tramos" role="radiogroup" aria-labelledby="cfg-version">
                  {TIEMPOS_DE_VERSION.map((x) => <button key={x} type="button" role="radio" aria-checked={versionCada === x} className={versionCada === x ? "elegido" : ""} onClick={() => cambiarPreferencia("versionCada", x)} data-testid={`cfg-version-${x}`}>{NOMBRE_DEL_TIEMPO[x]}</button>)}
                </div>
              )}
            </Renglon>
            <Renglon icono={sinConexion ? "disco" : "sin-senal"} titulo={t.sinConexion.largo} id="cfg-sin-conexion" encendida={sinConexion} alCambiar={() => void cambiarSinConexion("esta computadora", alCambiarElGuardado)} testId="cfg-sin-conexion"
              detalle={sinConexion ? t.sinConexionSi.largo : t.sinConexionNo.largo} />
          </div>
          {sinConexion && <DatosSinConexion />}
        </section>

        <section aria-labelledby="cfgv-cuenta">
          <h2 id="cfgv-cuenta" className="cfgv-sub">{t.tuCuenta.largo}</h2>
          <MisCelulares />
          {v.emparejado && (
            <div className="mv-tarjeta-2 cfgv-vinculo" data-testid="vinculo">
              <div className="cfgv-linea" aria-hidden="true">
                <span className="cfgv-aparato"><IconoDeLaV2 nombre="celular" /></span><i />
                <span className={`mv-pastilla ${v.pausado ? "" : "logro"}`}><span className="punto" />{v.pausado ? t.desconectados.largo : t.trabajandoJuntos.largo}</span><i />
                <span className="cfgv-aparato"><IconoDeLaV2 nombre="pantalla" /></span>
              </div>
              <b className="cfgv-vinculo-titulo" data-testid="vinculo-actual">{t.vinculadaConTuCelular.largo}</b>
              <p className="mv-detalle">{v.vence ? `${t.hasta.largo} ${fecha(v.vence.slice(0, 10))}. ` : ""}{t.seRenueva.largo}</p>
              <div className="cfgv-botones">
                <button type="button" className="mv-btn chico" onClick={v.alternarPausa} aria-keyshortcuts="Alt+O" data-testid="desconectar-vinculo">{v.pausado ? t.reconectar.largo : t.desconectar.largo} <span className="mv-kbd">Alt O</span></button>
                <button type="button" className="mv-btn chico peligro" onClick={v.desvincular} aria-keyshortcuts="Alt+U" data-testid="desvincular-vinculo" aria-label="Desvincular el celular">{t.desvincular.largo} <span className="mv-kbd">Alt U</span></button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Renglon({ icono, titulo, id, detalle, tecla, encendida, alCambiar, testId, filaTestId, children }: { icono: IconoV2; titulo: string; id: string; detalle: string; tecla?: string; encendida: boolean; alCambiar: () => void; testId: string; filaTestId?: string; children?: ReactNode }) {
  return (
    <div className="cfgv-renglon" data-testid={filaTestId}>
      <span className="cfgv-baldosa"><IconoDeLaV2 nombre={icono} /></span>
      <div className="cfgv-texto"><b id={id}>{titulo}</b><p className="mv-detalle" id={`${id}-detalle`}>{detalle}</p></div>
      <div className="cfgv-llave-caja">
        {tecla && <span className="mv-kbd">{tecla}</span>}
        <button type="button" role="switch" aria-checked={encendida} aria-labelledby={id} aria-describedby={`${id}-detalle`} aria-keyshortcuts={tecla?.replace(" ", "+")} className={`cfgv-llave ${encendida ? "si" : ""}`} onClick={alCambiar} data-testid={testId} />
      </div>
      {children && <div className="cfgv-extra">{children}</div>}
    </div>
  );
}

// Los datos para trabajar sin conexión (specs/018, historia 5): se bajan solo al tocar el botón.
function DatosSinConexion() {
  const { descarga, leida, avance, error, descargar } = useDescarga();
  const numero = (n: number) => n.toLocaleString("es-AR");
  const cuando = descarga ? new Date(descarga.cuando) : null;
  return (
    <div className="cfgv-guarda" data-testid="cfg-descarga">
      <span className="cfgv-baldosa blanca"><IconoDeLaV2 nombre="disco" /></span>
      <div className="cfgv-texto">
        <b id="cfg-descarga">{t.datosSinConexion.largo}</b>
        <p className="mv-detalle" id="cfg-descarga-detalle" aria-live="polite">
          {avance ? <>
            <span className="mv-barra" aria-hidden="true"><b style={{ width: `${avance.total ? Math.min(100, (avance.hechos / avance.total) * 100) : 0}%` }} /></span>
            {avance.total ? `Bajando… ${numero(avance.hechos)} de ${numero(avance.total)} productos.` : `Bajando lo que cambió… ${numero(avance.hechos)} productos.`} Se puede seguir usando la aplicación.
          </> : descarga && cuando
            ? `Bajados el ${String(cuando.getDate()).padStart(2, "0")}/${String(cuando.getMonth() + 1).padStart(2, "0")} a las ${String(cuando.getHours()).padStart(2, "0")}:${String(cuando.getMinutes()).padStart(2, "0")}: ${numero(descarga.cuantos)} productos, su stock y los clientes. Sin internet se busca acá. «Actualizar» trae solo lo que cambió desde entonces.`
            : "Todavía no se bajaron. Bajá los productos, el stock y los clientes para buscar y vender sin internet. Ocupa unos 10 MB; después, «Actualizar» trae solo lo que cambia."}
          {error && <span className="cfgv-error" role="alert" data-testid="cfg-descarga-error"> {error}</span>}
        </p>
      </div>
      <button type="button" className={`mv-btn ${descarga || avance ? "" : "oscuro"}`} disabled={!leida || avance !== null} onClick={descargar} aria-describedby="cfg-descarga-detalle" data-testid="cfg-descargar">
        {avance ? "Descargando…" : descarga ? "Actualizar" : "Descargar"}
      </button>
    </div>
  );
}

function MisCelulares() {
  const c = useMisCelulares();
  return (
    <div className="mv-tarjeta-2 cfgv-celulares" data-testid="celulares">
      {c.error && <p className="mv-aviso error" role="alert">{c.error}</p>}
      {c.mensaje && <p className="mv-aviso logro" role="status" data-testid="mensaje-celular">{c.mensaje}</p>}
      {c.filas?.map((x) => (
        <div key={x.id} className="cfgv-celular" data-testid="celular">
          <span className="cfgv-baldosa"><IconoDeLaV2 nombre="huella" /></span>
          <div className="cfgv-texto"><b>{x.dispositivo ?? "Celular"}</b><p className="mv-detalle">{t.conHuellaDesde.largo} {fecha(x.creada_en.slice(0, 10))}{x.ultimo_uso_en ? ` · ${t.entro.largo} ${haceCuanto(x.ultimo_uso_en)}` : ""}</p></div>
          <button type="button" className="mv-btn chico fantasma" onClick={() => void c.quitar(x)}>{t.quitar.largo}</button>
        </div>
      ))}
      {c.filas && c.filas.length === 0 && <p className="mv-detalle cfgv-sin">{t.sinCelulares.largo}</p>}
      {c.puedeVincular && <button type="button" className="mv-btn chico cfgv-vincular" onClick={() => void c.vincular(describirDispositivo())} data-testid="vincular-celular"><IconoDeLaV2 nombre="huella" tam={16} />{t.vincularConHuella.largo}</button>}
      <p className="cfgv-nota"><IconoDeLaV2 nombre="info" tam={16} />{t.paraSumar.largo}</p>
    </div>
  );
}
