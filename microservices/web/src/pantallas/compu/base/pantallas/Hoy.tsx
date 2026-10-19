import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconoDeMedio } from "../../../IconoDeMedio";
import { TEXTOS } from "../../../textos";
import { MEDIOS, NOMBRE_DE_MEDIO } from "../../../../negocio/ventas/venta";
import { buscarVentas, confirmadas, fueSinConexion, hoyLocal, MOTIVOS_DE_ANULACION, motivoDeAnulacion, SIN_MOTIVO, useAnularVenta, type VentaDelDia } from "../../../../negocio/ventas/ventas-del-dia";
import { usePuede } from "../../../permisos";
import { AlLadoDeLasPestanas } from "../../../AlLadoDeLasPestanas";
import { nombreDelDia, useResumenDelDia, type Comparacion } from "../../../../negocio/ventas/resumen-del-dia";
import { useTeclasGlobales } from "../../../../plataforma/teclado/teclas";
import { irA } from "../rutas";
import { Aviso, Boton, Hoja, Icono, Pagina, Toast, Vacio, hora, numero, pesosCortos } from "../ui";
import "../estilos/hoy.css";
import "../estilos/ventas-de-hoy.css";

const t = TEXTOS.hoy;
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// «Ventas de hoy» en la computadora (specs/017; decisiones 120 y 122, maqueta
// specs/017-ventas-de-hoy/maquetas/compu-ventas-de-hoy-elegida.png): la v4 del director de arte.
// Arriba el día, el total, la comparación, los tres números y lo vendido por hora, apilado por medio;
// debajo, cuatro cajones, uno por medio de pago. Una venta se abre con un clic o Enter y se anula
// desde ahí (A). Teclado (decisión 121): ← → cambian de cajón, ↑ ↓ de venta, Enter la abre, A la
// anula, Ctrl+K busca y F cambia la fecha.
const CAJONES = MEDIOS;
export function Hoy() {
  const puedeEsto = usePuede();
  const [dia, setDia] = useState<string | null>(null);
  const r = useResumenDelDia(dia);
  const [col, setCol] = useState(0);
  const [fila, setFila] = useState(0);
  const [abierta, setAbierta] = useState<VentaDelDia | null>(null);
  const [porAnular, setPorAnular] = useState<VentaDelDia | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [texto, setTexto] = useState("");
  const calendario = useRef<HTMLInputElement>(null);
  const cajones = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const todas = r.ventas ?? [];
  const halladas = buscando ? buscarVentas(todas, texto, null) : todas;
  const deCajon = (m: string) => halladas.filter((v) => v.medio_pago === m);
  // Las de hoy, con «Anular ventas del día»; las de otro día, solo con «de cualquier día».
  const anula = r.esHoy ? puedeEsto("ventas.anular", "ventas.anular_cualquiera") : puedeEsto("ventas.anular_cualquiera");
  useEffect(() => { setCol(0); setFila(0); }, [r.dia, texto]);
  const elegida = (): VentaDelDia | null => { const vs = deCajon(CAJONES[col]!); return vs[Math.min(fila, vs.length - 1)] ?? null; };
  const abrirCalendario = () => { const c = calendario.current; if (!c) return; try { c.showPicker(); } catch { c.focus(); c.click(); } };
  const buscar = (si: boolean) => { setBuscando(si); if (!si) setTexto(""); else setTimeout(() => campo.current?.focus(), 0); };
  const enfocarElegida = () => setTimeout(() => cajones.current?.querySelector<HTMLButtonElement>("[data-elegida='si']")?.focus(), 0);

  // ← → ↑ ↓ con el foco en los cajones; F, Ctrl+K y A desde cualquier lado de la pantalla.
  function teclasDeLosCajones(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault(); e.stopPropagation();
      const c = (col + (e.key === "ArrowRight" ? 1 : CAJONES.length - 1)) % CAJONES.length;
      setCol(c); setFila((f) => Math.min(f, Math.max(0, deCajon(CAJONES[c]!).length - 1))); enfocarElegida();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); e.stopPropagation();
      const n = deCajon(CAJONES[col]!).length;
      setFila((f) => Math.max(0, Math.min(n - 1, f + (e.key === "ArrowDown" ? 1 : -1)))); enfocarElegida();
    }
  }
  const teclas = useCallback((e: KeyboardEvent) => {
    if (abierta || porAnular) return;
    if (e.ctrlKey && (e.key === "k" || e.key === "K")) { e.preventDefault(); buscar(true); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "f" || e.key === "F") { e.preventDefault(); abrirCalendario(); }
    else if ((e.key === "a" || e.key === "A") && anula) { const v = elegida(); if (v && v.estado !== "anulada") { e.preventDefault(); setPorAnular(v); } }
    else if (e.key === "ArrowDown" && !cajones.current?.contains(document.activeElement)) { e.preventDefault(); enfocarElegida(); }
  }, [abierta, porAnular, anula, col, fila, halladas]); // eslint-disable-line react-hooks/exhaustive-deps
  useTeclasGlobales(teclas);

  const error = !r.resumen && r.error && (fueSinConexion(r.error) ? (r.esHoy ? t.sinConexionHoy.largo : t.sinConexionOtroDia.largo) : r.error.message);
  const sumaHallada = confirmadas(halladas).reduce((s, v) => s + Number(v.total), 0);
  return (
    <Pagina titulo={r.esHoy ? t.tituloHoy.largo : `${t.tituloDia.largo} ${nombreDelDia(r.dia)}`} testId="ventas-de-hoy" className="vhc-pagina"
      acciones={<AlLadoDeLasPestanas><div className="fila">
        <Boton icono="buscar" onClick={() => buscar(true)} aria-keyshortcuts="Control+K" data-testid="abrir-buscar">Buscar una venta <kbd className="tecla">Ctrl K</kbd></Boton>
        <span className="hoy-fecha-boton">
          <Boton icono="calendario" onClick={abrirCalendario} aria-keyshortcuts="F" data-testid="cambiar-fecha">{t.cambiarFecha.largo} <kbd className="tecla">F</kbd></Boton>
          <input ref={calendario} type="date" className="hoy-calendario" value={r.dia} max={hoyLocal()} aria-label={t.cambiarFecha.largo} tabIndex={-1}
            onChange={(e) => { const v = e.target.value; if (v && v <= hoyLocal()) setDia(v === hoyLocal() ? null : v); }} data-testid="dia" />
        </span>
      </div></AlLadoDeLasPestanas>}>
      <Aviso tipo="error">{error}</Aviso>
      {!r.resumen && !error && <div className="esqueleto ventas-esqueleto" aria-busy="true" aria-label={t.buscando.largo} />}
      {r.resumen && <>
        {buscando ? (
          <div className="vhc-buscar">
            <label className="vhc-buscar-caja"><Icono nombre="buscar" tam={20} />
              <input ref={campo} type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={t.buscarVenta.largo} aria-label="Buscar una venta" data-testid="buscar-venta"
                onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); if (texto) setTexto(""); else buscar(false); } else if (e.key === "ArrowDown") { e.preventDefault(); enfocarElegida(); } }} />
            </label>
            <span className="detalle" data-testid="cuantas-halladas">{texto.trim() ? `${halladas.length} de ${todas.length} ventas · suman ${pesosCortos(sumaHallada)}` : t.queSeBusca.largo}</span>
            <Boton onClick={() => buscar(false)} data-testid="salir-de-buscar">Listo <kbd className="tecla">Esc</kbd></Boton>
          </div>
        ) : (
          <section className="vhc-franja" data-testid="resumen-hoy">
            <div>
              <div className="vhc-dia">
                <b data-testid="dia-que-se-mira">{r.esHoy ? `${t.hoy.largo}, ${nombreDelDia(r.dia)}` : mayuscula(nombreDelDia(r.dia))}</b>
                {r.esHoy ? <small>{t.hasta.largo} {hora(new Date().toISOString())}</small>
                  : <button type="button" className="enlace" onClick={() => setDia(null)} data-testid="volver-a-hoy">{t.volverAHoy.largo}</button>}
              </div>
              <span className="vhc-monto importe" data-testid="total-de-hoy">{pesosCortos(r.resumen.total)}</span>
              <LaComparacion comparacion={r.comparacion} esHoy={r.esHoy} diaAnterior={r.diaAnterior} />
              <div className="vhc-numeros" data-testid="numeros">
                <span><b data-testid="cuantas-ventas">{r.resumen.ventas}</b> {t.ventas.largo}</span>
                <span><b data-testid="cuantos-productos">{r.resumen.productos}</b> {t.productos.largo}</span>
                <span><b data-testid="ticket">{r.resumen.ticket === null ? "—" : pesosCortos(r.resumen.ticket)}</b> {t.ticket.largo}</span>
              </div>
            </div>
            <BarrasPorMedio ventas={todas} horas={r.barras.map((b) => b.hora)} />
          </section>
        )}
        <p className="hoy-teclas detalle">
          <span><kbd className="tecla">←</kbd><kbd className="tecla">→</kbd> cajón</span><span><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd> {t.teclaElegir.largo}</span>
          <span><kbd className="tecla">Enter</kbd> la abre</span>{anula && <span><kbd className="tecla">A</kbd> la anula</span>}
        </p>
        {todas.length === 0 ? (
          <div data-testid="sin-ventas"><Vacio icono="ventas" titulo={r.esHoy ? t.sinVentasHoy.largo : t.sinVentasDia.largo}
            accion={r.esHoy ? <Boton variante="principal" icono="vender" onClick={() => irA("vender")}>{t.irAVender.largo}</Boton> : undefined} /></div>
        ) : (
          <div className="vhc-cajones" ref={cajones} onKeyDown={teclasDeLosCajones} data-flechas-propias data-testid="ventas-de-hoy-lista">
            {CAJONES.map((m, c) => {
              const vs = deCajon(m);
              const conf = confirmadas(vs);
              return (
                <section key={m} className={`vhc-cajon medio-${m}`} aria-label={NOMBRE_DE_MEDIO[m]} data-testid={`cajon-${m}`}>
                  <header className="vhc-cajon-cab">
                    <IconoDeMedio medio={m} tam={18} conFondo />
                    <span><b>{NOMBRE_DE_MEDIO[m]}</b><small>{conf.length} {conf.length === 1 ? t.venta.largo : t.ventas.largo}{m === "cuenta_corriente" ? " · a cobrar" : ""}</small></span>
                    <strong className="importe">{pesosCortos(conf.reduce((s, v) => s + Number(v.total), 0))}</strong>
                  </header>
                  {vs.length === 0 ? <p className="detalle vhc-vacio">{buscando && texto.trim() ? `Nada con «${texto.trim()}»` : "Sin ventas"}</p> : vs.map((v, i) => (
                    <TarjetaDeVenta key={v.id} venta={v} buscado={buscando ? texto : ""} elegida={c === col && i === Math.min(fila, vs.length - 1)}
                      alAbrir={() => { setCol(c); setFila(i); setAbierta(v); }} />
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </>}
      {abierta && <VentaAbierta venta={abierta} anula={anula} esHoy={r.esHoy} alCerrar={() => { setAbierta(null); enfocarElegida(); }} alAnular={() => { setPorAnular(abierta); setAbierta(null); }} />}
      {porAnular && <AnularVenta venta={porAnular} alCerrar={() => { setPorAnular(null); enfocarElegida(); }} alAnular={() => { setPorAnular(null); setMensaje(`Venta de ${pesosCortos(porAnular.total)} anulada. El stock volvió.`); enfocarElegida(); }} />}
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
    </Pagina>
  );
}

const plano = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function Resaltar({ texto, buscado }: { texto: string; buscado: string }): ReactNode {
  const b = plano(buscado.trim());
  const i = b ? plano(texto).indexOf(b) : -1;
  if (i < 0) return texto;
  return <>{texto.slice(0, i)}<mark>{texto.slice(i, i + b.length)}</mark>{texto.slice(i + b.length)}</>;
}

// Una venta en su cajón: el producto (o «3 productos», o el cliente en cuenta corriente), el
// importe, la hora y lo que lleva. La anulada, punteada y tachada.
function TarjetaDeVenta({ venta: v, buscado, elegida, alAbrir }: { venta: VentaDelDia; buscado: string; elegida: boolean; alAbrir: () => void }) {
  const anulada = v.estado === "anulada";
  const coincide = buscado.trim() ? v.items.find((i) => plano(i.descripcion).includes(plano(buscado.trim()))) : undefined;
  const una = coincide ?? (v.items.length === 1 ? v.items[0]! : null);
  const titulo = v.cliente && !coincide ? <Resaltar texto={v.cliente} buscado={buscado} /> : una ? <>{numero(Number(una.cantidad))} × <Resaltar texto={una.descripcion} buscado={buscado} />{v.items.length > 1 ? ` y ${v.items.length - 1} más` : ""}</> : `${v.items.length} ${t.productos.largo}`;
  return (
    <button type="button" className={`vhc-venta ${anulada ? "anulada" : ""}`} tabIndex={elegida ? 0 : -1} data-elegida={elegida ? "si" : "no"} onClick={alAbrir} data-testid="venta-dia">
      <span className="q">{titulo}</span>
      <span className="v importe">{pesosCortos(v.total)}</span>
      <span className="d">{hora(v.fecha)} · {anulada ? <span className="hoy-anulada">{t.anulada.largo}</span> : v.items.map((i) => i.descripcion.split(" ")[0]).join(", ")}</span>
    </button>
  );
}

// La venta abierta: sus productos, el total y «Anular» (A) si se puede.
function VentaAbierta({ venta: v, anula, esHoy, alCerrar, alAnular }: { venta: VentaDelDia; anula: boolean; esHoy: boolean; alCerrar: () => void; alAnular: () => void }) {
  const anulada = v.estado === "anulada";
  return (
    <Hoja titulo={`Venta de las ${hora(v.fecha)}`} alCerrar={alCerrar} testId="venta-abierta"
      alTeclear={(e) => { if (!anulada && anula && (e.key === "a" || e.key === "A") && !e.ctrlKey && !e.altKey) { e.preventDefault(); alAnular(); } }}
      bajoTitulo={<span className="detalle">{NOMBRE_DE_MEDIO[v.medio_pago as keyof typeof NOMBRE_DE_MEDIO] ?? v.medio_pago}{v.cliente ? ` · ${v.cliente}` : ""}{esHoy ? "" : " · otro día"}</span>}
      pie={<><Boton onClick={alCerrar} autoFocus={anulada || !anula}>Cerrar <kbd className="tecla">Esc</kbd></Boton>{!anulada && anula && <Boton variante="peligro" icono="deshacer" onClick={alAnular} autoFocus data-testid="anular">Anular <kbd className="tecla">A</kbd></Boton>}</>}>
      <ul className="vhc-detalle" data-testid="detalle-venta">
        {v.items.map((i, n) => <li key={n}><span>{numero(Number(i.cantidad))} × {i.descripcion}<small>{pesosCortos(i.precio_unitario)} {t.cadaUno.largo}</small></span><b className="importe">{pesosCortos(i.subtotal)}</b></li>)}
      </ul>
      <div className="vhc-detalle-total"><span>Total</span><strong className={`importe ${anulada ? "tachado" : ""}`}>{pesosCortos(v.total)}</strong></div>
      {anulada && <Aviso tipo="alerta">Anulada. El stock volvió; la venta queda a la vista.</Aviso>}
    </Hoja>
  );
}

// Lo vendido por hora, cada barra apilada por medio de pago (de la v4).
function BarrasPorMedio({ ventas, horas }: { ventas: VentaDelDia[]; horas: number[] }) {
  const conf = confirmadas(ventas);
  const por = (h: number) => CAJONES.map((m) => ({ m, total: conf.filter((v) => new Date(v.fecha).getHours() === h && v.medio_pago === m).reduce((s, v) => s + Number(v.total), 0) }));
  const max = Math.max(1, ...horas.map((h) => por(h).reduce((s, x) => s + x.total, 0)));
  return (
    <div className="vhc-pila" data-testid="grafico">
      {horas.map((h) => {
        const partes = por(h); const total = partes.reduce((s, x) => s + x.total, 0);
        return (
          <div key={h} className="vhc-hora" data-testid="barra" aria-label={`${h} h: ${pesosCortos(total)}`} role="img">
            <div className="vhc-columna">{total === 0 ? <i className="vacia" /> : partes.filter((x) => x.total).map((x) => <i key={x.m} className={`medio-${x.m}`} style={{ height: `${(x.total / max) * 100}%` }} />)}</div>
            <span>{h}</span>
          </div>
        );
      })}
    </div>
  );
}

function LaComparacion({ comparacion: c, esHoy, diaAnterior }: { comparacion: Comparacion | null; esHoy: boolean; diaAnterior: string }) {
  if (!c) return null;
  if (c.sinVentas) return <div className="hoy-compara" data-testid="comparacion">{esHoy ? t.ayerSinVentas.largo : t.diaSinVentas.largo}</div>;
  return (
    <div className="hoy-compara" data-testid="comparacion">
      <span className={`hoy-pastilla ${c.porcentaje < 0 ? "baja" : c.porcentaje > 0 ? "sube" : "igual"}`}>{c.porcentaje > 0 ? "+" : ""}{c.porcentaje} %</span>
      <span>{esHoy ? t.vsAyer.largo : `${t.vsDia.largo} ${nombreDelDia(diaAnterior)}`} ({pesosCortos(c.anterior)})</span>
    </div>
  );
}

// Anular no se puede deshacer: es de las pocas acciones que piden confirmar. El motivo, de una
// lista que empieza en «Sin motivo», y un comentario (decisión 110); Ctrl+Enter confirma.
function AnularVenta({ venta, alCerrar, alAnular }: { venta: VentaDelDia; alCerrar: () => void; alAnular: () => void }) {
  const [elegido, setElegido] = useState<string>(SIN_MOTIVO);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { anular: anularVenta, anulando: ocupado } = useAnularVenta();
  async function anular() {
    setError(null);
    try { await anularVenta(venta, motivoDeAnulacion(elegido, comentario)); alAnular(); }
    catch (e) { setError(fueSinConexion(e) ? "Sin conexión: para anular hace falta internet. Probá de nuevo cuando vuelva." : `${(e as Error).message}.`); }
  }
  return (
    <Hoja titulo="¿Anular esta venta?" alCerrar={alCerrar} testId="hoja-anular" alTeclear={(e) => { if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); void anular(); } }}
      pie={<><Boton onClick={alCerrar}>Cancelar <kbd className="tecla">Esc</kbd></Boton><Boton variante="peligro" disabled={ocupado} onClick={anular} data-testid="confirmar-anular">{ocupado ? "Anulando…" : <>Anular · −{pesosCortos(venta.total)} <kbd className="tecla">Ctrl Enter</kbd></>}</Boton></>}>
      <p>La venta de las {hora(venta.fecha)} queda registrada como anulada, sus productos vuelven al stock y no se puede deshacer.</p>
      <form className="campo" onSubmit={(e) => { e.preventDefault(); void anular(); }}>
        <label htmlFor="motivo-anular" className="rotulo">Motivo</label>
        <select id="motivo-anular" className="entrada" autoFocus value={elegido} onChange={(e) => setElegido(e.target.value)} data-testid="motivo-anular">
          {[SIN_MOTIVO, ...MOTIVOS_DE_ANULACION].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <label htmlFor="comentario-anular" className="rotulo">Comentario (opcional)</label>
        <input id="comentario-anular" className="entrada" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej.: la mecha vino fallada" autoComplete="off" data-testid="comentario-anular" />
      </form>
      <Aviso tipo="error">{error}</Aviso>
    </Hoja>
  );
}
