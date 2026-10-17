import { useRef, useState } from "react";
import { IconoDeMedio } from "../../IconoDeMedio";
import { urlDeFoto } from "../../../api";
import { pesosCortos } from "../../../formato";
import { MEDIOS, NOMBRE_DE_MEDIO } from "../../../negocio/ventas/venta";
import { buscarVentas, fueSinConexion, hoyLocal, MOTIVOS_DE_ANULACION, motivoDeAnulacion, SIN_MOTIVO, useAnularVenta, useVentasDelDia, type VentaDelDia } from "../../../negocio/ventas/ventas-del-dia";
import { AvisoError, Hoja, Icono } from "../componentes/base";

// Pestaña «Anular» de Vender en el celular (003-T005, decisión 110): buscar la venta por un
// producto o el importe, filtrarla por medio de pago y anularla desde una hoja que pide
// confirmar, con un motivo opcional. Las de otro día, solo con «Anular ventas de cualquier día»,
// que es quien ve el botón del día.
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
const cantidad = (n: string) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 3 });
const subtotal = (i: VentaDelDia["items"][number]) => i.subtotal ?? Number(i.cantidad) * Number(i.precio_unitario);
const diaCorto = (dia: string) => { const [a, m, d] = dia.split("-"); return `${d}/${m}/${a}`; };
const productos = (n: number) => `${n} ${n === 1 ? "producto" : "productos"}`;

export function AnularVentas({ cualquierDia }: { cualquierDia: boolean }) {
  const [dia, setDia] = useState(hoyLocal);
  const esHoy = dia === hoyLocal();
  const { datos } = useVentasDelDia(dia);
  const [texto, setTexto] = useState("");
  const [medio, setMedio] = useState<VentaDelDia["medio_pago"] | null>(null);
  const [aAnular, setAAnular] = useState<VentaDelDia | null>(null);
  const calendario = useRef<HTMLInputElement>(null);
  const ventas = datos ? buscarVentas(datos.ventas, texto, medio) : [];
  return (
    <>
      <div className="an-aviso"><Icono nombre="alerta" tam={24} /><span><b>Importante</b><small>La venta anulada queda registrada, sus productos vuelven al stock y no se puede deshacer.</small></span></div>
      <div className="an-fila">
        <label className="an-buscar"><Icono nombre="buscar" tam={22} /><input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Producto o importe" aria-label="Buscar una venta por producto o importe" data-testid="buscar-venta" /></label>
        {cualquierDia && (
          <label className="an-dia">
            <Icono nombre="calendario" tam={20} />{esHoy ? "Hoy" : diaCorto(dia)}
            <input ref={calendario} type="date" value={dia} max={hoyLocal()} onChange={(e) => e.target.value && setDia(e.target.value)} aria-label="Día de las ventas" data-testid="dia" />
          </label>
        )}
      </div>
      <div className="an-medios" role="group" aria-label="Medio de pago">
        <button type="button" className={medio === null ? "si" : ""} aria-pressed={medio === null} onClick={() => setMedio(null)}>Todos</button>
        {MEDIOS.map((m) => <button key={m} type="button" className={medio === m ? "si" : ""} aria-pressed={medio === m} onClick={() => setMedio(m)}><IconoDeMedio medio={m} tam={16} />{NOMBRE_DE_MEDIO[m]}</button>)}
      </div>
      {!datos ? <div className="aviso-suave">Sin conexión: para anular una venta hace falta internet.</div> : (
        <>
          <div className="an-cabeza"><h2 className="seccion">{esHoy ? "Ventas de hoy" : `Ventas del ${diaCorto(dia)}`}</h2><small data-testid="cuantas-ventas">{ventas.length} {ventas.length === 1 ? "venta" : "ventas"}</small></div>
          {datos.ventas.length === 0 ? <div className="aviso-suave">{esHoy ? "Todavía no hay ventas hoy." : "Ese día no hubo ventas."}</div>
            : ventas.length === 0 ? <div className="aviso-suave">Ninguna venta coincide con la búsqueda.</div> : (
              <div className="an-ventas" data-testid="ventas-de-hoy">
                {ventas.map((v) => <Venta key={v.id} v={v} alAnular={() => setAAnular(v)} />)}
              </div>
            )}
        </>
      )}
      {aAnular && <Confirmar venta={aAnular} alCerrar={() => setAAnular(null)} />}
    </>
  );
}

// Una venta: la hora, el total, el medio de pago, el cliente, «Anular» y sus productos.
function Venta({ v, alAnular }: { v: VentaDelDia; alAnular: () => void }) {
  const anulada = v.estado === "anulada";
  return (
    <div className={`an-venta ${anulada ? "anulada" : ""}`} data-testid="venta-dia">
      <div className="an-cab">
        <span className="an-hora"><b>{hora(v.fecha)}</b>{anulada && <span className="an-pastilla">Anulada</span>}</span>
        <strong className="an-total">{pesosCortos(v.total)}</strong>
        <span className="an-medio"><IconoDeMedio medio={v.medio_pago} tam={16} />{NOMBRE_DE_MEDIO[v.medio_pago] ?? v.medio_pago} · {productos(v.items.length)}</span>
        {!anulada && <button type="button" className="an-anular" onClick={alAnular} aria-label={`Anular la venta de ${pesosCortos(v.total)} de las ${hora(v.fecha)}`}><Icono nombre="prohibido" tam={16} />Anular</button>}
      </div>
      {v.cliente && <span className="an-medio"><Icono nombre="persona" tam={16} />{v.cliente}</span>}
      <Productos items={v.items} />
    </div>
  );
}

function Productos({ items, sinFoto = false }: { items: VentaDelDia["items"]; sinFoto?: boolean }) {
  return (
    <div className="an-items">
      {items.map((i, n) => (
        <div key={n} className="an-item">
          {!sinFoto && <span className="an-foto">{urlDeFoto(i.foto_url) ? <img src={urlDeFoto(i.foto_url)!} alt="" /> : <Icono nombre="imagen" tam={18} />}</span>}
          <span><b>{i.descripcion}</b><small>{cantidad(i.cantidad)} × {pesosCortos(i.precio_unitario)}{sinFoto ? "" : " c/u"}</small></span>
          <span className="an-subtotal">{pesosCortos(subtotal(i))}</span>
        </div>
      ))}
    </div>
  );
}

// La hoja de confirmar: la venta, el motivo (de una lista que empieza en «Sin motivo») y un
// comentario opcional (decisión 110).
function Confirmar({ venta: v, alCerrar }: { venta: VentaDelDia; alCerrar: () => void }) {
  const [elegido, setElegido] = useState<string>(SIN_MOTIVO);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { anular, anulando } = useAnularVenta();
  async function confirmar() {
    setError(null);
    try { await anular(v, motivoDeAnulacion(elegido, comentario)); alCerrar(); }
    catch (e) { setError(fueSinConexion(e) ? "Sin conexión: para anular hace falta internet. Probá de nuevo cuando vuelva." : `${(e as Error).message}.`); }
  }
  return (
    <Hoja alCerrar={alCerrar} testId="hoja-anular">
      <div className="an-confirmar">
        <div className="an-aviso"><Icono nombre="alerta" tam={26} /><span><b className="grande">¿Anular esta venta?</b><small>Queda registrada como anulada y no se puede deshacer.</small></span></div>
        <div className="an-resumen">
          <div><span>Fecha y hora</span><b><Icono nombre="calendario" tam={18} />{hora(v.fecha)}</b></div>
          <div><span>Medio de pago</span><b><Icono nombre={v.medio_pago} tam={18} />{NOMBRE_DE_MEDIO[v.medio_pago] ?? v.medio_pago}</b></div>
          {v.cliente && <div className="ancho"><span>Cliente</span><b><Icono nombre="persona" tam={18} />{v.cliente}</b></div>}
          <div className="ancho total"><span>Total</span><b>{pesosCortos(v.total)}</b></div>
        </div>
        <div className="an-productos">
          <div className="an-cabeza"><b>Productos de la venta</b><small>{productos(v.items.length)}</small></div>
          <Productos items={v.items} />
        </div>
        <label className="an-campo"><span>Motivo de la anulación</span>
          <span className="an-select">
            <select value={elegido} onChange={(e) => setElegido(e.target.value)} data-testid="motivo-anular">
              {[SIN_MOTIVO, ...MOTIVOS_DE_ANULACION].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <Icono nombre="abajo" tam={20} />
          </span>
        </label>
        <textarea className="an-comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Agregá un comentario (opcional)" aria-label="Comentario" data-testid="comentario-anular" />
        <div className="an-stock"><Icono nombre="caja" tam={22} />Los productos vuelven al stock solos.</div>
        <AvisoError texto={error} />
        <div className="an-botones">
          <button type="button" onClick={alCerrar}>Cancelar</button>
          <button type="button" className="fuerte" disabled={anulando} onClick={() => void confirmar()} data-testid="confirmar-anular"><Icono nombre="prohibido" tam={20} />{anulando ? "Anulando…" : "Anular venta"}</button>
        </div>
      </div>
    </Hoja>
  );
}
