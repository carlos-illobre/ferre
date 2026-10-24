import { useEffect, useState } from "react";
import { irA } from "../../rutas";
import { urlApi } from "../../api";
import { esAmbienteDePrueba } from "../../ambiente";
import { fecha, pesosCortos } from "../../formato";
import { useSesion } from "../../sesion";
import { MEDIOS } from "../../negocio/ventas/venta";
import { useConsultas, useVentasDelDia } from "../../negocio/ventas/ventas-del-dia";
import { usePuede } from "../permisos";
import { SECCIONES_DE_NEGOCIO, type SeccionDeNegocio } from "../pestanas-de-negocio";
import { NOMBRES } from "../textos";
import { DineroInvertido } from "../DineroInvertido";
import { ComprasRecientes } from "./ComprasRecientes";
import { EstadoDeConexion } from "./componentes/EstadoDeConexion";
import { Hoja, Pasos } from "./componentes/base";
import { IconoN, type IconoDeNegocio } from "../iconos-de-negocio";
import { TEXTOS } from "../textos";
import { agruparNoLlevados, compararConElAnterior, pasosDeLoVendido, type Comparado } from "../../negocio/ventas/tablero";
import { diaAnterior, nombreDelDia, porHora, resumenDelDia } from "../../negocio/ventas/resumen-del-dia";
import { hoyLocal, type Consulta } from "../../negocio/ventas/ventas-del-dia";
import "./resumen.css";

// Más → Cómo va el negocio (decisión 95): las mismas tres secciones que en la computadora, cada
// una con su permiso. La dirección de cada sección en el celular.
export const SUB_DE_SECCION: Record<SeccionDeNegocio, string> = { ventas: "negocio", compras: "gastos", inventario: "invertido" };
const esDeHoy = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const ICONO_DE_SECCION: Record<SeccionDeNegocio, IconoDeNegocio> = { ventas: "chart-column", compras: "truck", inventario: "boxes" };
const diaCorto = (dia: string) => { const n = nombreDelDia(dia); return n.charAt(0).toUpperCase() + n.slice(1, 3) + n.slice(n.indexOf(" ")); };

// Como la v2 («Tablero», decisión 148): las secciones como cuatro botones con ícono (Resultado
// apagado hasta que exista), Hoy · Semana · Mes con el día que compara, «Vendido hoy» grande con
// su comparación y las horas en barras, y cuatro números en grilla. Lo que el sistema todavía no
// sabe queda en su lugar con «—» (021, E02).
export function ComoVaElNegocio({ seccion }: { seccion: SeccionDeNegocio }) {
  const puedeEsto = usePuede();
  const visibles = SECCIONES_DE_NEGOCIO.filter((s) => puedeEsto(...s.pide));
  const actual = SECCIONES_DE_NEGOCIO.find((s) => s.valor === seccion)!;
  return (
    <main className="contenido rc" data-testid={`negocio-${seccion}`}>
      <div className="encabezado">
        <h1 className="titulo">{NOMBRES.comoVaElNegocio}</h1>
        <p className="solo-lectores" data-testid="bajada-de-pestana">{actual.bajada.corto}</p>
      </div>
      {visibles.length > 1 && (
        <nav className="rc-secciones" aria-label="Secciones">
          {visibles.map((s) => (
            <button key={s.valor} type="button" className={`rc-sec ${s.valor === seccion ? "elegida" : ""}`} aria-current={s.valor === seccion ? "page" : undefined} onClick={() => irA(`mas/${SUB_DE_SECCION[s.valor]}`)} data-testid={`seccion-${s.valor}`}>
              <IconoN nombre={ICONO_DE_SECCION[s.valor]} tam={22} />{s.nombre}
            </button>
          ))}
          <button type="button" className="rc-sec" disabled title={TEXTOS.tablero.sinResultado.corto}><IconoN nombre="scale" tam={22} />{TEXTOS.tablero.resultado.corto}</button>
        </nav>
      )}
      {seccion === "ventas" ? <Ventas /> : seccion === "compras" ? <Compras /> : <DineroInvertido />}
      <QuienYDesdeDonde />
    </main>
  );
}

function Ventas() {
  const hoy = useVentasDelDia().datos;
  const ayer = useVentasDelDia(diaAnterior(hoyLocal())).datos;
  const consultas = useConsultas().datos;
  const [explicando, setExplicando] = useState(false);
  const ahora = new Date();
  const r = hoy ? resumenDelDia(hoy.ventas) : null;
  const comp = hoy && ayer ? compararConElAnterior(hoy.ventas, ayer.ventas, ahora.getHours() * 60 + ahora.getMinutes()) : null;
  const deHoy = consultas?.filter((c) => esDeHoy(c.fecha)) ?? [];
  const horas = hoy ? porHora(hoy.ventas, ahora.getHours()) : [];
  const porH = new Map(horas.map((b) => [b.hora, b.total]));
  const desde = Math.min(8, ...horas.filter((b) => b.total > 0).map((b) => b.hora)), hasta = Math.max(19, ahora.getHours());
  const columnas = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  const max = Math.max(1, ...columnas.map((h) => porH.get(h) ?? 0));
  return (
    <>
      <div className="rc-periodo">
        <div className="rc-segmentos" role="group" aria-label="Período">
          <button type="button" className="elegido" aria-pressed="true">{TEXTOS.hoy.hoy.corto}</button>
          <button type="button" disabled title={TEXTOS.tablero.sinPeriodo.corto}>Semana</button>
          <button type="button" disabled title={TEXTOS.tablero.sinPeriodo.corto}>Mes</button>
        </div>
        <div className="rc-fecha"><b>{diaCorto(hoyLocal())}</b><br />contra {diaCorto(diaAnterior(hoyLocal())).toLowerCase()}</div>
      </div>

      <div className="rc-tarjeta rc-heroe" data-testid="numero-vendido">
        <div className="rc-et"><span className="rc-etiqueta">{TEXTOS.tablero.vendido.corto}</span>
          {hoy && <button type="button" className="rc-info" aria-label="Vendido hoy. Ver de dónde sale" onClick={() => setExplicando(true)} data-testid="explicacion"><IconoN nombre="info" tam={18} /></button>}
        </div>
        <div className="rc-total">{r ? <Pesos valor={r.total} /> : "—"}</div>
        <div className="rc-comp">{r ? <Comparacion c={comp?.vendido ?? null} pesos actual={r.total} /> : <span className="rc-gris">Sin conexión: se ve cuando vuelva internet</span>}</div>
        <div className="rc-horas" aria-hidden="true">{columnas.map((h) => <span key={h} className={`${(porH.get(h) ?? 0) === 0 ? "c" : ""} ${h === ahora.getHours() ? "ahora" : ""}`} style={{ height: `${Math.max(3, ((porH.get(h) ?? 0) / max) * 40)}px` }} />)}</div>
        <div className="rc-horas-lb" aria-hidden="true"><span>{desde} h</span><span>{Math.round((desde + hasta) / 2)} h</span><span>{hasta} h</span></div>
      </div>
      {explicando && hoy && (
        <Hoja titulo="De dónde sale lo vendido hoy" alCerrar={() => setExplicando(false)} testId="hoja-explicacion">
          <Pasos pasos={pasosDeLoVendido(hoy)} />
          <button type="button" className="boton tinta" onClick={() => setExplicando(false)}>Listo</button>
        </Hoja>
      )}

      <div className="rc-grilla">
        <div className="rc-tarjeta rc-chico" data-testid="numero-ganancia"><span className="rc-etiqueta">{TEXTOS.tablero.ganancia.corto}</span><span className="rc-va rc-gris">—</span><span className="rc-d gris">{TEXTOS.tablero.sinGanancia.corto}</span></div>
        <div className="rc-tarjeta rc-chico" data-testid="numero-ventas"><span className="rc-etiqueta">{TEXTOS.tablero.ventas.corto}</span><span className="rc-va">{r ? r.ventas.toLocaleString("es-AR") : "—"}</span><span className="rc-d-lugar">{r && <Diferencia c={comp?.ventas ?? null} actual={r.ventas} />}</span></div>
        <div className="rc-tarjeta rc-chico" data-testid="numero-ticket"><span className="rc-etiqueta">{TEXTOS.tablero.ticket.corto}</span><span className="rc-va">{r?.ticket ? <Pesos valor={r.ticket} /> : "—"}</span><span className="rc-d-lugar">{r?.ticket ? <Diferencia c={comp?.ticket ?? null} actual={r.ticket} pesos /> : <span className="rc-d gris">Sin ventas todavía</span>}</span></div>
        <div className="rc-tarjeta rc-chico" data-testid="numero-caja"><span className="rc-etiqueta">{TEXTOS.tablero.caja.corto}</span><span className="rc-va rc-gris">—</span><span className="rc-d gris">{TEXTOS.tablero.sinCaja.corto}</span></div>
      </div>

      {hoy && r ? (
        <div className="rc-tarjeta rc-medios" data-testid="resumen-hoy">
          <div className="rc-medios-cab"><span className="rc-renglon">{TEXTOS.tablero.comoPagaron.corto}</span><span className="rc-detalle">{r.ventas} {r.ventas === 1 ? "venta" : "ventas"}</span></div>
          <div className="rc-stack" aria-hidden="true">{r.total > 0 ? MEDIOS.map((m) => r.medios[m].total > 0 && <b key={m} className={`medio-${m}`} style={{ flex: r.medios[m].total }} />) : <b className="vacio" />}</div>
          <div className="rc-ml">
            {MEDIOS.map((m) => <span key={m} className={`medio-${m}`} data-testid={`medio-${m}`}><i />{NOMBRE_CORTO[m]}<b>{pesosCortos(r.medios[m].total)}</b></span>)}
          </div>
        </div>
      ) : <div className="aviso-suave">Sin conexión: las ventas de hoy se ven cuando vuelva internet.</div>}

      <div className="rc-tarjeta rc-fila" data-testid="lo-mas-vendido"><span className="rc-renglon">{TEXTOS.tablero.loMasVendido.corto}</span><span className="rc-detalle rc-der">— {TEXTOS.tablero.sinLoMasVendido.corto}</span></div>

      <NoLlevaron consultas={consultas} deHoy={deHoy.length} />
    </>
  );
}

const NOMBRE_CORTO: Record<(typeof MEDIOS)[number], string> = { efectivo: "Efectivo", mercado_pago: "M. Pago", tarjeta: "Tarjeta", cuenta_corriente: "Cta. cte." };

// El «$» chico de la v2, delante del importe.
function Pesos({ valor }: { valor: number }) {
  const texto = pesosCortos(Math.abs(valor));
  return <span aria-label={`${valor < 0 ? "−" : ""}${texto}`}>{valor < 0 ? "−" : ""}<span className="rc-peso" aria-hidden="true">$</span><span aria-hidden="true">{texto.slice(1)}</span></span>;
}

// La comparación de «Vendido hoy»: la pastilla con el porcentaje y la diferencia con ayer a esta hora.
function Comparacion({ c, actual, pesos }: { c: Comparado | null; actual: number; pesos?: boolean }) {
  if (!c) return <span className="rc-gris">Trayendo lo de ayer…</span>;
  if (c.comparacion.sinVentas) return <span className="rc-gris">{TEXTOS.hoy.ayerSinVentas.corto}</span>;
  const p = c.comparacion.porcentaje;
  const tipo = Math.abs(p) <= 1 ? "igual" : p > 0 ? "sube" : "baja";
  const dif = Math.abs(actual - c.anterior);
  const f = (n: number) => (pesos ? pesosCortos(n) : n.toLocaleString("es-AR"));
  return <><span className={`rc-delta ${tipo}`}>{tipo !== "igual" && <IconoN nombre={p > 0 ? "arrow-up-right" : "arrow-down-right"} tam={16} />}{Math.abs(p)} %</span>{tipo === "igual" ? `igual que ayer` : `${f(dif)} ${p > 0 ? "más" : "menos"} · ayer: ${f(c.anterior)}`}</>;
}

// La línea de abajo de un número chico: «↗ 3 más · antes 20», o «igual que ayer».
function Diferencia({ c, actual, pesos }: { c: Comparado | null; actual: number; pesos?: boolean }) {
  if (!c || c.comparacion.sinVentas) return <span className="rc-d gris">{c ? TEXTOS.hoy.ayerSinVentas.corto : "…"}</span>;
  const p = c.comparacion.porcentaje;
  const f = (n: number) => (pesos ? pesosCortos(n) : n.toLocaleString("es-AR"));
  if (Math.abs(p) <= 1) return <span className="rc-d gris">igual que ayer</span>;
  return <span className={`rc-d ${p > 0 ? "" : "baja"}`}><IconoN nombre={p > 0 ? "arrow-up-right" : "arrow-down-right"} tam={16} />{pesos ? `${Math.abs(p)} % ${p > 0 ? "más" : "menos"}` : `${f(Math.abs(actual - c.anterior))} ${p > 0 ? "más" : "menos"} · antes ${f(c.anterior)}`}</span>;
}

// Lo que preguntaron y no llevaron, agrupado («Disco de corte × 3»); «Ver las N» abre cada consulta.
function NoLlevaron({ consultas, deHoy }: { consultas: Consulta[] | null; deHoy: number }) {
  const [todas, setTodas] = useState(false);
  if (!consultas) return null;
  const grupos = agruparNoLlevados(consultas);
  return (
    <div className="rc-tarjeta rc-no-llevaron" data-testid="consultas">
      <div className="rc-medios-cab"><span className="rc-renglon">{TEXTOS.tablero.noLlevaron.corto}</span><span className={`rc-pastilla ${deHoy ? "urgente" : ""}`}>{deHoy ? `${deHoy} hoy` : "Ninguna hoy"}</span>
        {consultas.length > 3 && <button type="button" className="rc-enlace" aria-expanded={todas} onClick={() => setTodas((t) => !t)}>{todas ? "Ver menos" : `Ver las ${consultas.length}`}</button>}
      </div>
      {consultas.length === 0 && <p className="rc-detalle">Cuando alguien pregunta un precio y no compra, tocá «No llevó» en Vender.</p>}
      {!todas && grupos.slice(0, 3).map((g) => (
        <div key={g.descripcion} className="rc-lrow" data-testid="consulta"><IconoN nombre="package" tam={16} /><span className="rc-lrow-nombre">{g.descripcion}</span><span className="rc-pastilla">× {g.veces}</span></div>
      ))}
      {todas && consultas.map((c) => (
        <div key={c.id} className="rc-lrow con-detalle" data-testid="consulta">
          <IconoN nombre="package" tam={16} />
          <span className="rc-lrow-nombre">{c.descripcion}<small>{esDeHoy(c.fecha) ? hora(c.fecha) : fecha(c.fecha)}{c.motivo ? ` · ${c.motivo}` : ""}</small></span>
          <b>{c.precio_ofrecido ? pesosCortos(c.precio_ofrecido) : "—"}</b>
        </div>
      ))}
    </div>
  );
}

// Compras, como la v2 (decisión 148): los gastos con «Ver los gastos» y las compras recientes con
// «Ver las compras», en una sola pantalla.
function Compras() {
  return <ComprasRecientes />;
}

// Quién entró, la conexión y el servidor: van al pie de cualquier sección.
function QuienYDesdeDonde() {
  const { sesion, salir } = useSesion();
  const usuario = sesion.estado === "con-sesion" ? sesion.usuario : null;
  const [servidor, setServidor] = useState<string | null>(null);
  useEffect(() => {
    fetch(urlApi("/health")).then((r) => r.json() as Promise<{ ok: boolean; db: string }>).then((s) => setServidor(`Servidor ${s.ok ? "ok" : "con problemas"} · base ${s.db}`)).catch(() => setServidor("Sin conexión con el servidor."));
  }, []);
  return (
    <>
      {usuario && (
        <div className="tarjeta usuario-actual">
          <div className="avatar">{usuario.nombre.charAt(0).toUpperCase()}</div>
          <div className="textos">
            <strong data-testid="usuario-negocio">{usuario.nombre}</strong>
            <small>{(usuario.roles ?? []).join(", ") || "sin roles"} · <EstadoDeConexion testId="conexion-negocio" /></small>
          </div>
          <button type="button" className="boton chico solo-celular" style={{ height: 34, fontSize: 13, borderRadius: 10 }} onClick={salir}>Salir</button>
        </div>
      )}
      {esAmbienteDePrueba() && <div className="aviso-suave" data-testid="ambiente-negocio">Ambiente de prueba · {servidor ?? "…"} · versión {import.meta.env.VITE_VERSION ?? "local"}</div>}
      {!esAmbienteDePrueba() && servidor && <small style={{ padding: "0 4px" }} data-testid="estado">{servidor}</small>}
    </>
  );
}
