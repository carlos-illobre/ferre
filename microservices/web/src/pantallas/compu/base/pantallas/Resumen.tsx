import { IconoDeMedio } from "../../../IconoDeMedio";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NOMBRES, TEXTOS } from "../../../textos";
import { usePuede } from "../../../permisos";
import { AlLadoDeLasPestanas } from "../../../AlLadoDeLasPestanas";
import { urlApi } from "../../../../api";
import { esAmbienteDePrueba } from "../../../../ambiente";
import { fecha, pesos } from "../../../../formato";
import { useSesion } from "../../../../sesion";
import { MEDIOS, NOMBRE_DE_MEDIO as NOMBRE_MEDIO } from "../../../../negocio/ventas/venta";
import type { VentasDelDia as DatosHoy } from "../../../../negocio/ventas/ventas-del-dia";
import { irA } from "../rutas";
import { Aviso, Boton, EstadoDeConexion, Hoja, Pastilla, Pagina, pesosCortos } from "../ui";
import { comoCarga, diaYHora, useEnLinea, type Carga } from "./negocio-comun";
import { useConsultas, useVentasDelDia, type Consulta } from "../../../../negocio/ventas/ventas-del-dia";
import { useGastosDeLaSemana, type Gastos } from "../../../../negocio/compras";
import { SECCIONES_DE_NEGOCIO, type SeccionDeNegocio } from "../../../pestanas-de-negocio";
import { IconoN, type IconoDeNegocio } from "../../../iconos-de-negocio";
import { agruparNoLlevados, compararConElAnterior, pasosDeLoVendido, type Comparado } from "../../../../negocio/ventas/tablero";
import { diaAnterior, nombreDelDia, porHora, resumenDelDia } from "../../../../negocio/ventas/resumen-del-dia";
import { hoyLocal } from "../../../../negocio/ventas/ventas-del-dia";
import "../estilos/negocio.css";
import "../estilos/resumen.css";


const CONSULTAS_A_LA_VISTA = 3;
const plural = (n: number, uno: string, muchos: string) => `${n.toLocaleString("es-AR")} ${n === 1 ? uno : muchos}`;
const esDeHoy = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const RUTA_DE_SECCION: Record<SeccionDeNegocio, string> = { ventas: "resumen", compras: "gastos", inventario: "invertido" };
const ICONO_DE_SECCION: Record<SeccionDeNegocio, IconoDeNegocio> = { ventas: "chart-column", compras: "truck", inventario: "boxes" };
const HORAS = ["8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"];
const horaCorta = (d: Date) => d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

// Cómo va el negocio como la v2 (decisión 148): las secciones como segmentos con ícono, el
// período a la derecha y, en Ventas, cuatro números con su comparación, lo vendido por hora,
// cómo pagaron, lo más vendido, lo que no llevaron y el cierre de caja. Cada sección conserva su
// permiso (decisión 95); lo que el sistema todavía no sabe queda en su lugar con «—» (021, E02).
export function ResumenVentas() {
  const enLinea = useEnLinea();
  const puedeEsto = usePuede();
  const hoy = comoCarga(useVentasDelDia(), "No se pudieron traer las ventas de hoy");
  const ayer = useVentasDelDia(diaAnterior(hoyLocal())).datos;
  const consultas = comoCarga(useConsultas(), "No se pudieron traer las consultas");
  const ahora = new Date();
  const r = hoy.datos ? resumenDelDia(hoy.datos.ventas) : null;
  const comp = hoy.datos && ayer ? compararConElAnterior(hoy.datos.ventas, ayer.ventas, ahora.getHours() * 60 + ahora.getMinutes()) : null;
  const deHoy = consultas.datos?.filter((c) => esDeHoy(c.fecha)) ?? [];
  const espera = textoDeEspera(hoy, enLinea);

  return (
    <SeccionDelNegocio seccion="ventas" testId="resumen" bajada={TEXTOS.negocio.seccionVentas.largo} cargando={hoy.cargando || consultas.cargando} datos={hoy.datos} alActualizar={() => { hoy.recargar(); consultas.recargar(); }}>
      <div className="rv-kpis">
        <Kpi principal icono="banknote" rotulo={TEXTOS.tablero.vendido.largo} testId="indicador-vendido"
          pasos={hoy.datos ? pasosDeLoVendido(hoy.datos) : null} titulo="De dónde sale lo vendido hoy"
          valor={<Numero carga={hoy}>{r && <Pesos valor={r.total} />}</Numero>}
          comp={r ? <Comparacion c={comp?.vendido ?? null} pesos actual={r.total} /> : espera} />
        <Kpi principal icono="trending-up" rotulo={TEXTOS.tablero.ganancia.largo} testId="indicador-ganancia"
          valor={<span className="rv-sin-dato" title={TEXTOS.tablero.sinGanancia.largo}>—</span>}
          comp={<><span className="rv-delta">—</span><span className="rv-comp-texto">{TEXTOS.tablero.sinGanancia.corto}</span></>} />
        <Kpi icono="receipt" rotulo={TEXTOS.tablero.ventas.largo} testId="indicador-ventas"
          valor={<Numero carga={hoy}>{r?.ventas.toLocaleString("es-AR")}</Numero>}
          comp={r ? <Comparacion c={comp?.ventas ?? null} actual={r.ventas} /> : espera} />
        <Kpi icono="shopping-bag" rotulo={TEXTOS.tablero.ticket.largo} testId="indicador-ticket"
          valor={<Numero carga={hoy}>{r && (r.ticket === null ? <span className="rv-sin-dato">—</span> : <Pesos valor={r.ticket} />)}</Numero>}
          comp={r ? (r.ticket === null ? <><span className="rv-delta">—</span>Sin ventas todavía</> : <Comparacion c={comp?.ticket ?? null} pesos actual={r.ticket} />) : espera} />
      </div>

      <div className="rv-fila-c">
        <PorHora ventas={hoy.datos?.ventas ?? null} anteriores={ayer?.ventas ?? null} carga={hoy} />

        <section className="rv-card" data-testid="resumen-hoy" aria-labelledby="resumen-medios">
          <header className="rv-card-cab">
            <h2 id="resumen-medios">{TEXTOS.tablero.comoPagaron.largo}</h2>
            <span className="rv-der">ventas · importe</span>
          </header>
          <ErrorDeBloque carga={hoy} />
          {!hoy.datos && !hoy.error && <Esqueleto renglones={4} />}
          {hoy.datos && r && (
            <>
              <div className="rv-stack" aria-hidden="true">
                {r.total > 0 ? MEDIOS.map((m) => r.medios[m].total > 0 && <b key={m} className={`medio-${m}`} style={{ flex: r.medios[m].total }} />) : <b className="rv-stack-vacio" />}
              </div>
              <ul className="rv-medios">
                {MEDIOS.map((m) => (
                  <li key={m} data-testid={`medio-${m}`}>
                    <IconoDeMedio medio={m} tam={18} conFondo className="rv-medio-icono" />
                    <span className="rv-medio-nombre">{NOMBRE_MEDIO[m]} <span className="rv-medio-cuantas">· {r.medios[m].cuantas}</span></span>
                    <span className="rv-medio-importe"><Pesos valor={r.medios[m].total} /></span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {puedeEsto("ventas.ver") && <button type="button" className="rv-enlace rv-ver-ventas" onClick={() => irA("hoy")} data-testid="ver-ventas">Ver las ventas de hoy <IconoN nombre="chevron-right" tam={16} /></button>}
        </section>
      </div>

      <div className="rv-fila-d">
        <section className="rv-card" aria-labelledby="rv-top" data-testid="lo-mas-vendido">
          <header className="rv-card-cab"><h2 id="rv-top">{TEXTOS.tablero.loMasVendido.largo}</h2><span className="rv-der">por dinero</span></header>
          <p className="rv-vacio-chico"><b>—</b> {TEXTOS.tablero.sinLoMasVendido.largo}</p>
        </section>
        <NoLlevaron consultas={consultas} deHoy={deHoy.length} />
        <section className="rv-card" aria-labelledby="rv-caja" data-testid="cierre-de-caja">
          <header className="rv-card-cab"><h2 id="rv-caja">{TEXTOS.tablero.caja.largo}</h2></header>
          <div className="rv-caja-va">—</div>
          <p className="rv-vacio-chico">{TEXTOS.tablero.sinCaja.largo}</p>
        </section>
      </div>
    </SeccionDelNegocio>
  );
}

// La comparación con ayer hasta la misma hora, como la v2: la pastilla con la flecha y el
// porcentaje (verde si sube, roja si baja, gris si queda igual) y la diferencia con lo de ayer.
function Comparacion({ c, actual, pesos, extra }: { c: Comparado | null; actual: number; pesos?: boolean; extra?: string }) {
  const f = (n: number) => (pesos ? pesosCortos(n) : n.toLocaleString("es-AR"));
  if (!c) return <><span className="rv-delta">—</span><span className="rv-comp-texto">{extra ?? "Trayendo lo de ayer…"}</span></>;
  if (c.comparacion.sinVentas) return <><span className="rv-delta">—</span><span className="rv-comp-texto">{extra ?? TEXTOS.hoy.ayerSinVentas.largo}</span></>;
  const p = c.comparacion.porcentaje;
  const tipo = Math.abs(p) <= 1 ? "igual" : p > 0 ? "sube" : "baja";
  const dif = actual - c.anterior;
  const texto = `${dif >= 0 ? "+" : "−"}${f(Math.abs(dif))} · ayer: ${f(c.anterior)}`;
  return (
    <>
      <span className={`rv-delta ${tipo}`}>{tipo !== "igual" && <IconoN nombre={p > 0 ? "arrow-up-right" : "arrow-down-right"} tam={16} />}{Math.abs(p)} %</span>
      <span className="rv-comp-texto" title={extra ?? texto}>{extra ?? texto}</span>
    </>
  );
}

// Lo vendido por hora, como la v2: la barra de hoy en cada hora, la de ayer a la misma hora como
// una raya punteada atrás, la hora de ahora rayada y la más alta con su importe en un globo.
// Siempre de 8 a 19, y más si hubo ventas antes o después.
function PorHora({ ventas, anteriores, carga }: { ventas: DatosHoy["ventas"] | null; anteriores: DatosHoy["ventas"] | null; carga: Carga<unknown> }) {
  const ahora = new Date().getHours();
  const hoyH = new Map((ventas ? porHora(ventas, ahora) : []).map((b) => [b.hora, b.total]));
  const ayerH = new Map((anteriores ? porHora(anteriores) : []).map((b) => [b.hora, b.total]));
  const todas = [...hoyH.keys(), ...ayerH.keys()].filter((h) => (hoyH.get(h) ?? 0) > 0 || (ayerH.get(h) ?? 0) > 0);
  const desde = Math.min(8, ...todas), hasta = Math.max(19, ...todas);
  const horas = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  const max = Math.max(0, ...horas.map((h) => Math.max(hoyH.get(h) ?? 0, ayerH.get(h) ?? 0)));
  const paso = escalon(max);
  const tope = paso * 3;
  const pico = horas.reduce<number | null>((m, h) => ((hoyH.get(h) ?? 0) > 0 && (m === null || (hoyH.get(h) ?? 0) > (hoyH.get(m) ?? 0)) ? h : m), null);
  const alto = (v: number) => `${tope ? (v / tope) * 100 : 0}%`;
  return (
    <section className="rv-card" aria-labelledby="rv-por-hora" data-testid="vendido-por-hora">
      <header className="rv-card-cab">
        <h2 id="rv-por-hora">{TEXTOS.tablero.porHora.largo}</h2>
        <span className="rv-leyendas"><span className="rv-ley"><i className="rv-ley-hoy" />{TEXTOS.hoy.hoy.largo}</span><span className="rv-ley"><i className="rv-ley-antes" />{TEXTOS.hoy.ayer.largo}</span></span>
      </header>
      <ErrorDeBloque carga={carga} />
      <div className="rv-grafico">
        <div className="rv-eje" aria-hidden="true">{[3, 2, 1, 0].map((i) => <span key={i}>{i === 0 ? "0" : miles(paso * i)}</span>)}</div>
        <div className="rv-area">
          <div className="rv-lineas" aria-hidden="true"><span /><span /><span /><span /></div>
          <div className="rv-barras" style={{ gridTemplateColumns: `repeat(${horas.length}, 1fr)` }}>
            {horas.map((h) => {
              const v = hoyH.get(h) ?? 0, antes = ayerH.get(h) ?? 0;
              return (
                <div key={h} className={`rv-col ${h === ahora && ventas ? "ahora" : ""}`} data-testid="barra" role="img" aria-label={`${h} h: ${pesosCortos(v)}${antes ? `; ayer ${pesosCortos(antes)}` : ""}`}>
                  {antes > 0 && <span className="rv-antes" style={{ height: alto(antes) }} />}
                  {v > 0 && <span className="rv-hoy" style={{ height: alto(v) }}>{h === pico && <span className="rv-globo">{pesosCortos(v)}</span>}</span>}
                  <span className="rv-h">{h}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// El escalón del eje: redondo y de modo que tres escalones cubran el máximo (60 mil para 63.000).
function escalon(max: number): number {
  if (max <= 0) return 10_000;
  const crudo = max / 3;
  const base = 10 ** Math.floor(Math.log10(crudo));
  return [1, 2, 2.5, 5, 10].map((m) => m * base).find((v) => v * 3 >= max) ?? base * 10;
}
const miles = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M` : n >= 1000 ? `${(n / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} mil` : n.toLocaleString("es-AR"));

// El «$» chico de la v2, delante del importe.
function Pesos({ valor }: { valor: number }) {
  const texto = pesosCortos(Math.abs(valor));
  return <span className="rv-pesos" aria-label={`${valor < 0 ? "−" : ""}${texto}`}>{valor < 0 ? "−" : ""}<span className="rv-peso" aria-hidden="true">$</span><span aria-hidden="true">{texto.slice(1)}</span></span>;
}

// Un número de arriba: ícono y rótulo, el número grande y la comparación en una pastilla. Si el
// número se explica, se toca (el número o la «i» de la esquina) y dice de dónde sale.
function Kpi({ icono, rotulo, valor, comp, principal, pasos, titulo, testId }: { icono: IconoDeNegocio; rotulo: string; valor: ReactNode; comp: ReactNode; principal?: boolean; pasos?: string[] | null; titulo?: string; testId: string }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className={`rv-kpi ${principal ? "principal" : ""}`} data-testid={testId}>
      <div className="rv-kpi-cab"><span className="rv-kpi-ico"><IconoN nombre={icono} tam={16} /></span><span className="rv-etiqueta">{rotulo}</span></div>
      {pasos ? (
        <>
          <button type="button" className="rv-explica" aria-label={`${rotulo}. Ver de dónde sale`} aria-haspopup="dialog" onClick={() => setAbierta(true)} data-testid="explicacion">
            <span className="rv-va">{valor}</span><span className="rv-explica-i"><IconoN nombre="info" tam={16} /></span>
          </button>
          {abierta && (
            <Hoja titulo={titulo ?? `De dónde sale ${rotulo}`} alCerrar={() => setAbierta(false)} testId="hoja-explicacion" pie={<Boton variante="marino" onClick={() => setAbierta(false)}>Entendido</Boton>}>
              <ol className="pasos">{pasos.map((p, i) => <li key={i}><span>{p}</span></li>)}</ol>
            </Hoja>
          )}
        </>
      ) : <div className="rv-va">{valor}</div>}
      <div className="rv-comp">{comp}</div>
    </div>
  );
}

// Compras: los gastos de la semana con «Ver los gastos» y las compras recientes con «Ver las
// compras». La sección se ve con cualquiera de los dos y muestra lo que cada uno deja.
export function ResumenCompras({ recientes }: { recientes: (vuelta: number) => ReactNode }) {
  const puedeEsto = usePuede();
  const veGastos = puedeEsto("negocio.gastos");
  const [vuelta, setVuelta] = useState(0);
  return (
    <SeccionDelNegocio seccion="compras" testId="resumen-compras" bajada={TEXTOS.negocio.seccionCompras.largo} alActualizar={() => setVuelta((v) => v + 1)}>
      {veGastos && <GastosConSuNumero key={`gastos-${vuelta}`} />}
      {puedeEsto("deposito.compras") && <div className="rv-otra">{recientes(vuelta)}</div>}
    </SeccionDelNegocio>
  );
}

function GastosConSuNumero() {
  const enLinea = useEnLinea();
  const gastos = comoCarga(useGastosDeLaSemana(), "No se pudieron traer los gastos de la semana");
  const hasta = gastos.datos ? new Date(new Date(`${gastos.datos.desde}T00:00:00`).getTime() + 6 * 86_400_000).toISOString().slice(0, 10) : null;
  const periodo = gastos.datos ? `del ${fecha(gastos.datos.desde).slice(0, 5)} al ${fecha(hasta).slice(0, 5)}` : "";
  return (
    <>
      <div className="rv-kpis rv-kpis-uno">
        <Kpi principal icono="truck" rotulo="Gastos de la semana" testId="indicador-gastos"
          pasos={gastos.datos ? pasosDeGastos(gastos.datos, periodo) : null} titulo="De dónde salen los gastos de la semana"
          valor={<Numero carga={gastos}>{gastos.datos && <Pesos valor={Number(gastos.datos.total)} />}</Numero>}
          comp={gastos.datos ? `En compras, ${periodo}` : textoDeEspera(gastos, enLinea)} />
      </div>
      <GastosDeLaSemana gastos={gastos} periodo={periodo} />
    </>
  );
}

// Inventario: el dinero invertido, en total y por proveedor.
export function ResumenInventario({ invertido }: { invertido: (vuelta: number) => ReactNode }) {
  const [vuelta, setVuelta] = useState(0);
  return (
    <SeccionDelNegocio seccion="inventario" testId="resumen-inventario" bajada={TEXTOS.negocio.seccionInventario.largo} alActualizar={() => setVuelta((v) => v + 1)}>
      <div className="rv-otra">{invertido(vuelta)}</div>
    </SeccionDelNegocio>
  );
}

// Lo común a las tres secciones, como la v2: arriba las secciones como segmentos con ícono (cada
// una con su permiso; Resultado apagada hasta que exista) y, a la derecha, qué período cuenta y
// Hoy · Semana · Mes (Semana y Mes apagados hasta que se calculen). Al lado de las pestañas,
// «Actualizado» y «Actualizar» (F5). Abajo, chico, quién entró y cómo está el servidor.
function SeccionDelNegocio({ seccion, testId, bajada, cargando, datos, alActualizar, children }: { seccion: SeccionDeNegocio; testId: string; bajada: string; cargando?: boolean; datos?: unknown; alActualizar: () => void; children: ReactNode }) {
  const { sesion } = useSesion();
  const puedeEsto = usePuede();
  const usuario = sesion.estado === "con-sesion" ? sesion.usuario : null;
  const enLinea = useEnLinea();
  const [actualizado, setActualizado] = useState(() => new Date());
  useEffect(() => { if (datos) setActualizado(new Date()); }, [datos]);
  const actualizar = () => { if (enLinea && !cargando) { alActualizar(); setActualizado(new Date()); } };
  const actualizarRef = useRef(actualizar);
  actualizarRef.current = actualizar;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "F5" && !e.ctrlKey && !e.metaKey) { e.preventDefault(); actualizarRef.current(); } };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);
  const visibles = SECCIONES_DE_NEGOCIO.filter((s) => puedeEsto(...s.pide));
  const ahora = new Date();
  const dia = ahora.toLocaleDateString("es-AR", { weekday: "long" });
  const diaYMes = ahora.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  const segmentos = useRef<HTMLDivElement>(null);
  const moverse = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = visibles.findIndex((s) => s.valor === seccion);
    const otra = visibles[(i + (e.key === "ArrowRight" ? 1 : visibles.length - 1)) % visibles.length];
    e.preventDefault();
    if (otra) irA(RUTA_DE_SECCION[otra.valor]);
  };
  useEffect(() => { if (segmentos.current?.contains(document.activeElement)) segmentos.current.querySelector<HTMLButtonElement>("[aria-current='page']")?.focus(); }, [seccion]);
  return (
    <Pagina titulo={NOMBRES.comoVaElNegocio} testId={testId} bajada={<span className="solo-lectores">{bajada}</span>} className="rv"
      acciones={<AlLadoDeLasPestanas><span className="rv-actualizado">{TEXTOS.tablero.actualizado.largo} {horaCorta(actualizado)}</span><button type="button" className="rv-boton" onClick={actualizar} disabled={!enLinea || cargando} aria-keyshortcuts="F5" data-testid="actualizar-negocio"><IconoN nombre="refresh-cw" tam={16} />Actualizar <span className="rv-kbd">F5</span></button></AlLadoDeLasPestanas>}>
      <div className="rv-barra">
        {visibles.length > 1 && (
          <div className="rv-segmentos rv-secciones" role="navigation" aria-label="Secciones" ref={segmentos} onKeyDown={moverse}>
            {visibles.map((s) => (
              <button key={s.valor} type="button" className={s.valor === seccion ? "elegido" : ""} aria-current={s.valor === seccion ? "page" : undefined} onClick={() => irA(RUTA_DE_SECCION[s.valor])} data-testid={`seccion-${s.valor}`}>
                <IconoN nombre={ICONO_DE_SECCION[s.valor]} tam={16} />{s.nombre}
              </button>
            ))}
            <button type="button" disabled title={TEXTOS.tablero.sinResultado.largo}><IconoN nombre="scale" tam={16} />{TEXTOS.tablero.resultado.largo}</button>
          </div>
        )}
        {seccion === "ventas" && <div className="rv-periodo">
          <div className="rv-compara"><b>{dia.charAt(0).toUpperCase() + dia.slice(1)} {diaYMes}, hasta las {horaCorta(actualizado)}</b><br />contra ayer, {nombreDelDia(diaAnterior(hoyLocal()))}, a la misma hora</div>
          <div className="rv-segmentos" role="group" aria-label="Período">
            <button type="button" className="elegido" aria-pressed="true">Hoy <span className="rv-seg-kbd">D</span></button>
            <button type="button" disabled title={TEXTOS.tablero.sinPeriodo.largo}>Semana <span className="rv-seg-kbd">S</span></button>
            <button type="button" disabled title={TEXTOS.tablero.sinPeriodo.largo}>Mes <span className="rv-seg-kbd">M</span></button>
          </div>
        </div>}
      </div>
      {!enLinea && <Aviso tipo="alerta" testId="resumen-sin-conexion">Sin conexión: los números se ven cuando vuelva internet. Se actualizan solos.</Aviso>}
      {children}
      <footer className="resumen-pie">
        {usuario && <span>Entraste como <strong data-testid="usuario-negocio">{usuario.nombre}</strong> <span className="detalle">({usuario.email})</span></span>}
        <EstadoDeConexion testId="conexion-negocio" />
        <EstadoDelServidor />
      </footer>
    </Pagina>
  );
}

function pasosDeGastos(g: Gastos, periodo: string): string[] {
  const pasos = g.por_proveedor.map((p) => `${p.proveedor}, ${plural(Number(p.compras), "compra", "compras")}: ${pesos(p.total)}`);
  if (!pasos.length) pasos.push("En la semana no se registraron compras");
  return [...pasos, `Gastos de la semana (${periodo}): ${pesos(g.total)}`];
}

const textoDeEspera = (c: Carga<unknown>, enLinea: boolean) => (c.error ? (enLinea ? "No se pudo cargar" : "Se ve cuando vuelva internet") : "Trayendo el dato…");

// El lugar del número: mientras carga no muestra $0, y si falló lo dice sin moverse de lugar.
function Numero({ carga, children }: { carga: Carga<unknown>; children: ReactNode }) {
  if (carga.datos) return <>{children}</>;
  if (carga.error) return <span className="resumen-sin-dato" aria-label="Sin dato">—</span>;
  return <span className="esqueleto resumen-esqueleto" role="status" aria-label="Cargando" />;
}

function ErrorDeBloque({ carga }: { carga: Carga<unknown> }) {
  return <Aviso tipo="error" accion={<Boton tam="chico" onClick={carga.recargar}>Reintentar</Boton>}>{carga.error}</Aviso>;
}

function Esqueleto({ renglones }: { renglones: number }) {
  return <div className="negocio-esqueleto" role="status" aria-label="Cargando">{Array.from({ length: renglones }, (_, i) => <span key={i} className="esqueleto" />)}</div>;
}

function GastosDeLaSemana({ gastos, periodo }: { gastos: Carga<Gastos>; periodo: string }) {
  const filas = gastos.datos?.por_proveedor ?? [];
  return (
    <section className="rv-card" data-testid="gastos-semana" aria-labelledby="resumen-gastos">
      <header className="rv-card-cab">
        <h2 id="resumen-gastos">Lo comprado a cada proveedor</h2>
        {gastos.datos && <span className="rv-der">{periodo}</span>}
      </header>
      <ErrorDeBloque carga={gastos} />
      {!gastos.datos && !gastos.error && <Esqueleto renglones={3} />}
      {gastos.datos && filas.length === 0 && <p className="rv-vacio-chico">En la semana no se registraron compras.</p>}
      {filas.length > 0 && (
        <ul className="rv-renglones">
          {filas.map((g) => (
            <li key={g.proveedor}>
              <span className="rv-renglon-ico"><IconoN nombre="truck" tam={16} /></span>
              <span className="rv-renglon-nombre">{g.proveedor}<small>{plural(Number(g.compras), "compra", "compras")}</small></span>
              <span className="rv-renglon-importe"><Pesos valor={Number(g.total)} /></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Lo que preguntaron y no compraron, agrupado como la v2 («Disco de corte × 3»): demanda que hoy
// se pierde. Se anota en Vender con «No llevó». «Ver las N» abre cada consulta, con cuándo, el
// precio que se dijo y el motivo.
function NoLlevaron({ consultas, deHoy }: { consultas: Carga<Consulta[]>; deHoy: number }) {
  const [todas, setTodas] = useState(false);
  const lista = consultas.datos ?? [];
  const grupos = agruparNoLlevados(lista);
  return (
    <section className="rv-card" data-testid="consultas" aria-labelledby="resumen-consultas">
      <header className="rv-card-cab">
        <h2 id="resumen-consultas">{TEXTOS.tablero.noLlevaron.largo}</h2>
        {consultas.datos && <span className={`rv-pastilla ${deHoy ? "urgente" : ""}`} title="Hoy">{deHoy ? `${deHoy} hoy` : "Ninguna hoy"}</span>}
        {lista.length > CONSULTAS_A_LA_VISTA && <span className="rv-der"><button type="button" className="rv-enlace" aria-expanded={todas} onClick={() => setTodas((t) => !t)}>{todas ? "Ver menos" : `Ver las ${lista.length}`}</button></span>}
      </header>
      <ErrorDeBloque carga={consultas} />
      {!consultas.datos && !consultas.error && <Esqueleto renglones={3} />}
      {consultas.datos && lista.length === 0 && <p className="rv-vacio-chico">Cuando alguien pregunta un precio y no compra, tocá «No llevó» en Vender y queda anotado acá.</p>}
      {!todas && grupos.length > 0 && (
        <ul className="rv-lista-simple">
          {grupos.slice(0, CONSULTAS_A_LA_VISTA).map((g, i) => (
            <li key={g.descripcion} className={i === CONSULTAS_A_LA_VISTA - 1 ? "ultima" : ""} data-testid="consulta">
              <IconoN nombre="package" tam={16} /><span className="rv-lista-nombre">{g.descripcion}</span><span className="rv-pastilla">× {g.veces}</span>
            </li>
          ))}
        </ul>
      )}
      {todas && (
        <ul className="rv-renglones rv-consultas">
          {lista.map((c) => (
            <li key={c.id} data-testid="consulta">
              <span className="rv-renglon-ico"><IconoN nombre="package" tam={16} /></span>
              <span className="rv-renglon-nombre">{c.descripcion}<small>{diaYHora(c.fecha)} · {c.motivo ?? "No se anotó el motivo"}</small></span>
              <span className="rv-renglon-importe">{c.precio_ofrecido ? <Pesos valor={Number(c.precio_ofrecido)} /> : <span className="rv-sin-dato">Sin precio</span>}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Si la app responde: se pregunta sin sesión, así que sirve también cuando algo anda mal.
function EstadoDelServidor() {
  const [estado, setEstado] = useState<{ texto: string; bien: boolean | null }>({ texto: "Consultando el servidor…", bien: null });
  useEffect(() => {
    let vigente = true;
    fetch(urlApi("/health"))
      .then((r) => r.json() as Promise<{ ok: boolean; db: string }>)
      .then((s) => { if (vigente) setEstado({ texto: `Servidor ${s.ok ? "ok" : "con problemas"} · base ${s.db}`, bien: s.ok && s.db === "ok" }); })
      .catch(() => { if (vigente) setEstado({ texto: "Sin conexión con el servidor.", bien: false }); });
    return () => { vigente = false; };
  }, []);
  const prueba = esAmbienteDePrueba();
  const version = import.meta.env.VITE_VERSION ?? "local";
  const pastilla = <Pastilla tipo={estado.bien === null ? undefined : estado.bien ? "ok" : "mal"}><span data-testid="estado">{estado.texto}</span></Pastilla>;
  if (!prueba) return pastilla;
  return <span className="resumen-ambiente" data-testid="ambiente-negocio"><span className="detalle">Ambiente de prueba ·</span> {pastilla} <span className="detalle">· versión {version}</span></span>;
}
