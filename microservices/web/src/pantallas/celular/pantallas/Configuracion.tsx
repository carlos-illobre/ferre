import type { ReactNode } from "react";
import { cambiarPreferencia, usePreferencias } from "../../../datos/almacenamiento";
import { guardaEnElDispositivo } from "../../../datos/almacenamiento";
import { useDescarga } from "../../../datos/almacenamiento";
import { fecha } from "../../../formato";
import { cambiarSinConexion, useMiVinculo, useMisCelulares, useReducirMovimiento } from "../../configuracion-comun";

import { haceCuanto } from "../../../negocio/apartados";
import { describirDispositivo } from "./Login";
import { TEXTOS } from "../../textos";
import "../../mas-v2.css";
import "./configuracion-v2.css";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";

// Configuración (RF-83, decisión 79) en el celular, como la v2 del director de arte (variante 1,
// «Ajustes»; specs/009, decisión 148): una columna de tarjetas. Arriba cuánto se guarda en este
// celular; «Este celular» con las animaciones y trabajar sin conexión; «Versión nueva»; «Mis
// celulares con huella» y el vínculo con la computadora. «Cómo buscar productos» ya no está acá
// (decisión 138).
const t = TEXTOS.configuracionV2;

export function ConfiguracionCelu({ alCambiarElGuardado }: { alCambiarElGuardado?: () => void } = {}) {
  const { animaciones } = usePreferencias();
  const reducir = useReducirMovimiento();
  const sinConexion = guardaEnElDispositivo();
  const v = useMiVinculo();
  const c = useMisCelulares();
  return (
    <main id="contenido" className="mv2 cfgvc" tabIndex={-1} data-testid="configuracion">
      <h1>{t.titulo.corto}</h1>
      <div className="mv-tarjeta-2 cfgvc-guardado">
        <span className="cfgvc-baldosa"><Icono nombre="disco" tam={24} /></span>
        <div><div className="mv-detalle">{t.guardadoEn.corto}</div><div className="va">—</div><div className="mv-barra"><b style={{ width: 0 }} /></div></div>
      </div>

      <h2 className="cfgvc-sub">{t.estaComputadora.corto}</h2>
      <div className="mv-tarjeta-2 cfgvc-tarjeta">
        <Renglon icono="destellos" titulo={t.animaciones.corto} id="cfg-animaciones" encendida={animaciones} alCambiar={() => cambiarPreferencia("animaciones", !animaciones)} testId="cfg-animaciones"
          detalle={animaciones ? t.animacionesSi.corto : t.animacionesNo.corto}>
          {reducir && animaciones && <p className="mv-aviso urgente" data-testid="cfg-reducir-movimiento">{t.reducirMovimiento.corto}</p>}
        </Renglon>
        <Renglon icono={sinConexion ? "disco" : "sin-senal"} titulo={t.sinConexion.corto} id="cfg-sin-conexion" encendida={sinConexion} alCambiar={() => void cambiarSinConexion("este celular", alCambiarElGuardado)} testId="cfg-sin-conexion"
          detalle={sinConexion ? t.sinConexionSi.corto : t.sinConexionNo.corto} />
      </div>
      {sinConexion && <DatosSinConexion />}


      <h2 className="cfgvc-sub">{t.misCelulares.corto}{c.filas && <span className="mv-pastilla">{c.filas.length}</span>}</h2>
      <div className="mv-tarjeta-2 cfgvc-celulares" data-testid="celulares">
        {c.error && <p className="mv-aviso error" role="alert">{c.error}</p>}
        {c.mensaje && <p className="mv-aviso logro" role="status" data-testid="mensaje-celular">{c.mensaje}</p>}
        {c.filas?.map((x) => (
          <div key={x.id} className="cfgvc-celular" data-testid="celular">
            <span className="cfgvc-baldosa"><Icono nombre="huella" /></span>
            <div className="cfgvc-texto"><b>{x.dispositivo ?? "Celular"}</b><p className="mv-detalle">{x.ultimo_uso_en ? `Última vez ${haceCuanto(x.ultimo_uso_en)}` : `${t.conHuellaDesde.corto} ${fecha(x.creada_en.slice(0, 10))}`}</p></div>
            <button type="button" className="mv-btn chico fantasma" onClick={() => void c.quitar(x)}>{t.quitar.corto}</button>
          </div>
        ))}
        {c.filas && c.filas.length === 0 && <p className="mv-detalle cfgvc-sin">{t.sinCelulares.corto}</p>}
        {c.puedeVincular ? <button type="button" className="mv-btn cfgvc-vincular" onClick={() => void c.vincular(describirDispositivo())} data-testid="vincular-celular"><Icono nombre="huella" tam={18} />{t.vincularConHuella.corto}</button>
          : <p className="cfgvc-nota"><Icono nombre="info" tam={16} />Este dispositivo no tiene lector de huella o desbloqueo compatible.</p>}
      </div>

      {v.emparejado && <>
        <h2 className="cfgvc-sub">{t.vinculoConLaComputadora.corto}</h2>
        <div className="mv-tarjeta-2 cfgvc-vinculo" data-testid="vinculo">
          <div className="cfgvc-linea" aria-hidden="true">
            <span className="cfgvc-aparato"><Icono nombre="celular" /></span><i />
            <span className={`mv-pastilla ${v.pausado ? "" : "logro"}`}><span className="punto" />{v.pausado ? t.desconectados.corto : t.trabajandoJuntos.corto}</span><i />
            <span className="cfgvc-aparato"><Icono nombre="pantalla" /></span>
          </div>
          <b className="cfgvc-vinculo-titulo" data-testid="vinculo-actual">{t.vinculadaConTuCelular.corto}</b>
          {v.vence && <p className="mv-detalle">{t.hasta.corto} {fecha(v.vence.slice(0, 10))}</p>}
          <div className="cfgvc-botones">
            <button type="button" className="mv-btn" onClick={v.alternarPausa} data-testid="desconectar-vinculo">{v.pausado ? t.reconectar.corto : t.desconectar.corto}</button>
            <button type="button" className="mv-btn peligro" onClick={v.desvincular} data-testid="desvincular-vinculo" aria-label="Desvincular la computadora">{t.desvincular.corto}</button>
          </div>
        </div>
      </>}
    </main>
  );
}

function Renglon({ icono, titulo, id, detalle, encendida, alCambiar, testId, filaTestId, children }: { icono: NombreDeIcono; titulo: string; id: string; detalle: string; encendida: boolean; alCambiar: () => void; testId: string; filaTestId?: string; children?: ReactNode }) {
  return (
    <div className="cfgvc-renglon" data-testid={filaTestId}>
      <span className="cfgvc-baldosa"><Icono nombre={icono} /></span>
      <div className="cfgvc-texto"><b id={id}>{titulo}</b><p className="mv-detalle" id={`${id}-detalle`}>{detalle}</p></div>
      <button type="button" role="switch" aria-checked={encendida} aria-labelledby={id} aria-describedby={`${id}-detalle`} className={`cfgvc-llave ${encendida ? "si" : ""}`} onClick={alCambiar} data-testid={testId} />
      {children && <div className="cfgvc-extra">{children}</div>}
    </div>
  );
}

function DatosSinConexion() {
  const { descarga, leida, avance, error, descargar } = useDescarga();
  const numero = (n: number) => n.toLocaleString("es-AR");
  const cuando = descarga ? new Date(descarga.cuando) : null;
  return (
    <div className="cfgvc-guarda" data-testid="cfg-descarga">
      <span className="cfgvc-baldosa blanca"><Icono nombre="disco" /></span>
      <div className="cfgvc-texto">
        <b id="cfg-descarga">{t.datosSinConexion.corto}</b>
        <p className="mv-detalle" id="cfg-descarga-detalle" aria-live="polite">
          {avance ? <>
            <span className="mv-barra" aria-hidden="true"><b style={{ width: `${avance.total ? Math.min(100, (avance.hechos / avance.total) * 100) : 0}%` }} /></span>
            {avance.total ? `Bajando… ${numero(avance.hechos)} de ${numero(avance.total)} productos.` : `Bajando lo que cambió… ${numero(avance.hechos)} productos.`}
          </> : descarga && cuando
            ? `Bajados el ${String(cuando.getDate()).padStart(2, "0")}/${String(cuando.getMonth() + 1).padStart(2, "0")} a las ${String(cuando.getHours()).padStart(2, "0")}:${String(cuando.getMinutes()).padStart(2, "0")}: ${numero(descarga.cuantos)} productos, su stock y los clientes. «Actualizar» trae solo lo que cambió.`
            : "Todavía no se bajaron. Bajá los productos, el stock y los clientes para buscar y vender sin internet. Ocupa unos 10 MB."}
          {error && <span className="cfgvc-error" role="alert" data-testid="cfg-descarga-error"> {error}</span>}
        </p>
      </div>
      <button type="button" className={`mv-btn ${descarga || avance ? "" : "oscuro"}`} disabled={!leida || avance !== null} onClick={descargar} aria-describedby="cfg-descarga-detalle" data-testid="cfg-descargar">
        {avance ? "Descargando…" : descarga ? "Actualizar" : "Descargar"}
      </button>
    </div>
  );
}
