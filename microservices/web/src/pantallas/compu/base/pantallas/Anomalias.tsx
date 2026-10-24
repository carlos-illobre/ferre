import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cuandoCorto, decidir, diaCorto, haceCuanto, horaCorta, iniciales, porPersona, resumenDeLoApartado, useParaRevisar, vistaDelCambio, type CambioApartado, type VistaDelCambio } from "../../../../negocio/apartados";
import { laSemana, porDia, horaDe, TITULOS_DE_ANOMALIA, ultimaVez, useAnomalias } from "../../../../negocio/anomalias";
import { urlDeFoto } from "../../../../api";
import { nombreDeProducto } from "../../../../formato";
import { useTeclasGlobales } from "../../../../plataforma/teclado/teclas";
import { AlLadoDeLasPestanas } from "../../../AlLadoDeLasPestanas";
import { IconoDeLaV2, type IconoV2 } from "../../../IconoDeLaV2";
import { IconoDeMedio } from "../../../IconoDeMedio";
import { usePuede } from "../../../permisos";
import { NOMBRES, TEXTOS } from "../../../textos";
import { NOMBRE_DE_MEDIO } from "../../../../negocio/ventas/venta";
import { irA } from "../rutas";
import "../../../anomalias.css";
import "../../../mas-v2.css";
import "../estilos/anomalias-v2.css";

// Más → Anomalías en la computadora, como la v2 del director de arte (variante 1, «Bandeja y
// detalle»; specs/014 y 005, decisión 148). «Para revisar»: cuatro números arriba, la bandeja por
// persona a la izquierda y el detalle del elegido a la derecha, con «Si la aceptás». ↑ ↓ eligen,
// A acepta y D descarta, de a uno (014-E09). «Anotadas»: lo de esta semana por producto y el
// registro, que no se edita ni se borra. Las pestañas las pone la aplicación.
const t = TEXTOS.anomaliasV2;
const enLinea = () => navigator.onLine;
const escucharLaRed = (avisar: () => void) => { window.addEventListener("online", avisar); window.addEventListener("offline", avisar); return () => { window.removeEventListener("online", avisar); window.removeEventListener("offline", avisar); }; };
const miles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const Pesos = ({ valor }: { valor: number }) => <><span className="mv-peso">$</span>{miles(valor)}</>;
const ICONO: Record<VistaDelCambio["tipo"], IconoV2> = { venta: "recibo", ajuste: "balanza", producto: "porcentaje", conteo: "unir", consulta: "no-llevo", otro: "info" };

function VerEnQuienHizoQue() {
  const puedeEsto = usePuede();
  if (!puedeEsto("negocio.actividad")) return null;
  return <AlLadoDeLasPestanas><button type="button" className="mv-btn chico anv-quien mv2" onClick={() => irA("actividad")} data-testid="ver-en-quien-hizo-que"><IconoDeLaV2 nombre="historia" tam={16} />{t.verEnQuienHizoQue.largo}</button></AlLadoDeLasPestanas>;
}

export function ParaRevisar({ titulo = true }: { titulo?: boolean }) {
  const { datos, error, recargar } = useParaRevisar();
  const conRed = useSyncExternalStore(escucharLaRed, enLinea);
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enCurso, setEnCurso] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const grupos = datos ? porPersona(datos.apartados) : [];
  const orden = grupos.flatMap((g) => g.cambios);
  const elegido = orden.find((c) => c.id === elegidoId) ?? orden[0] ?? null;
  useEffect(() => { lista.current?.querySelector("[data-elegido='si']")?.scrollIntoView?.({ block: "nearest" }); }, [elegido?.id]);

  const hacer = useCallback(async (c: CambioApartado, decision: "aceptar" | "descartar") => {
    if (!conRed || enCurso) return;
    const i = orden.indexOf(c);
    setEnCurso(true); setErrores((e) => ({ ...e, [c.id]: "" }));
    try { await decidir(c.id, decision); setElegidoId(orden[i + 1]?.id ?? orden[i - 1]?.id ?? null); }
    catch (e) { setErrores((x) => ({ ...x, [c.id]: (e as Error).message })); }
    finally { setEnCurso(false); }
  }, [conRed, enCurso, orden]);

  const teclas = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !elegido || document.querySelector("dialog[open]")) return;
    const k = e.key.toLowerCase();
    if (k === "arrowdown" || k === "arrowup") {
      e.preventDefault();
      const i = orden.indexOf(elegido) + (k === "arrowdown" ? 1 : -1);
      setElegidoId(orden[Math.max(0, Math.min(orden.length - 1, i))]!.id);
    } else if (k === "a") { e.preventDefault(); void hacer(elegido, "aceptar"); }
    else if (k === "d") { e.preventDefault(); void hacer(elegido, "descartar"); }
  }, [elegido, orden, hacer]);
  useTeclasGlobales(teclas);

  const r = datos ? resumenDeLoApartado(datos.apartados) : null;
  return (
    <main id="contenido" className="pagina mv2 anv" data-testid="para-revisar" tabIndex={-1}>
      {titulo ? <h1 className="anv-titulo">{NOMBRES.anomalias}</h1> : <h1 className="anv-oculto">{NOMBRES.anomalias}</h1>}
      <VerEnQuienHizoQue />
      {!conRed && <div className="mv-aviso urgente" role="status"><IconoDeLaV2 nombre="alerta" tam={16} />{t.sinConexionDecidir.largo}</div>}
      {error && <div className="mv-aviso error" role="alert"><IconoDeLaV2 nombre="alerta" tam={16} /><span>{conRed ? (error as Error).message : t.sinConexionVer.largo}</span><button type="button" className="mv-btn chico" onClick={recargar}>{t.reintentar.largo}</button></div>}
      {!datos && !error && <p className="mv-cargando" aria-busy="true">{t.buscando.largo}</p>}
      {r && <div className="anv-resumenes">
        <div className="mv-resumen urgente"><span className="ico"><IconoDeLaV2 nombre="bandeja" /></span><div><div className="et">{t.esperan.largo}</div><div className="va" data-testid="cuantos-para-revisar">{r.cambios === 1 ? "1 cambio" : `${r.cambios} cambios`}</div></div></div>
        <div className="mv-resumen"><span className="ico"><IconoDeLaV2 nombre="recibo" /></span><div><div className="et">{r.ventas ? `En ${r.ventas === 1 ? "1 venta" : `${r.ventas} ventas`} sin registrar` : t.ningunaVenta.largo}</div><div className="va"><Pesos valor={r.plata} /></div></div></div>
        <div className="mv-resumen"><span className="ico"><IconoDeLaV2 nombre="persona-fuera" /></span><div><div className="et">{t.personas.largo}</div><div className="va">{r.personas}</div></div></div>
        <div className="mv-resumen"><span className="ico"><IconoDeLaV2 nombre="reloj-de-arena" /></span><div><div className="et">{t.masViejo.largo}</div><div className="va">{r.masViejo ? haceCuanto(r.masViejo) : "—"}</div></div></div>
      </div>}
      {datos && orden.length === 0 && <div className="mv-tarjeta anv-vacio" data-testid="nada-para-revisar"><div className="mv-vacio"><span className="tilde"><IconoDeLaV2 nombre="tilde" tam={32} /></span><b>{t.nadaParaRevisar.largo}</b><span>{t.nadaParaRevisarDetalle.largo}</span></div></div>}
      {datos && elegido && (
        <div className="anv-cols">
          <div className="anv-lista" ref={lista} data-flechas-propias>
            {grupos.map((g) => (
              <section key={g.usuario_id} className="anv-grupo" aria-label={g.usuario}>
                <div className="anv-persona"><span className="mv-avatar">{iniciales(g.usuario)}</span><b>{g.usuario}</b><span className="mv-pastilla error">{t.sinAcceso.largo}</span>{g.dispositivo && <span className="mv-detalle">{g.dispositivo}</span>}</div>
                {g.cambios.map((c) => {
                  const v = vistaDelCambio(c);
                  const no = Boolean(errores[c.id] || c.error);
                  return (
                    <button key={c.id} type="button" className={`anv-item ${c.id === elegido.id ? "sel" : ""} ${no ? "no" : ""}`} data-elegido={c.id === elegido.id ? "si" : "no"} aria-pressed={c.id === elegido.id} onClick={() => setElegidoId(c.id)} data-testid="apartado">
                      <span className="ico"><IconoDeLaV2 nombre={ICONO[v.tipo]} /></span>
                      <span className="tx"><span className="t">{v.nombre}{v.tipo === "venta" ? ` · ${v.productos.length === 1 ? "1 producto" : `${v.productos.length} productos`}` : ""}</span><span className="d">{v.detalle}</span></span>
                      <span className={`m ${v.importe === null ? "hora" : ""}`}>{v.importe === null ? horaCorta(c.hecho_en) : <Pesos valor={v.importe} />}</span>
                      <IconoDeLaV2 nombre="derecha" tam={16} className="ch" />
                    </button>
                  );
                })}
              </section>
            ))}
            <div className="mv-aviso pino anv-nada-cuenta"><IconoDeLaV2 nombre="info" tam={16} /><div>{t.nadaCuenta.largo}</div></div>
          </div>
          <Detalle key={elegido.id} cambio={elegido} numero={orden.indexOf(elegido) + 1} de={orden.length} conRed={conRed} enCurso={enCurso} error={errores[elegido.id] || null} alDecidir={(d) => void hacer(elegido, d)} />
        </div>
      )}
    </main>
  );
}

function Detalle({ cambio: c, numero, de, conRed, enCurso, error, alDecidir }: { cambio: CambioApartado; numero: number; de: number; conRed: boolean; enCurso: boolean; error: string | null; alDecidir: (d: "aceptar" | "descartar") => void }) {
  const v = vistaDelCambio(c);
  const motivo = error || (c.error ? `${t.noSePudo.largo}: ${c.error}` : null);
  const noSePuede = Boolean(c.error);
  const pasos = [
    { nombre: v.hecho, cuando: `${diaCorto(c.hecho_en)} ${horaCorta(c.hecho_en)}`, clase: "" },
    ...(c.desactivado_en ? [{ nombre: t.sesionCerrada.largo, cuando: `${diaCorto(c.desactivado_en)} ${horaCorta(c.desactivado_en)}`, clase: "rojo" }] : []),
    { nombre: t.llego.largo, cuando: cuandoCorto(c.llegado_en), clase: "pino" },
  ];
  return (
    <section className="mv-tarjeta-2 anv-detalle" aria-label={t.elCambioElegido.largo} data-testid="cambio-elegido">
      <div className="anv-det-cab">
        <div><div className="mv-etiqueta">{v.nombre} de {c.usuario} · {numero} de {de}</div><h2 className="mv-seccion">{v.titulo}</h2></div>
        {v.medio ? <span className={`anv-medio medio-${v.medio}`}><IconoDeMedio medio={v.medio} tam={16} />{NOMBRE_DE_MEDIO[v.medio as keyof typeof NOMBRE_DE_MEDIO] ?? v.medio}</span>
          : <span className={`mv-pastilla ${noSePuede ? "error" : "contorno"}`}><IconoDeLaV2 nombre={ICONO[v.tipo]} tam={16} />{v.nombre}</span>}
      </div>
      <ol className="anv-linea" style={{ gridTemplateColumns: `repeat(${pasos.length}, 1fr)`, "--pasos": pasos.length } as React.CSSProperties}>
        {pasos.map((p) => <li key={p.nombre} className="paso"><span className={`pt ${p.clase}`} /><b>{p.nombre}</b><span>{p.cuando}</span></li>)}
      </ol>
      <div className="anv-cuerpo">
        <div className="anv-productos">
          {v.productos.map((p, i) => (
            <div key={i} className="anv-prod">
              <span className="mv-foto">{p.foto_url ? <img src={urlDeFoto(p.foto_url) ?? ""} alt="" loading="lazy" /> : <IconoDeLaV2 nombre="paquete" tam={20} />}</span>
              <span><span className="n">{nombreDeProducto(p.descripcion)}</span><span className="d">{[p.cantidad, p.marca].filter(Boolean).join(" · ")}</span></span>
              <span className="p">{p.importe === null ? "—" : `$${miles(p.importe)}`}</span>
            </div>
          ))}
          {v.tipo === "venta" ? <div className="anv-total"><span className="mv-etiqueta">{t.total.largo} · {v.productos.length === 1 ? "1 producto" : `${v.productos.length} productos`}</span><span className="mv-numero anv-grande"><Pesos valor={v.importe ?? 0} /></span></div>
            : <div className="anv-que"><span className="mv-etiqueta">{v.nombre}</span><b>{v.detalle}</b></div>}
        </div>
        <div className="anv-efecto">
          {noSePuede ? <>
            <h3>{t.porQueNo.largo}</h3>
            <div className="mv-aviso error" data-testid="error-de-apartado"><IconoDeLaV2 nombre="unir" tam={16} /><div>{c.error}</div></div>
            <div className="ef"><IconoDeLaV2 nombre="historia" tam={16} /><div>{t.siLoDescartas.largo}</div></div>
          </> : <>
            <h3>{v.tipo === "venta" ? t.siLaAceptas.largo : t.siLoAceptas.largo}</h3>
            {v.efecto.map((e, i) => <div key={i} className="ef"><IconoDeLaV2 nombre={i === 0 && v.tipo === "venta" ? "calendario" : "paquete"} tam={16} /><div>{e}</div></div>)}
            <div className="ef"><IconoDeLaV2 nombre="historia" tam={16} /><div>{t.quienHizoQueDira.largo} <b>{v.tipo === "venta" ? t.laAceptasteVos.largo : t.loAceptasteVos.largo}</b>.</div></div>
          </>}
        </div>
      </div>
      {motivo && !noSePuede && <div className="mv-aviso error anv-motivo" role="alert" data-testid="error-de-apartado"><IconoDeLaV2 nombre="alerta" tam={16} /><div>{motivo}</div></div>}
      <div className="anv-pie">
        <span className="nav"><span className="mv-kbd">↑</span><span className="mv-kbd">↓</span>{t.otroCambio.largo}</span>
        <div className="der">
          <button type="button" className="mv-btn peligro" disabled={!conRed || enCurso} onClick={() => alDecidir("descartar")} aria-keyshortcuts="D" data-testid="descartar-apartado"><IconoDeLaV2 nombre="cruz" tam={16} />{t.descartar.largo} <span className="mv-kbd">D</span></button>
          <button type="button" className="mv-btn accion" disabled={!conRed || enCurso} onClick={() => alDecidir("aceptar")} aria-keyshortcuts="A" data-testid="aceptar-apartado"><IconoDeLaV2 nombre="tilde" tam={16} />{v.boton} <span className="mv-kbd">A</span></button>
        </div>
      </div>
    </section>
  );
}

export function Anotadas({ titulo = true }: { titulo?: boolean }) {
  const [pagina, setPagina] = useState(1);
  const { datos, error, recargar } = useAnomalias(pagina);
  const primera = useAnomalias(1);
  const semana = laSemana(primera.datos);
  const sinRed = error && !(error as { estado?: number }).estado;
  return (
    <main id="contenido" className="pagina mv2 anv anv-anotadas" data-testid="anomalias" tabIndex={-1}>
      {titulo ? <h1 className="anv-titulo">{NOMBRES.anomalias}</h1> : <h1 className="anv-oculto">{NOMBRES.anomalias}</h1>}
      <VerEnQuienHizoQue />
      <div className="anv-resumenes">
        <div className="mv-resumen"><span className="ico"><IconoDeLaV2 nombre="alerta" /></span><div><div className="et">{t.estaSemana.largo}</div><div className="va" data-testid="anomalias-de-la-semana">{semana ? (semana.cuantas === 1 ? "1 anomalía" : `${semana.cuantas} anomalías`) : "—"}</div></div></div>
        <div className="mv-resumen"><span className="ico"><IconoDeLaV2 nombre="paquete" /></span><div><div className="et">{t.faltaron.largo}</div><div className="va">{semana?.falto || "—"}</div></div></div>
        <div className="mv-resumen"><span className="ico"><IconoDeLaV2 nombre="lista-tildada" /></span><div><div className="et">{t.contadosDespues.largo}</div><div className="va">—</div><div className="mv-barra"><b style={{ width: 0 }} /></div></div></div>
        <div className="mv-resumen urgente"><span className="ico"><IconoDeLaV2 nombre="repetir" /></span><div><div className="et">{t.laQueMas.largo}</div><div className="va">{semana?.laQueMas ? nombreDeProducto(semana.laQueMas) : "—"}</div></div></div>
      </div>
      <div className="anv-cols anotadas">
        <div className="anv-lista">
          <h2 className="mv-seccion anv-sub">{t.queHayQueContar.largo}</h2>
          {semana && semana.productos.length === 0 && <p className="mv-detalle">{t.nadaEstaSemana.largo}</p>}
          {!semana && primera.datos && <p className="mv-detalle">—</p>}
          {semana?.productos.map((p) => (
            <div key={p.producto_id} className="anv-renglon" data-testid="producto-con-anomalias">
              <span className="mv-foto">{p.foto_url ? <img src={urlDeFoto(p.foto_url) ?? ""} alt="" loading="lazy" /> : <IconoDeLaV2 nombre="paquete" tam={20} />}</span>
              <span><span className="t">{nombreDeProducto(p.producto)}</span><span className="d">{p.veces === 1 ? "1 vez" : `${p.veces} veces`} · {ultimaVez(p.ultima)}</span></span>
              <span className="mv-dato error"><span className="et">{p.uno ? t.falto.largo : t.faltaron.largo}</span><span className="va">{p.falto}</span></span>
              <span className="anv-contar" />
            </div>
          ))}
        </div>
        <aside className="mv-tarjeta anv-registro" aria-label={t.registro.largo}>
          <div className="cab"><IconoDeLaV2 nombre="candado" /><b>{t.registro.largo}</b><span className="mv-pastilla contorno">{t.noSeEdita.largo}</span></div>
          {error && <div className="mv-aviso error" role="alert"><span>{sinRed ? t.sinConexionAnotadas.largo : (error as Error).message}</span><button type="button" className="mv-btn chico" onClick={recargar}>{t.reintentar.largo}</button></div>}
          {!datos && !error && <p className="mv-cargando" aria-busy="true">{t.buscandoAnotadas.largo}</p>}
          {datos && datos.anomalias.length === 0 && <p className="mv-detalle anv-sin">{pagina === 1 ? t.ningunaAnotada.largo : t.noHayMas.largo}</p>}
          {datos && datos.anomalias.length > 0 && (
            <div className="anv-entradas" data-testid="lista-de-anomalias">
              {porDia(datos.anomalias).map((d) => (
                <div key={d.dia}>
                  <div className="dia">{d.dia}</div>
                  {d.anomalias.map((a) => (
                    <div key={a.id} className="ent" data-testid="anomalia">
                      <span className="h">{horaDe(a.creado_en)}</span>
                      <div><div className="n">{nombreDeProducto(a.producto)}</div><div className="d"><b>{TITULOS_DE_ANOMALIA[a.tipo] ?? a.tipo}.</b> {a.detalle} · {a.usuario ?? t.sinUsuario.largo}</div></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {datos && (pagina > 1 || datos.hay_mas) && (
            <nav className="anv-paginas" aria-label="Páginas">
              <button type="button" className="mv-btn chico" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>{t.masNuevas.largo}</button>
              <span className="mv-detalle">{t.pagina.largo} {pagina}</span>
              <button type="button" className="mv-btn chico" disabled={!datos.hay_mas} onClick={() => setPagina(pagina + 1)}>{t.masViejas.largo}</button>
            </nav>
          )}
        </aside>
      </div>
    </main>
  );
}
