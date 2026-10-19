import { AvisoError, Hoja, Icono } from "../componentes/base";
import { useRef, useState, type ReactNode } from "react";
import { IconoDeMedio } from "../../IconoDeMedio";
import { MEDIOS as MEDIOS_DE_TEXTOS, TEXTOS } from "../../textos";
import { nombreDelDia, useResumenDelDia, type Comparacion } from "../../../negocio/ventas/resumen-del-dia";
import "./hoy.css";
import { pesosCortos } from "../../../formato";
import { urlDeFoto } from "../../../api";
const numero = (n: number) => n.toLocaleString("es-AR");
import { MEDIOS, NOMBRE_DE_MEDIO } from "../../../negocio/ventas/venta";
import { buscarVentas, confirmadas, fueSinConexion, hoyLocal, MOTIVOS_DE_ANULACION, motivoDeAnulacion, plano, SIN_MOTIVO, useAnularVenta, type VentaDelDia } from "../../../negocio/ventas/ventas-del-dia";

// «Ventas de hoy» en el celular (specs/017; decisión 120, maqueta
// specs/003-ventas/maquetas/celular-ventas-de-hoy-v2.png): el día y «Cambiar fecha»; el resumen en
// una tarjeta clara con el total, la comparación, lo vendido por hora y los cuatro medios; los
// tres números; y cada venta en un renglón corto que abre su hoja, desde donde se anula. El
// buscador encuentra una venta por un producto, el importe o el cliente.

const MEDIOS_CORTOS = Object.fromEntries(MEDIOS_DE_TEXTOS.map((m) => [m.valor, m.corto])) as Record<string, string>;
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
const cantidad = (n: string) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 3 });
const subtotal = (i: VentaDelDia["items"][number]) => i.subtotal ?? Number(i.cantidad) * Number(i.precio_unitario);

export function VentasDeHoy({ anulaHoy = false, anulaCualquierDia = false }: { anulaHoy?: boolean; anulaCualquierDia?: boolean }) {
  const [dia, setDia] = useState<string | null>(null);
  const r = useResumenDelDia(dia);
  const t = TEXTOS.hoy;
  const calendario = useRef<HTMLInputElement>(null);
  const [buscando, setBuscando] = useState(false);
  const [texto, setTexto] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const ahora = new Date();
  const abrirCalendario = () => { const c = calendario.current; if (!c) return; try { c.showPicker(); } catch { c.focus(); c.click(); } };
  const todas = r.ventas ?? [];
  const halladas = buscando ? buscarVentas(todas, texto, null) : todas;
  const venta = todas.find((v) => v.id === abierta) ?? null;
  // Anular: las de hoy con «Anular ventas del día»; las de otro día, solo con «de cualquier día».
  const anula = r.esHoy ? anulaHoy : anulaCualquierDia;
  const salirDeBuscar = () => { setBuscando(false); setTexto(""); };
  return (
    <div className="hoy" data-testid="hoy">
      {!buscando && (
        <div className="hoy-fecha">
          <div>
            <b data-testid="dia-que-se-mira">{r.esHoy ? `${t.hoy.corto}, ${nombreDelDia(r.dia)}` : mayuscula(nombreDelDia(r.dia))}</b>
            {r.esHoy ? <small>{t.hasta.corto} {hora(ahora.toISOString())}</small>
              : <button type="button" className="enlace" onClick={() => setDia(null)} data-testid="volver-a-hoy">{t.volverAHoy.corto}</button>}
          </div>
          <button type="button" className="hoy-boton" onClick={abrirCalendario} data-testid="cambiar-fecha"><Icono nombre="calendario" tam={18} />{t.cambiarFecha.corto}</button>
          <input ref={calendario} type="date" className="hoy-calendario" value={r.dia} max={hoyLocal()} aria-label={t.cambiarFecha.corto}
            onChange={(e) => { const v = e.target.value; if (v && v <= hoyLocal()) setDia(v === hoyLocal() ? null : v); }} data-testid="dia" />
        </div>
      )}
      {!r.resumen ? (
        r.error && fueSinConexion(r.error) ? <div className="aviso-suave" data-testid="sin-conexion">{r.esHoy ? t.sinConexionHoy.corto : t.sinConexionOtroDia.corto}</div> : r.error ? <div className="aviso-suave">{(r.error as Error).message}</div> : <div className="aviso-suave" aria-busy="true">{t.buscando.corto}…</div>
      ) : <>
        {!buscando && <>
          <section className="tarjeta hoy-total" data-testid="resumen-hoy">
            <small>{t.totalDeVentas.corto}</small>
            <span className="hoy-monto importe" data-testid="total-de-hoy">{pesosCortos(r.resumen.total)}</span>
            <ComparacionDelDia comparacion={r.comparacion} esHoy={r.esHoy} diaAnterior={r.diaAnterior} />
            <Barras barras={r.barras} />
            <ul className="hoy-medios">
              {MEDIOS.map((m) => (
                <li key={m} data-testid={`medio-${m}`}>
                  <IconoDeMedio medio={m} tam={18} conFondo />
                  <span><b className="importe">{pesosCortos(r.resumen!.medios[m].total)}</b>
                    <small><span className="hoy-medio-nombre">{MEDIOS_CORTOS[m]}</span> · {r.resumen!.medios[m].cuantas} {r.resumen!.medios[m].cuantas === 1 ? t.venta.corto : t.ventas.corto}</small></span>
                </li>
              ))}
            </ul>
          </section>
          <div className="hoy-numeros" data-testid="numeros">
            <div><b data-testid="cuantas-ventas">{r.resumen.ventas}</b><small>{t.ventas.corto}</small></div>
            <div><b data-testid="cuantos-productos">{r.resumen.productos}</b><small>{t.productos.corto}</small></div>
            <div><b data-testid="ticket">{r.resumen.ticket === null ? "—" : pesosCortos(r.resumen.ticket)}</b><small>{t.ticket.corto}</small></div>
          </div>
        </>}
        {buscando ? (
          <div className="hoy-buscar">
            <div className="hoy-buscar-fila">
              <label className="hoy-buscar-caja"><Icono nombre="buscar" tam={20} />
                <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus placeholder={t.buscarVenta.corto} aria-label={t.buscarVenta.corto}
                  onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); if (texto) setTexto(""); else salirDeBuscar(); } }} data-testid="buscar-venta" />
                {texto && <button type="button" aria-label="Borrar" onClick={() => setTexto("")}><Icono nombre="cerrar" tam={16} grosor={2.6} /></button>}
              </label>
              <button type="button" className="enlace hoy-listo" onClick={salirDeBuscar} data-testid="salir-de-buscar">Listo</button>
            </div>
            <div className="hoy-cuantas" data-testid="cuantas-halladas">
              {texto.trim() ? <><span>{halladas.length} de {todas.length} {todas.length === 1 ? t.venta.corto : t.ventas.corto}</span>{halladas.length > 0 && <span>suman {pesosCortos(confirmadas(halladas).reduce((s, v) => s + Number(v.total), 0))}</span>}</>
                : <span>{t.queSeBusca.corto}</span>}
            </div>
          </div>
        ) : (
          <div className="hoy-titulo-fila">
            <h2 className="hoy-titulo">{t.titulo.corto}</h2>
            {todas.length > 0 && <button type="button" className="hoy-boton chico" onClick={() => setBuscando(true)} data-testid="abrir-buscar"><Icono nombre="buscar" tam={18} />Buscar</button>}
          </div>
        )}
        {buscando && texto.trim() && halladas.length === 0 ? (
          <div className="hoy-sin-resultados" data-testid="sin-resultados">
            <span className="hoy-sin-icono"><Icono nombre="buscar" tam={26} /></span>
            <b>Ninguna venta con «{texto.trim()}»</b>
            <small>{t.probaConOtra.corto}</small>
            <button type="button" className="hoy-boton" onClick={() => setTexto("")}><Icono nombre="cerrar" tam={16} />Borrar la búsqueda</button>
            <button type="button" className="enlace" onClick={salirDeBuscar}>Volver a todas las ventas</button>
          </div>
        ) : (
          <VentasCortas ventas={halladas} buscado={buscando ? texto : ""} alAbrir={(v) => setAbierta(v.id)} sinVentas={r.esHoy ? t.sinVentasHoy.corto : t.sinVentasDia.corto} />
        )}
      </>}
      {venta && <HojaDeLaVenta venta={venta} anula={anula} esHoy={r.esHoy} alCerrar={() => setAbierta(null)} />}
    </div>
  );
}

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function ComparacionDelDia({ comparacion: c, esHoy, diaAnterior }: { comparacion: Comparacion | null; esHoy: boolean; diaAnterior: string }) {
  const t = TEXTOS.hoy;
  if (!c) return null;
  if (c.sinVentas) return <div className="hoy-compara" data-testid="comparacion">{esHoy ? t.ayerSinVentas.corto : t.diaSinVentas.corto}</div>;
  const contra = esHoy ? t.vsAyer.corto : `${t.vsDia.corto} ${nombreDelDia(diaAnterior)}`;
  return (
    <div className="hoy-compara" data-testid="comparacion">
      <span className={`hoy-pastilla ${c.porcentaje < 0 ? "baja" : c.porcentaje > 0 ? "sube" : "igual"}`}>{c.porcentaje !== 0 && <Icono nombre={c.porcentaje < 0 ? "baja" : "sube"} tam={14} grosor={2.6} />}{c.porcentaje > 0 ? "+" : ""}{c.porcentaje} %</span>
      <span>{contra} ({pesosCortos(c.anterior)})</span>
    </div>
  );
}

// Lo vendido por hora; tocar una barra dice su importe.
function Barras({ barras }: { barras: { hora: number; total: number }[] }) {
  const [elegida, setElegida] = useState<number | null>(null);
  if (barras.length === 0) return null;
  const max = Math.max(...barras.map((b) => b.total), 1);
  const b = barras.find((x) => x.hora === elegida);
  return (
    <div className="hoy-grafico" data-testid="grafico">
      <div className="hoy-dato" aria-live="polite">{b ? `${b.hora} h · ${pesosCortos(b.total)}` : ""}</div>
      <div className="hoy-barras">
        {barras.map((x) => (
          <button key={x.hora} type="button" className={`${x.total === 0 ? "vacia" : ""} ${x.hora === elegida ? "elegida" : ""}`} style={{ height: `${Math.max(4, (x.total / max) * 100)}%` }}
            onClick={() => setElegida(x.hora === elegida ? null : x.hora)} aria-label={`${x.hora} h: ${pesosCortos(x.total)}`} data-testid="barra" />
        ))}
      </div>
      <div className="hoy-horas" aria-hidden="true">{barras.map((x) => <span key={x.hora}>{x.hora}</span>)}</div>
    </div>
  );
}

// Lo buscado, resaltado dentro de un texto.
function Resaltar({ texto, buscado }: { texto: string; buscado: string }): ReactNode {
  const b = plano(buscado);
  const i = b ? plano(texto).indexOf(b) : -1;
  if (i < 0) return texto;
  return <>{texto.slice(0, i)}<mark>{texto.slice(i, i + b.length)}</mark>{texto.slice(i + b.length)}</>;
}

// Cada venta, un renglón corto; tocarla abre su hoja. Buscando, el renglón muestra el producto que
// coincide («3 × Mecha… y 1 más»).
function VentasCortas({ ventas, buscado, alAbrir, sinVentas }: { ventas: VentaDelDia[]; buscado: string; alAbrir: (v: VentaDelDia) => void; sinVentas: string }) {
  const t = TEXTOS.hoy;
  if (ventas.length === 0) return <div className="aviso-suave" data-testid="sin-ventas">{sinVentas}</div>;
  return (
    <ul className="hoy-ventas" data-testid="ventas-de-hoy">
      {ventas.map((v) => {
        const anulada = v.estado === "anulada";
        const coincide = buscado.trim() ? v.items.find((i) => plano(i.descripcion).includes(plano(buscado))) : undefined;
        const una = coincide ?? (v.items.length === 1 ? v.items[0]! : null);
        const resto = una && v.items.length > 1 ? ` y ${v.items.length - 1} más` : "";
        return (
          <li key={v.id} className={anulada ? "anulada" : ""} data-testid="venta-dia">
            <button type="button" className="hoy-venta" onClick={() => alAbrir(v)}>
              <IconoDeMedio medio={v.medio_pago} tam={20} conFondo />
              <span className="hoy-venta-texto">
                <b>{una ? <>{numero(Number(una.cantidad))} × <Resaltar texto={una.descripcion} buscado={buscado} />{resto}</> : `${v.items.length} ${t.productos.corto}`}{anulada && <span className="hoy-anulada">{t.anulada.corto}</span>}</b>
                <small>{hora(v.fecha)} · {NOMBRE_DE_MEDIO[v.medio_pago as keyof typeof NOMBRE_DE_MEDIO] ?? v.medio_pago}{v.cliente ? <> · <Resaltar texto={v.cliente} buscado={buscado} /></> : ""}</small>
              </span>
              <strong className="importe">{pesosCortos(v.total)}</strong>
              <Icono nombre="derecha" tam={18} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// La hoja de una venta: la hora, el medio y el cliente, sus productos y «Anular» si se puede.
function HojaDeLaVenta({ venta: v, anula, esHoy, alCerrar }: { venta: VentaDelDia; anula: boolean; esHoy: boolean; alCerrar: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const anulada = v.estado === "anulada";
  return (
    <Hoja titulo={`Venta de las ${hora(v.fecha)}`} alCerrar={alCerrar} testId="hoja-venta">
      <p className="hoy-hoja-detalle"><IconoDeMedio medio={v.medio_pago} tam={18} />{NOMBRE_DE_MEDIO[v.medio_pago] ?? v.medio_pago}{v.cliente ? ` · ${v.cliente}` : ""}{esHoy ? "" : " · otro día"}</p>
      <div className="an-items" data-testid="detalle-venta">
        {v.items.map((i, n) => (
          <div key={n} className="an-item">
            <span className="an-foto">{urlDeFoto(i.foto_url) ? <img src={urlDeFoto(i.foto_url)!} alt="" /> : <Icono nombre="imagen" tam={18} />}</span>
            <span><b>{cantidad(i.cantidad)} × {i.descripcion}</b><small>{pesosCortos(i.precio_unitario)} c/u</small></span>
            <span className="an-subtotal">{pesosCortos(subtotal(i))}</span>
          </div>
        ))}
      </div>
      <div className="hoy-hoja-total"><span>Total</span><b className="importe" style={{ textDecoration: anulada ? "line-through" : undefined }}>{pesosCortos(v.total)}</b></div>
      {anulada ? <div className="hoy-hoja-anulada"><Icono nombre="prohibido" tam={18} />Anulada. El stock volvió; la venta queda a la vista.</div>
        : anula && <button type="button" className="boton hoy-anular" onClick={() => setConfirmando(true)} data-testid="anular"><Icono nombre="prohibido" tam={20} />Anular</button>}
      <button type="button" className="boton tinta" onClick={alCerrar}>Listo</button>
      {confirmando && <ConfirmarAnulacion venta={v} alCerrar={() => setConfirmando(false)} alAnular={() => { setConfirmando(false); alCerrar(); }} />}
    </Hoja>
  );
}

// Confirmar la anulación: el motivo, de una lista que empieza en «Sin motivo», y un comentario
// opcional (decisión 110); el botón dice cuánto se descuenta.
function ConfirmarAnulacion({ venta: v, alCerrar, alAnular }: { venta: VentaDelDia; alCerrar: () => void; alAnular: () => void }) {
  const [elegido, setElegido] = useState<string>(SIN_MOTIVO);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { anular, anulando } = useAnularVenta();
  async function confirmar() {
    setError(null);
    try { await anular(v, motivoDeAnulacion(elegido, comentario)); alAnular(); }
    catch (e) { setError(fueSinConexion(e) ? "Sin conexión: para anular hace falta internet. Probá de nuevo cuando vuelva." : `${(e as Error).message}.`); }
  }
  return (
    <Hoja titulo="¿Anular esta venta?" alCerrar={alCerrar} testId="hoja-anular">
      <p className="hoy-hoja-detalle">{hora(v.fecha)} · {NOMBRE_DE_MEDIO[v.medio_pago] ?? v.medio_pago} · {pesosCortos(v.total)}. Queda registrada como anulada, los productos vuelven al stock y no se puede deshacer.</p>
      <label className="an-campo"><span>Por qué</span>
        <span className="an-select">
          <select value={elegido} onChange={(e) => setElegido(e.target.value)} data-testid="motivo-anular">
            {[SIN_MOTIVO, ...MOTIVOS_DE_ANULACION].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <Icono nombre="abajo" tam={20} />
        </span>
      </label>
      <textarea className="an-comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Agregá un comentario (opcional)" aria-label="Comentario" data-testid="comentario-anular" />
      <AvisoError texto={error} />
      <div className="an-botones">
        <button type="button" onClick={alCerrar}>Cancelar</button>
        <button type="button" className="fuerte" disabled={anulando} onClick={() => void confirmar()} data-testid="confirmar-anular"><Icono nombre="prohibido" tam={20} />{anulando ? "Anulando…" : `Anular · −${pesosCortos(v.total)}`}</button>
      </div>
    </Hoja>
  );
}
