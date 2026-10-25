import { useState, type ReactNode } from "react";
import { pesosCortos } from "../../../formato";
import { barrasDeHoy, compararConElAnterior, consultasDeHoy, diaAnterior, hoyLocal, MEDIOS, nombreDelDia, pasosDeLoVendido, resumenDelDia, useConsultas, useVentasDelDia, type ComparacionDelTablero, type ResumenDelDia, type VentasDelDia } from "../../../negocio/ventas";
import { Hoja, Pasos } from "../componentes/base";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { Comparacion, Diferencia, Pesos } from "./ComparacionDelCelular";
import { NoLlevaronHoy } from "./NoLlevaronHoy";
import css from "./Resumen.module.css";

const diaCorto = (dia: string) => { const n = nombreDelDia(dia); return n.charAt(0).toUpperCase() + n.slice(1, 3) + n.slice(n.indexOf(" ")); };
const NOMBRE_CORTO: Record<(typeof MEDIOS)[number], string> = { efectivo: "Efectivo", mercado_pago: "M. Pago", tarjeta: "Tarjeta", cuenta_corriente: "Cta. cte." };
type DeHoy = { hoy: VentasDelDia | null; r: ResumenDelDia | null; comp: ComparacionDelTablero | null };

export function VentasDelCelular() {
  const hoy = useVentasDelDia().datos;
  const ayer = useVentasDelDia(diaAnterior(hoyLocal())).datos;
  const consultas = useConsultas().datos;
  const ahora = new Date();
  const r = hoy ? resumenDelDia(hoy.ventas) : null;
  const comp = hoy && ayer ? compararConElAnterior(hoy.ventas, ayer.ventas, ahora.getHours() * 60 + ahora.getMinutes()) : null;
  return (
    <>
      <Periodo />
      <VendidoHoy hoy={hoy} r={r} comp={comp} hora={ahora.getHours()} />
      <NumerosDeHoy hoy={hoy} r={r} comp={comp} />
      {hoy && r ? <ComoPagaronHoy r={r} /> : <div className="aviso-suave">Sin conexión: las ventas de hoy se ven cuando vuelva internet.</div>}
      <div className={`${css.tarjeta} ${css.fila}`} data-testid="lo-mas-vendido"><span className={css.renglon}>{TEXTOS.tablero.loMasVendido.corto}</span><span className={`${css.detalle} ${css.der}`}>— {TEXTOS.tablero.sinLoMasVendido.corto}</span></div>
      <NoLlevaronHoy consultas={consultas} deHoy={consultasDeHoy(consultas)} />
    </>
  );
}

function Periodo() {
  return (
    <div className={css.periodo}>
      <div className={css.segmentos} role="group" aria-label="Período">
        <button type="button" className="elegido" aria-pressed="true">{TEXTOS.hoy.hoy.corto}</button>
        <button type="button" disabled title={TEXTOS.tablero.sinPeriodo.corto}>Semana</button>
        <button type="button" disabled title={TEXTOS.tablero.sinPeriodo.corto}>Mes</button>
      </div>
      <div className={css.fecha}><b>{diaCorto(hoyLocal())}</b><br />contra {diaCorto(diaAnterior(hoyLocal())).toLowerCase()}</div>
    </div>
  );
}

// «Vendido hoy» grande, con su comparación, las horas en barras y «de dónde sale».
function VendidoHoy({ hoy, r, comp, hora }: DeHoy & { hora: number }) {
  const [explicando, setExplicando] = useState(false);
  const g = barrasDeHoy(hoy?.ventas ?? null, hora);
  return (
    <>
      <div className={`${css.tarjeta} ${css.heroe}`} data-testid="numero-vendido">
        <div className={css.et}><span className={css.etiqueta}>{TEXTOS.tablero.vendido.corto}</span>
          {hoy && <button type="button" className={css.info} aria-label="Vendido hoy. Ver de dónde sale" onClick={() => setExplicando(true)} data-testid="explicacion"><Icono nombre="info" tam={18} /></button>}
        </div>
        <TotalDeHoy r={r} comp={comp} />
        <div className={css.horas} aria-hidden="true">{g.barras.map((b) => <span key={b.hora} className={`${b.vacia ? "c" : ""} ${b.ahora ? "ahora" : ""}`} style={{ height: `${b.alto}px` }} />)}</div>
        <div className={css.horasLb} aria-hidden="true"><span>{g.desde} h</span><span>{g.medio} h</span><span>{g.hasta} h</span></div>
      </div>
      {explicando && hoy && (
        <Hoja titulo="De dónde sale lo vendido hoy" alCerrar={() => setExplicando(false)} testId="hoja-explicacion">
          <Pasos pasos={pasosDeLoVendido(hoy)} />
          <button type="button" className="boton tinta" onClick={() => setExplicando(false)}>Listo</button>
        </Hoja>
      )}
    </>
  );
}

function TotalDeHoy({ r, comp }: { r: ResumenDelDia | null; comp: ComparacionDelTablero | null }) {
  if (!r) return <><div className={css.total}>—</div><div className={css.comp}><span className={css.gris}>Sin conexión: se ve cuando vuelva internet</span></div></>;
  return <><div className={css.total}><Pesos valor={r.total} /></div><div className={css.comp}><Comparacion c={comp?.vendido ?? null} pesos actual={r.total} /></div></>;
}

function Numero({ testId, etiqueta, valor, gris, children }: { testId: string; etiqueta: string; valor: ReactNode; gris?: boolean; children: ReactNode }) {
  return <div className={`${css.tarjeta} ${css.chico}`} data-testid={testId}><span className={css.etiqueta}>{etiqueta}</span><span className={gris ? `${css.va} ${css.gris}` : css.va}>{valor}</span>{children}</div>;
}

function CuantasVentas({ r, comp }: Omit<DeHoy, "hoy">) {
  return <Numero testId="numero-ventas" etiqueta={TEXTOS.tablero.ventas.corto} valor={r ? r.ventas.toLocaleString("es-AR") : "—"}><span className={css.dLugar}>{r && <Diferencia c={comp?.ventas ?? null} actual={r.ventas} />}</span></Numero>;
}

function Ticket({ r, comp }: Omit<DeHoy, "hoy">) {
  const ticket = r?.ticket;
  if (!ticket) return <Numero testId="numero-ticket" etiqueta={TEXTOS.tablero.ticket.corto} valor="—"><span className={css.dLugar}><span className={`${css.d} gris`}>Sin ventas todavía</span></span></Numero>;
  return <Numero testId="numero-ticket" etiqueta={TEXTOS.tablero.ticket.corto} valor={<Pesos valor={ticket} />}><span className={css.dLugar}><Diferencia c={comp?.ticket ?? null} actual={ticket} pesos /></span></Numero>;
}

// Los cuatro números chicos: ganancia y caja quedan con «—» hasta que el sistema los sepa.
function NumerosDeHoy({ r, comp }: DeHoy) {
  return (
    <div className={css.grilla}>
      <Numero testId="numero-ganancia" etiqueta={TEXTOS.tablero.ganancia.corto} valor="—" gris><span className={`${css.d} gris`}>{TEXTOS.tablero.sinGanancia.corto}</span></Numero>
      <CuantasVentas r={r} comp={comp} />
      <Ticket r={r} comp={comp} />
      <Numero testId="numero-caja" etiqueta={TEXTOS.tablero.caja.corto} valor="—" gris><span className={`${css.d} gris`}>{TEXTOS.tablero.sinCaja.corto}</span></Numero>
    </div>
  );
}

function ComoPagaronHoy({ r }: { r: ResumenDelDia }) {
  return (
    <div className={`${css.tarjeta} ${css.medios}`} data-testid="resumen-hoy">
      <div className={css.mediosCab}><span className={css.renglon}>{TEXTOS.tablero.comoPagaron.corto}</span><span className={css.detalle}>{r.ventas} {r.ventas === 1 ? "venta" : "ventas"}</span></div>
      <div className={css.stack} aria-hidden="true">{r.total > 0 ? MEDIOS.map((m) => r.medios[m].total > 0 && <b key={m} className={`medio-${m}`} style={{ flex: r.medios[m].total }} />) : <b className="vacio" />}</div>
      <div className={css.ml}>
        {MEDIOS.map((m) => <span key={m} className={`medio-${m}`} data-testid={`medio-${m}`}><i />{NOMBRE_CORTO[m]}<b>{pesosCortos(r.medios[m].total)}</b></span>)}
      </div>
    </div>
  );
}
