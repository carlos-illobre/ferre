import { useState, useSyncExternalStore, type ReactNode } from "react";
import { decidir, diaCorto, horaCorta, iniciales, porPersona, useParaRevisar, vistaDelCambio, cuandoCorto, type CambioApartado, type VistaDelCambio } from "../../../negocio/apartados";
import { horaDe, laSemana, porDia, TITULOS_DE_ANOMALIA, useAnomalias } from "../../../negocio/anomalias";
import { NOMBRE_DE_MEDIO } from "../../../negocio/ventas/venta";
import { urlDeFoto } from "../../../api";
import { nombreDeProducto } from "../../../formato";
import { IconoDeLaV2, type IconoV2 } from "../../IconoDeLaV2";
import { TEXTOS } from "../../textos";
import { Hoja } from "../componentes/base";
import "../../anomalias.css";
import "../../mas-v2.css";
import "./anomalias-v2.css";

// Más → Anomalías en el celular, como la v2 del director de arte (variante 1, «Tarjetas que se
// abren»; specs/014 y 005, decisión 148). «Para revisar»: por persona, una tarjeta por cambio que se
// abre de a una, con los productos, las dos horas y «Descartar» o «Aceptar» bajo el pulgar (014-E09).
// «Anotadas»: lo de esta semana por producto y el registro entero en una hoja. `cabeza` es el título
// y las pestañas.
const t = TEXTOS.anomaliasV2;
const enLinea = () => navigator.onLine;
const escucharLaRed = (avisar: () => void) => { window.addEventListener("online", avisar); window.addEventListener("offline", avisar); return () => { window.removeEventListener("online", avisar); window.removeEventListener("offline", avisar); }; };
const miles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const Pesos = ({ valor }: { valor: number }) => <><span className="mv-peso">$</span>{miles(valor)}</>;
const ICONO: Record<VistaDelCambio["tipo"], IconoV2> = { venta: "recibo", ajuste: "balanza", producto: "porcentaje", conteo: "unir", consulta: "no-llevo", otro: "info" };

export function ParaRevisarCelu({ cabeza }: { cabeza: ReactNode }) {
  const { datos, error, recargar } = useParaRevisar();
  const conRed = useSyncExternalStore(escucharLaRed, enLinea);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const grupos = datos ? porPersona(datos.apartados) : [];
  const orden = grupos.flatMap((g) => g.cambios);
  const abierto = abiertoId === "" ? null : orden.find((c) => c.id === abiertoId) ?? orden[0] ?? null;
  return (
    <main id="contenido" className="mv2 anvc" data-testid="para-revisar" tabIndex={-1}>
      {cabeza}
      {!conRed && <div className="mv-aviso urgente" role="status"><IconoDeLaV2 nombre="alerta" tam={16} /><div>{t.sinConexionDecidir.corto}</div></div>}
      {error && <div className="mv-aviso error" role="alert"><IconoDeLaV2 nombre="alerta" tam={16} /><div>{conRed ? (error as Error).message : t.sinConexionVer.corto} <button type="button" className="mv-btn chico" onClick={recargar}>{t.reintentar.corto}</button></div></div>}
      {!datos && !error && <p className="mv-cargando" aria-busy="true">{t.buscando.corto}</p>}
      {datos && orden.length === 0 && <div className="mv-vacio" data-testid="nada-para-revisar"><span className="tilde"><IconoDeLaV2 nombre="tilde" tam={32} /></span><b>{t.nadaParaRevisar.corto}</b><span>{t.nadaParaRevisarDetalle.corto}</span></div>}
      {orden.length > 0 && <p className="anvc-linea"><IconoDeLaV2 nombre="info" tam={16} /><span>{t.nadaCuenta.corto}</span></p>}
      {grupos.map((g, i) => (
        <section key={g.usuario_id} className={`anvc-grupo ${i > 0 ? "otro" : ""}`} aria-label={g.usuario}>
          <div className="anvc-persona"><span className="mv-avatar">{iniciales(g.usuario)}</span><div><div className="nm">{g.usuario}</div>{g.dispositivo && <div className="mv-detalle">{g.dispositivo}</div>}</div><span className="mv-pastilla error">{t.sinAcceso.corto}</span></div>
          {g.cambios.map((c) => <Tarjeta key={c.id} cambio={c} abierta={c.id === abierto?.id} conRed={conRed} alTocar={() => setAbiertoId(c.id === abierto?.id ? "" : c.id)} alDecidir={() => { const j = orden.indexOf(c); setAbiertoId(orden[j + 1]?.id ?? orden[j - 1]?.id ?? ""); }} />)}
        </section>
      ))}
    </main>
  );
}

function Tarjeta({ cambio: c, abierta, conRed, alTocar, alDecidir }: { cambio: CambioApartado; abierta: boolean; conRed: boolean; alTocar: () => void; alDecidir: () => void }) {
  const v = vistaDelCambio(c);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noSePuede = Boolean(c.error);
  const motivo = error ?? (c.error ? `${t.noSePudo.corto}: ${c.error}` : null);
  async function hacer(decision: "aceptar" | "descartar") {
    setEnCurso(true); setError(null);
    try { await decidir(c.id, decision); alDecidir(); }
    catch (e) { setError((e as Error).message); }
    finally { setEnCurso(false); }
  }
  const titulo = v.tipo === "venta" ? `${v.nombre}${v.medio ? ` · ${NOMBRE_DE_MEDIO[v.medio as keyof typeof NOMBRE_DE_MEDIO] ?? v.medio}` : ""}` : v.nombre;
  const detalle = v.tipo === "venta" ? `${diaCorto(c.hecho_en).split(" ")[0]} ${horaCorta(c.hecho_en)} · ${v.productos.length === 1 ? "1 producto" : `${v.productos.length} productos`}` : v.detalle;
  return (
    <div className={`anvc-card ${abierta ? "abierta" : ""}`} data-testid="apartado">
      <button type="button" className={`fila ${noSePuede ? "no" : ""}`} aria-expanded={abierta} onClick={alTocar}>
        <span className="ico"><IconoDeLaV2 nombre={ICONO[v.tipo]} /></span>
        <span className="tx"><span className="t">{titulo}</span><span className="d">{detalle}</span></span>
        <span className={`m ${v.importe === null ? "hora" : ""}`}>{v.importe === null ? (noSePuede ? t.noVa.corto : horaCorta(c.hecho_en)) : <Pesos valor={v.importe} />}</span>
        {abierta ? <span /> : <IconoDeLaV2 nombre="abajo" tam={16} className="ch" />}
      </button>
      {abierta && <>
        {v.productos.length > 0 && <div className="prods">
          {v.productos.map((p, i) => (
            <div key={i} className="p">
              <span className="mv-foto">{p.foto_url ? <img src={urlDeFoto(p.foto_url) ?? ""} alt="" loading="lazy" /> : <IconoDeLaV2 nombre="paquete" tam={18} />}</span>
              <span className="tx"><span className="n">{nombreDeProducto(p.descripcion)}</span><span className="q">{p.cantidad}</span></span>
              <b>{p.importe === null ? "—" : `$${miles(p.importe)}`}</b>
            </div>
          ))}
        </div>}
        <div className="hor">
          <span className="mv-pastilla contorno"><IconoDeLaV2 nombre="celular" tam={16} />{v.hecho} {diaCorto(c.hecho_en).split(" ")[0]} {horaCorta(c.hecho_en)}</span>
          <span className="mv-pastilla contorno"><IconoDeLaV2 nombre="nube-subir" tam={16} />{t.llego.corto} {cuandoCorto(c.llegado_en)}</span>
        </div>
        {motivo ? <div className="mv-aviso error" role="alert" data-testid="error-de-apartado"><IconoDeLaV2 nombre={noSePuede ? "unir" : "alerta"} tam={16} /><div>{motivo}</div></div>
          : v.tipo !== "venta" && v.efecto[0] && <div className="mv-aviso pino"><IconoDeLaV2 nombre="info" tam={16} /><div>{v.efecto[0]}</div></div>}
        <div className="botones">
          <button type="button" className="mv-btn peligro" disabled={!conRed || enCurso} onClick={() => void hacer("descartar")} data-testid="descartar-apartado"><IconoDeLaV2 nombre="cruz" tam={16} />{t.descartar.corto}</button>
          <button type="button" className="mv-btn accion" disabled={!conRed || enCurso} onClick={() => void hacer("aceptar")} data-testid="aceptar-apartado"><IconoDeLaV2 nombre="tilde" tam={16} />{v.boton}</button>
        </div>
      </>}
    </div>
  );
}

export function AnotadasCelu({ cabeza }: { cabeza: ReactNode }) {
  const primera = useAnomalias(1);
  const [registro, setRegistro] = useState(false);
  const semana = laSemana(primera.datos);
  const sinRed = primera.error && !(primera.error as { estado?: number }).estado;
  return (
    <main id="contenido" className="mv2 anvc" data-testid="anomalias" tabIndex={-1}>
      {cabeza}
      {primera.error && <div className="mv-aviso error" role="alert"><IconoDeLaV2 nombre="alerta" tam={16} /><div>{sinRed ? t.sinConexionAnotadas.corto : (primera.error as Error).message} <button type="button" className="mv-btn chico" onClick={primera.recargar}>{t.reintentar.corto}</button></div></div>}
      {!primera.datos && !primera.error && <p className="mv-cargando" aria-busy="true">{t.buscandoAnotadas.corto}</p>}
      {primera.datos && <p className="anvc-linea" data-testid="anomalias-de-la-semana"><IconoDeLaV2 nombre="alerta" tam={16} /><span><b>{semana ? `${semana.cuantas} esta semana` : "— esta semana"}</b>{semana && semana.cuantas > 0 ? ` · faltaron ${semana.falto.replace(" + ", " y ")}` : ""}</span></p>}
      {primera.datos && primera.datos.anomalias.length === 0 && <p className="mv-detalle anvc-sin">{t.ningunaAnotada.corto}</p>}
      {semana?.productos.map((p) => (
        <div key={p.producto_id} className="anvc-prod" data-testid="producto-con-anomalias">
          <span className="mv-foto">{p.foto_url ? <img src={urlDeFoto(p.foto_url) ?? ""} alt="" loading="lazy" /> : <IconoDeLaV2 nombre="paquete" tam={18} />}</span>
          <span className="tx"><span className="n">{nombreDeProducto(p.producto)}</span><span className="mv-detalle">{p.veces === 1 ? "1 vez" : `${p.veces} veces`}</span></span>
          <b>−{p.falto}</b>
        </div>
      ))}
      {primera.datos && <button type="button" className="anvc-registro" onClick={() => setRegistro(true)} data-testid="ver-registro"><IconoDeLaV2 nombre="candado" /><span>{t.noSeEdita.corto}</span><IconoDeLaV2 nombre="derecha" tam={16} className="ch" /></button>}
      {registro && <Registro alCerrar={() => setRegistro(false)} />}
    </main>
  );
}

// El registro entero, de la más nueva a la más vieja, de a una página.
function Registro({ alCerrar }: { alCerrar: () => void }) {
  const [pagina, setPagina] = useState(1);
  const { datos, error } = useAnomalias(pagina);
  return (
    <Hoja titulo={t.registro.corto} alCerrar={alCerrar} testId="hoja-registro" clase="mv2 anvc-hoja">
      <div className="mv-aviso pino"><IconoDeLaV2 nombre="candado" tam={16} /><div>{t.noSeEditaDetalle.corto}</div></div>
      {error && <p className="mv-aviso error" role="alert">{(error as { estado?: number }).estado ? (error as Error).message : t.sinConexionAnotadas.corto}</p>}
      {datos && datos.anomalias.length === 0 && <p className="mv-detalle">{pagina === 1 ? t.ningunaAnotada.corto : t.noHayMas.corto}</p>}
      {datos && <div className="anvc-entradas" data-testid="lista-de-anomalias">
        {porDia(datos.anomalias).map((d) => (
          <div key={d.dia}>
            <div className="dia">{d.dia}</div>
            {d.anomalias.map((a) => (
              <div key={a.id} className="ent" data-testid="anomalia">
                <span className="h">{horaDe(a.creado_en)}</span>
                <div><div className="n">{nombreDeProducto(a.producto)}</div><div className="d"><b>{TITULOS_DE_ANOMALIA[a.tipo] ?? a.tipo}.</b> {a.detalle} · {a.usuario ?? t.sinUsuario.corto}</div></div>
              </div>
            ))}
          </div>
        ))}
      </div>}
      {datos && (pagina > 1 || datos.hay_mas) && (
        <nav className="anvc-paginas" aria-label="Páginas">
          <button type="button" className="mv-btn chico" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>{t.masNuevas.corto}</button>
          <span className="mv-detalle">{t.pagina.corto} {pagina}</span>
          <button type="button" className="mv-btn chico" disabled={!datos.hay_mas} onClick={() => setPagina(pagina + 1)}>{t.masViejas.corto}</button>
        </nav>
      )}
    </Hoja>
  );
}
