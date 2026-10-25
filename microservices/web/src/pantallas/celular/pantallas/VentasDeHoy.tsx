import { AvisoError, Hoja, Icono } from "../componentes/base";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Rodar } from "../../../plataforma/animacion/Rodar";
import { conMovimiento } from "../../../plataforma/animacion/animacion";
import { IconoDeMedio } from "../../IconoDeMedio";
import { MEDIOS as MEDIOS_DE_TEXTOS, TEXTOS } from "../../textos";
import { diaAnterior, nombreDelDia, resumenDelDia, useResumenDelDia, type Comparacion } from "../../../negocio/ventas/resumen-del-dia";
import { Calendario } from "../../Calendario";
import { CorregirEnLaHoja, HojaDeCambio } from "./CorregirYCambio";
import { Icono as IconoC } from "../../compu/base/ui";
import { empezarCorreccion, type Correccion } from "../../../negocio/ventas/correccion";
import { sePuedeCambiar } from "../../../negocio/ventas/cambio";
import { pedirClientes } from "../../../negocio/catalogo";
import "./hoy.css";
import { pesosCortos } from "../../../formato";
import { urlDeFoto } from "../../../datos/conexion";
import { conUnidad } from "../../../negocio/catalogo";
import { MEDIOS, NOMBRE_DE_MEDIO } from "../../../negocio/ventas/venta";
import { buscarVentas, confirmadas, fueSinConexion, hoyLocal, useVentasDelDia, MOTIVOS_DE_ANULACION, motivoDeAnulacion, plano, SIN_MOTIVO, useAnularVenta, type VentaDelDia } from "../../../negocio/ventas/ventas-del-dia";

// «Ventas de hoy» en el celular (specs/017; decisión 120, maqueta
// specs/003-ventas/maquetas/celular-ventas-de-hoy-v2.png): el día y «Cambiar fecha»; el resumen en
// una tarjeta clara con el total, la comparación, lo vendido por hora y los cuatro medios; los
// tres números; y cada venta en un renglón corto que abre su hoja, desde donde se anula. El
// buscador encuentra una venta por un producto, el importe o el cliente.

const MEDIOS_CORTOS = Object.fromEntries(MEDIOS_DE_TEXTOS.map((m) => [m.valor, m.corto])) as Record<string, string>;
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
const subtotal = (i: VentaDelDia["items"][number]) => i.subtotal ?? Number(i.cantidad) * Number(i.precio_unitario);

export function VentasDeHoy({ anulaHoy = false, anulaCualquierDia = false }: { anulaHoy?: boolean; anulaCualquierDia?: boolean }) {
  const [dia, setDia] = useState<string | null>(null);
  const r = useResumenDelDia(dia);
  const t = TEXTOS.hoy;
  // «Otro día» y «Buscar» abren un panel desde abajo, como en la v2 (decisión 141).
  const [panel, setPanel] = useState<"otro-dia" | "buscar" | null>(null);
  const [texto, setTexto] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const ahora = new Date();
  const todas = r.ventas ?? [];
  const halladas = buscarVentas(todas, texto, null);
  const venta = todas.find((v) => v.id === abierta) ?? null;
  // Anular: las de hoy con «Anular ventas del día»; las de otro día, solo con «de cualquier día».
  const anula = r.esHoy ? anulaHoy : anulaCualquierDia;
  const cerrarBusqueda = () => { setPanel(null); setTexto(""); };
  // El cambio (o la devolución) lo registra quien anula las ventas del día, para cualquier venta de 15 días (decisión 135).
  const cambia = anulaHoy || anulaCualquierDia;
  const [cambio, setCambio] = useState<{ venta: VentaDelDia | null } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => { if (!aviso) return; const x = setTimeout(() => setAviso(null), 5000); return () => clearTimeout(x); }, [aviso]);
  return (
    <div className="hoy" data-testid="hoy">
      <div className="hoy-fecha">
        <div>
          <b data-testid="dia-que-se-mira">{r.esHoy ? `${t.hoy.corto}, ${nombreDelDia(r.dia)}` : mayuscula(nombreDelDia(r.dia))}{r.esHoy && <small> · {hora(ahora.toISOString())}</small>}</b>
          {!r.esHoy && <button type="button" className="enlace" onClick={() => setDia(null)} data-testid="volver-a-hoy">{t.volverAHoy.corto}</button>}
        </div>
        <button type="button" className="hoy-boton chico" onClick={() => setPanel("otro-dia")} data-testid="cambiar-fecha"><Icono nombre="calendario" tam={18} />{t.otroDia.corto}</button>
      </div>
      {!r.resumen ? (
        r.error && fueSinConexion(r.error) ? <div className="aviso-suave" data-testid="sin-conexion">{r.esHoy ? t.sinConexionHoy.corto : t.sinConexionOtroDia.corto}</div> : r.error ? <div className="aviso-suave">{(r.error as Error).message}</div> : <div className="aviso-suave" aria-busy="true">{t.buscando.corto}…</div>
      ) : <>
        <section className="tarjeta hoy-total" data-testid="resumen-hoy">
          <small>{t.totalDeVentas.corto}</small>
          <span className="hoy-monto importe" data-testid="total-de-hoy"><Rodar texto={pesosCortos(r.resumen.total)} escalon={30} alAparecer /></span>
          <ComparacionDelDia comparacion={r.comparacion} esHoy={r.esHoy} diaAnterior={r.diaAnterior} />
          <Barras barras={r.barras} anterior={r.anteriorPorHora} />
          <ul className="hoy-medios">
            {MEDIOS.map((m) => (
              <li key={m} data-testid={`medio-${m}`}>
                <IconoDeMedio medio={m} tam={18} conFondo />
                <span><b className="importe"><Rodar texto={pesosCortos(r.resumen!.medios[m].total)} /></b>
                  <small><span className="hoy-medio-nombre">{MEDIOS_CORTOS[m]}</span> · {r.resumen!.medios[m].cuantas} {r.resumen!.medios[m].cuantas === 1 ? t.venta.corto : t.ventas.corto}</small></span>
              </li>
            ))}
          </ul>
        </section>
        <div className="hoy-numeros" data-testid="numeros">
          <div><b data-testid="cuantas-ventas"><Rodar texto={String(r.resumen.ventas)} /></b><small>{t.ventas.corto}</small></div>
          <div><b data-testid="cuantos-productos"><Rodar texto={String(r.resumen.productos)} /></b><small>{t.productos.corto}</small></div>
          <div><b data-testid="ticket"><Rodar texto={r.resumen.ticket === null ? "—" : pesosCortos(r.resumen.ticket)} /></b><small>{t.ticket.corto}</small></div>
        </div>
        <div className="hoy-titulo-fila">
          <h2 className="hoy-titulo">{t.titulo.corto}</h2>
          <span className="hoy-acciones">
            {cambia && <button type="button" className="hoy-boton chico" onClick={() => setCambio({ venta: null })} data-testid="registrar-cambio"><IconoC nombre="repetir" tam={18} />{t.registrarCambio.corto}</button>}
            {todas.length > 0 && <button type="button" className="hoy-boton chico" onClick={() => setPanel("buscar")} data-testid="abrir-buscar"><Icono nombre="buscar" tam={18} />Buscar</button>}
          </span>
        </div>
        <VentasCortas ventas={todas} buscado="" alAbrir={(v) => setAbierta(v.id)} sinVentas={r.esHoy ? t.sinVentasHoy.corto : t.sinVentasDia.corto} />
      </>}
      {panel === "otro-dia" && <OtroDia dia={r.dia} alElegir={(d) => { setDia(d === hoyLocal() ? null : d); setPanel(null); }} alCerrar={() => setPanel(null)} />}
      {panel === "buscar" && (
        <Hoja titulo={t.buscarUnaVenta.corto} alCerrar={cerrarBusqueda} testId="hoja-buscar-venta">
          <div className="hoy-buscar-fila">
            <label className="hoy-buscar-caja"><Icono nombre="buscar" tam={20} />
              <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus placeholder={t.buscarVenta.corto} aria-label={t.buscarVenta.corto} data-testid="buscar-venta" />
              {texto && <button type="button" aria-label="Borrar" onClick={() => setTexto("")}><Icono nombre="cerrar" tam={16} grosor={2.6} /></button>}
            </label>
            <button type="button" className="enlace hoy-listo" onClick={cerrarBusqueda} data-testid="salir-de-buscar">Listo</button>
          </div>
          <div className="hoy-cuantas" data-testid="cuantas-halladas">
            {texto.trim() ? <><span>{halladas.length} de {todas.length} {todas.length === 1 ? t.venta.corto : t.ventas.corto}</span>{halladas.length > 0 && <span>suman {pesosCortos(confirmadas(halladas).reduce((s, v) => s + Number(v.total), 0))}</span>}</>
              : <span>{t.queSeBusca.corto}</span>}
          </div>
          {texto.trim() && (halladas.length === 0 ? (
            <div className="hoy-sin-resultados" data-testid="sin-resultados">
              <span className="hoy-sin-icono"><Icono nombre="buscar" tam={26} /></span>
              <b>Ninguna venta con «{texto.trim()}»</b>
              <small>{t.probaConOtra.corto}</small>
              <button type="button" className="hoy-boton" onClick={() => setTexto("")}><Icono nombre="cerrar" tam={16} />Borrar la búsqueda</button>
            </div>
          ) : <VentasCortas ventas={halladas} buscado={texto} alAbrir={(v) => setAbierta(v.id)} sinVentas="" />)}
        </Hoja>
      )}
      {venta && <HojaDeLaVenta venta={venta} anula={anula} cambia={cambia} esHoy={r.esHoy} alCerrar={() => setAbierta(null)} alAviso={setAviso}
        alCambio={() => { setCambio({ venta }); setAbierta(null); }} />}
      {cambio && <HojaDeCambio venta={cambio.venta} alCerrar={() => setCambio(null)} alListo={(m) => { setCambio(null); setAviso(m); }} />}
      {aviso && <div className="toast hoy-aviso" role="status" data-testid="mensaje"><Icono nombre="tilde" tam={20} /><span>{aviso}</span></div>}
    </div>
  );
}

// «Otro día», como la v2 (decisión 141): hoy y los seis días anteriores, cada uno con lo vendido y
// cuántas ventas, el que se mira con un tilde; al final, el calendario propio para ir más atrás.
function OtroDia({ dia, alElegir, alCerrar }: { dia: string; alElegir: (dia: string) => void; alCerrar: () => void }) {
  const t = TEXTOS.hoy;
  const [conCalendario, setConCalendario] = useState(false);
  const hoy = hoyLocal();
  const dias = [hoy];
  while (dias.length < 7) dias.push(diaAnterior(dias[dias.length - 1]!));
  return (
    <Hoja titulo={t.otroDia.corto} alCerrar={alCerrar} testId="hoja-otro-dia">
      <p className="hoy-hoja-detalle">{t.queDiaMirar.corto}</p>
      {conCalendario ? <Calendario elegido={dia} hasta={hoy} hoy={hoy} alElegir={alElegir} /> : <>
        <div className="hoy-dias">{dias.map((d, i) => <DiaParaElegir key={d} dia={d} hoy={i === 0} ayer={i === 1} elegido={d === dia} alElegir={() => alElegir(d)} />)}</div>
        <button type="button" className="hoy-dia hoy-dia-calendario" onClick={() => setConCalendario(true)} data-testid="elegir-en-calendario">
          <Icono nombre="calendario" tam={20} /><span>{t.elegirEnElCalendario.corto}<small>{t.masAtras.corto}</small></span><Icono nombre="derecha" tam={18} />
        </button>
      </>}
    </Hoja>
  );
}

// Un día de la lista de «Otro día»: su nombre y, cuando llega, lo vendido y cuántas ventas.
function DiaParaElegir({ dia, hoy, ayer, elegido, alElegir }: { dia: string; hoy: boolean; ayer: boolean; elegido: boolean; alElegir: () => void }) {
  const t = TEXTOS.hoy;
  const { datos } = useVentasDelDia(hoy ? null : dia);
  const resumen = datos ? resumenDelDia(datos.ventas) : null;
  const nombre = hoy ? `${t.hoy.corto}, ${nombreDelDia(dia)}` : ayer ? `${t.ayer.corto}, ${nombreDelDia(dia)}` : mayuscula(nombreDelDia(dia));
  const detalle = !resumen ? "…" : resumen.ventas === 0 ? t.sinVentas.corto : `${pesosCortos(resumen.total)} · ${resumen.ventas} ${resumen.ventas === 1 ? t.venta.corto : t.ventas.corto}${hoy ? ` ${t.hasta.corto.toLowerCase()} ${hora(new Date().toISOString())}` : ""}`;
  return (
    <button type="button" className={`hoy-dia ${elegido ? "elegido" : ""}`} aria-pressed={elegido} onClick={alElegir} data-testid={`otro-dia-${dia}`}>
      <Icono nombre="calendario" tam={20} /><span>{nombre}<small>{detalle}</small></span>{elegido && <Icono nombre="tilde" tam={18} grosor={2.6} />}
    </button>
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

// Lo vendido por hora, como la v2: cada barra con una raya punteada en lo de ayer a esa hora. Tocar
// una barra (o arrastrar el dedo por ellas) saca el globo con su hora y su importe y baja las demás;
// al pasar de una hora a otra vibra apenas, y al soltar el globo se va solo. Al abrir, las barras
// crecen una después de otra y la marca de ayer aparece después. Con el teclado, Enter elige la barra
// (el toque ya la eligió al apoyar el dedo).
function Barras({ barras, anterior }: { barras: { hora: number; total: number }[]; anterior: Map<number, number> }) {
  const [elegida, setElegida] = useState<number | null>(null);
  const tocando = useRef(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (espera.current) clearTimeout(espera.current); }, []);
  if (barras.length === 0) return null;
  const max = Math.max(...barras.map((b) => b.total), ...barras.map((b) => anterior.get(b.hora) ?? 0), 1);
  const alto = (v: number) => `${Math.max(4, (v / max) * 100)}%`;
  const senalar = (x: number, y: number) => {
    const hora = Number((document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-hora]")?.dataset.hora);
    if (!Number.isFinite(hora)) return;
    setElegida((antes) => { if (antes !== hora && conMovimiento()) navigator.vibrate?.(10); return hora; });
  };
  const soltar = () => { tocando.current = false; if (espera.current) clearTimeout(espera.current); espera.current = setTimeout(() => setElegida(null), 1500); };
  return (
    <div className="hoy-grafico" data-testid="grafico">
      <div className={`hoy-barras ${elegida !== null ? "con-elegida" : ""}`} style={{ touchAction: "none" }}
        onPointerDown={(e) => { tocando.current = true; if (espera.current) clearTimeout(espera.current); senalar(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (tocando.current) senalar(e.clientX, e.clientY); }} onPointerUp={soltar} onPointerCancel={soltar}>
        {barras.map((x, i) => {
          const ayer = anterior.get(x.hora) ?? 0;
          return (
            <div key={x.hora} className={`hoy-col ${x.hora === elegida ? "elegida" : ""}`} data-hora={x.hora}>
              <button type="button" className={x.total === 0 ? "vacia" : ""} style={{ height: alto(x.total), animationDelay: `${i * 20}ms` }}
                onClick={(e) => { if (e.detail === 0) setElegida(x.hora === elegida ? null : x.hora); }} aria-label={`${x.hora} h: ${pesosCortos(x.total)}`} data-testid="barra" />
              {ayer > 0 && <i className="hoy-ayer" style={{ bottom: `${(ayer / max) * 100}%` }} aria-hidden="true" data-testid="marca-ayer" />}
              {x.hora === elegida && <span className="hoy-globo" role="status" style={{ bottom: `calc(${alto(x.total)} + 6px)` }} data-testid="globo">{x.hora} h · {pesosCortos(x.total)}</span>}
            </div>
          );
        })}
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
  const tachando = useRecienAnuladas(ventas);
  if (ventas.length === 0) return <div className="aviso-suave" data-testid="sin-ventas">{sinVentas}</div>;
  return (
    <ul className="hoy-ventas" data-testid="ventas-de-hoy">
      {ventas.map((v) => {
        const anulada = v.estado === "anulada";
        const coincide = buscado.trim() ? v.items.find((i) => plano(i.descripcion).includes(plano(buscado))) : undefined;
        const una = coincide ?? (v.items.length === 1 ? v.items[0]! : null);
        const resto = una && v.items.length > 1 ? ` y ${v.items.length - 1} más` : "";
        return (
          <li key={v.id} className={`${anulada ? "anulada" : ""} ${tachando.has(v.id) ? "tachando" : ""}`} data-testid="venta-dia">
            <button type="button" className="hoy-venta" onClick={() => alAbrir(v)}>
              <IconoDeMedio medio={v.medio_pago} tam={20} conFondo />
              <span className="hoy-venta-texto">
                <b>{una ? <>{conUnidad(una.cantidad, una.unidad)} <Resaltar texto={una.descripcion} buscado={buscado} />{resto}</> : `${v.items.length} ${t.productos.corto}`}{anulada && <span className="hoy-anulada">{t.anulada.corto}</span>}</b>
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

// Las ventas que se acaban de anular, un momento, para que se tachen con una raya que se dibuja.
function useRecienAnuladas(ventas: VentaDelDia[]): Set<string> {
  const antes = useRef(new Map(ventas.map((v) => [v.id, v.estado])));
  const [recien, setRecien] = useState<Set<string>>(new Set());
  useEffect(() => {
    const nuevas = ventas.filter((v) => v.estado === "anulada" && antes.current.get(v.id) === "confirmada").map((v) => v.id);
    antes.current = new Map(ventas.map((v) => [v.id, v.estado]));
    if (!nuevas.length || !conMovimiento()) return;
    setRecien(new Set(nuevas));
    const t = setTimeout(() => setRecien(new Set()), 900);
    return () => clearTimeout(t);
  }, [ventas]);
  return recien;
}

// La hoja de una venta: la hora, el medio y el cliente, sus productos y «Anular» si se puede.
function HojaDeLaVenta({ venta: v, anula, cambia, esHoy, alCerrar, alCambio, alAviso }: { venta: VentaDelDia; anula: boolean; cambia: boolean; esHoy: boolean; alCerrar: () => void; alCambio: () => void; alAviso: (texto: string) => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const [correccion, setCorreccion] = useState<Correccion | null>(null);
  const anulada = v.estado === "anulada";
  const t = TEXTOS.hoy;
  // Corregir y anular piden el permiso según el día de la venta; el cambio, el de anular las del día, hasta 15 días (decisión 135).
  const enPlazo = sePuedeCambiar(v.fecha);
  return (
    <Hoja titulo={`Venta de las ${hora(v.fecha)}`} alCerrar={alCerrar} testId="hoja-venta">
      <p className="hoy-hoja-detalle"><IconoDeMedio medio={v.medio_pago} tam={18} />{NOMBRE_DE_MEDIO[v.medio_pago] ?? v.medio_pago}{v.cliente ? ` · ${v.cliente}` : ""}{esHoy ? "" : " · otro día"}{(v.correcciones ?? 0) > 0 ? " · corregida" : ""}</p>
      {/* Los tres verbos de la v2: Corregir · Cambio · Anular (specs/019). */}
      {!anulada && (anula || cambia) && (
        <div className="segmentos cc-verbos" role="group" aria-label="Qué hacer con la venta">
          {anula && <button type="button" className={correccion ? "activo" : ""} aria-pressed={Boolean(correccion)} onClick={() => { pedirClientes(); setCorreccion(correccion ?? empezarCorreccion(v)); }} data-testid="corregir">{t.corregir.corto}</button>}
          {cambia && <button type="button" disabled={!enPlazo} title={enPlazo ? undefined : t.pasoElPlazo.corto} onClick={() => { setCorreccion(null); alCambio(); }} data-testid="cambio">{t.cambio.corto}</button>}
          {anula && <button type="button" className="cc-anular" onClick={() => setConfirmando(true)} data-testid="anular">{t.anular.corto}</button>}
        </div>
      )}
      {cambia && !anulada && !enPlazo && <p className="hoy-hoja-detalle" data-testid="paso-el-plazo">{t.pasoElPlazo.corto}</p>}
      {correccion ? <CorregirEnLaHoja venta={v} c={correccion} alCambiar={setCorreccion} alDescartar={() => setCorreccion(null)} alGuardar={(m) => { setCorreccion(null); alAviso(m); alCerrar(); }} /> : <>
        <div className="an-items" data-testid="detalle-venta">
          {v.items.map((i, n) => (
            <div key={n} className="an-item">
              <span className="an-foto">{urlDeFoto(i.foto_url) ? <img src={urlDeFoto(i.foto_url)!} alt="" /> : <Icono nombre="imagen" tam={18} />}</span>
              <span><b>{conUnidad(i.cantidad, i.unidad)} {i.descripcion}</b><small>{pesosCortos(i.precio_unitario)} c/u{Number(i.devuelto ?? 0) > 0 ? ` · volvieron ${conUnidad(i.devuelto!, i.unidad)}` : ""}</small></span>
              <span className="an-subtotal">{pesosCortos(subtotal(i))}</span>
            </div>
          ))}
        </div>
        <div className="hoy-hoja-total"><span>Total</span><b className="importe" style={{ textDecoration: anulada ? "line-through" : undefined }}>{pesosCortos(v.total)}</b></div>
        {anulada && <div className="hoy-hoja-anulada"><Icono nombre="prohibido" tam={18} />Anulada. El stock volvió; la venta queda a la vista.</div>}
        <button type="button" className="boton tinta" onClick={alCerrar}>Listo</button>
      </>}
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
