import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconoDeMedio } from "../../../IconoDeMedio";
import { TEXTOS } from "../../../textos";
import { MEDIOS, NOMBRE_DE_MEDIO, type Medio } from "../../../../negocio/ventas/venta";
import { buscarVentas, fueSinConexion, hoyLocal, useVentasDelDia, ventasCambiaron, MOTIVOS_DE_ANULACION, motivoDeAnulacion, plano, SIN_MOTIVO, useAnularVenta, type VentaDelDia } from "../../../../negocio/ventas/ventas-del-dia";
import { aEntrada, conCantidad, conPrecio, diferenciaDe, empezarCorreccion, porQueNoSeGuarda, quitar, resolucionDe, subtotalCorregido, totalCorregido, useCorregirVenta, type Correccion, type RenglonCorregido } from "../../../../negocio/ventas/correccion";
import { precioDelProducto } from "../../../../negocio/catalogo/precio";
import { useCatalogo, pedirClientes } from "../../../../catalogo";
import { usePuede } from "../../../permisos";
import { AlLadoDeLasPestanas } from "../../../AlLadoDeLasPestanas";
import { ElegirCliente } from "../../Vender";
import { diaAnterior, nombreDelDia, resumenDelDia, useResumenDelDia, type Comparacion } from "../../../../negocio/ventas/resumen-del-dia";
import { Calendario } from "../../../Calendario";
import { abreviarUnidad, conUnidad } from "../../../../unidades";
import { useTeclasGlobales } from "../../../../plataforma/teclado/teclas";
import { nombreDeProducto } from "../../../../formato";
import { urlDeFoto } from "../../../../api";
import { irA } from "../rutas";
import { Aviso, Boton, Hoja, Icono, Pagina, Pastilla, Vacio, hora, numero, pesosCortos } from "../ui";
import "../estilos/hoy.css";
import "../estilos/ventas-de-hoy.css";

const t = TEXTOS.hoy;
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const signo = (n: number) => `${n > 0 ? "+" : "−"}${pesosCortos(Math.abs(n))}`;
const NOMBRE_CORTO: Record<Medio, string> = { efectivo: "Efectivo", mercado_pago: "M. Pago", tarjeta: "Tarjeta", cuenta_corriente: "Cta. cte." };

// «Ventas de hoy» en la computadora: la v2 del director de arte, «El día y la venta» (decisión 135,
// specs/017 ux.md). Arriba el día: el total con la comparación y los tres números, lo vendido por
// hora con lo de ayer marcado, y los cuatro medios. Debajo, los filtros y el buscador, la tabla del
// día y, a la derecha, la venta elegida con «Corregir» (E) y «Anular» (Supr o A). Corregir edita la
// venta en el mismo panel (specs/019, historia 1). ↑ ↓ eligen la venta, / o Ctrl+K buscan, F cambia
// la fecha; corrigiendo, Ctrl+Enter guarda y Esc descarta.
type Filtro = "todas" | "cuenta" | "anuladas";
export function Hoy() {
  const puedeEsto = usePuede();
  const [dia, setDia] = useState<string | null>(null);
  const r = useResumenDelDia(dia);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [texto, setTexto] = useState("");
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [correccion, setCorreccion] = useState<{ ventaId: string; c: Correccion } | null>(null);
  const [porAnular, setPorAnular] = useState<VentaDelDia | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [otroDia, setOtroDia] = useState(false);
  const [campo, setCampo] = useState<HTMLInputElement | null>(null);
  const tabla = useRef<HTMLDivElement>(null);
  const todas = r.ventas ?? [];
  const halladas = buscarVentas(todas, texto, null);
  const pasa = (v: VentaDelDia, f: Filtro) => f === "todas" || (f === "cuenta" ? v.medio_pago === "cuenta_corriente" && v.estado !== "anulada" : v.estado === "anulada");
  const visibles = halladas.filter((v) => pasa(v, filtro));
  const elegida = visibles.find((v) => v.id === elegidaId) ?? visibles.find((v) => v.estado !== "anulada") ?? visibles[0] ?? null;
  // Las de hoy, con «Anular ventas del día»; las de otro día, solo con «de cualquier día». Corregir pide lo mismo (decisión 135).
  const anula = r.esHoy ? puedeEsto("ventas.anular", "ventas.anular_cualquiera") : puedeEsto("ventas.anular_cualquiera");
  const corrigiendo = correccion && elegida && correccion.ventaId === elegida.id ? correccion.c : null;
  useEffect(() => { setCorreccion(null); setElegidaId(null); }, [r.dia]);
  useEffect(() => { if (!mensaje) return; const x = setTimeout(() => setMensaje(null), 6000); return () => clearTimeout(x); }, [mensaje]);
  // La elegida, siempre a la vista en la tabla, y con el foco si estaba en la tabla.
  useEffect(() => { if (tabla.current?.contains(document.activeElement)) tabla.current.querySelector<HTMLButtonElement>("[data-elegida='si']")?.focus({ preventScroll: true }); }, [elegida?.id]);
  useEffect(() => { tabla.current?.querySelector("[data-elegida='si']")?.scrollIntoView?.({ block: "nearest" }); }, [elegida?.id]);

  const elegir = (v: VentaDelDia) => { if (correccion && correccion.ventaId !== v.id) setCorreccion(null); setElegidaId(v.id); };
  const mover = (paso: number) => {
    if (!visibles.length) return;
    const i = elegida ? visibles.indexOf(elegida) : -1;
    elegir(visibles[Math.max(0, Math.min(visibles.length - 1, i + paso))]!);
  };
  const empezar = () => { if (elegida && anula && elegida.estado === "confirmada") { pedirClientes(); setCorreccion({ ventaId: elegida.id, c: empezarCorreccion(elegida) }); } };
  const guardarRef = useRef<() => void>(() => undefined);

  const teclas = useCallback((e: KeyboardEvent) => {
    if (porAnular || hojaAbierta || otroDia) return;
    const enCampo = (e.target as HTMLElement | null)?.tagName === "INPUT";
    if (corrigiendo) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); guardarRef.current(); }
      else if (e.key === "Escape" && !enCampo) { e.preventDefault(); setCorreccion(null); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); campo?.focus(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); mover(e.key === "ArrowDown" ? 1 : -1); return; }
    if (enCampo) return;
    if (e.key === "/") { e.preventDefault(); campo?.focus(); }
    else if (e.key === "f" || e.key === "F") { e.preventDefault(); setOtroDia(true); }
    else if (e.key === "e" || e.key === "E") { if (elegida && anula && elegida.estado === "confirmada") { e.preventDefault(); empezar(); } }
    else if (e.key === "Delete" || e.key === "a" || e.key === "A") { if (elegida && anula && elegida.estado === "confirmada") { e.preventDefault(); setPorAnular(elegida); } }
  }, [porAnular, hojaAbierta, otroDia, corrigiendo, campo, elegida, anula, visibles]); // eslint-disable-line react-hooks/exhaustive-deps
  useTeclasGlobales(teclas, campo);

  const error = !r.resumen && r.error && (fueSinConexion(r.error) ? (r.esHoy ? t.sinConexionHoy.largo : t.sinConexionOtroDia.largo) : r.error.message);
  const cuantas = (f: Filtro) => halladas.filter((v) => pasa(v, f)).length;
  return (
    <Pagina titulo={r.esHoy ? t.tituloHoy.largo : `${t.tituloDia.largo} ${nombreDelDia(r.dia)}`} testId="ventas-de-hoy" className="vhc-pagina"
      acciones={<AlLadoDeLasPestanas><div className="fila">
        <span className="vhc-fecha" data-testid="dia-que-se-mira">{mayuscula(nombreDelDia(r.dia))}{r.esHoy ? ` · ${t.hasta.largo.toLowerCase()} ${hora(new Date().toISOString())}` : ""}</span>
        {!r.esHoy && <button type="button" className="enlace" onClick={() => setDia(null)} data-testid="volver-a-hoy">{t.volverAHoy.largo}</button>}
        <Boton icono="calendario" onClick={() => setOtroDia(true)} aria-keyshortcuts="F" data-testid="cambiar-fecha">{t.otroDia.largo} <kbd className="tecla">F</kbd></Boton>
      </div></AlLadoDeLasPestanas>}>
      <Aviso tipo="error">{error}</Aviso>
      {!r.resumen && !error && <div className="esqueleto ventas-esqueleto" aria-busy="true" aria-label={t.buscando.largo} />}
      {r.resumen && <>
        <section className="vhc-dia-tarjeta" data-testid="resumen-hoy">
          <div className="vhc-total">
            <span className="vhc-etiqueta">{t.totalDeVentas.largo}</span>
            <span className="vhc-monto importe" data-testid="total-de-hoy">{pesosCortos(r.resumen.total)}</span>
            <LaComparacion comparacion={r.comparacion} esHoy={r.esHoy} diaAnterior={r.diaAnterior} />
            <div className="vhc-tres" data-testid="numeros">
              <span><b data-testid="cuantas-ventas">{r.resumen.ventas}</b>{t.ventas.largo}</span>
              <span><b data-testid="cuantos-productos">{r.resumen.productos}</b>{t.productos.largo}</span>
              <span><b data-testid="ticket">{r.resumen.ticket === null ? "—" : pesosCortos(r.resumen.ticket)}</b>{t.ticket.largo}</span>
            </div>
          </div>
          <PorHora barras={r.barras} anterior={r.anteriorPorHora} esHoy={r.esHoy} />
          <div className="vhc-medios" data-testid="medios">
            {MEDIOS.map((m) => (
              <div key={m} className={`vhc-medio medio-${m}`} data-testid={`medio-${m}`}>
                <IconoDeMedio medio={m} tam={16} conFondo />
                <b>{NOMBRE_DE_MEDIO[m]}</b>
                <small>{r.resumen!.medios[m].cuantas} {r.resumen!.medios[m].cuantas === 1 ? t.venta.largo : t.ventas.largo}</small>
                <strong className="importe">{pesosCortos(r.resumen!.medios[m].total)}</strong>
              </div>
            ))}
          </div>
        </section>
        {todas.length === 0 ? (
          <div data-testid="sin-ventas"><Vacio icono="ventas" titulo={r.esHoy ? t.sinVentasHoy.largo : t.sinVentasDia.largo}
            accion={r.esHoy ? <Boton variante="principal" icono="vender" onClick={() => irA("vender")}>{t.irAVender.largo}</Boton> : undefined} /></div>
        ) : (
          <div className="vhc-abajo">
            <div className="vhc-izq">
              <div className="vhc-filtros" role="group" aria-label="Filtrar las ventas">
                {([["todas", t.todas], ["cuenta", t.ctaCte], ["anuladas", t.anuladas]] as const).map(([f, nombre]) => (
                  <button key={f} type="button" className={`vhc-chip ${filtro === f ? "elegido" : ""}`} aria-pressed={filtro === f} onClick={() => setFiltro(f)} data-testid={`filtro-${f}`}>{nombre.largo} ({cuantas(f)})</button>
                ))}
                <label className={`vhc-buscar ${texto ? "con-texto" : ""}`}>
                  <Icono nombre="buscar" tam={18} />
                  <input ref={setCampo} type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={t.buscarVenta.largo} aria-label="Buscar una venta" aria-keyshortcuts="/ Control+K" data-testid="buscar-venta"
                    onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); if (texto) setTexto(""); else e.currentTarget.blur(); } }} />
                  {!texto && <kbd className="tecla">/</kbd>}
                </label>
              </div>
              {texto.trim() && <span className="detalle vhc-halladas" data-testid="cuantas-halladas">{halladas.length} de {todas.length} ventas · suman {pesosCortos(halladas.filter((v) => v.estado === "confirmada").reduce((s, v) => s + Number(v.total), 0))}</span>}
              <div className="vhc-tabla" ref={tabla} data-flechas-propias data-testid="ventas-de-hoy-lista">
                <div className="vhc-fila cab" aria-hidden="true"><span>{t.columnaHora.largo}</span><span /><span>{t.queSeLlevo.largo}</span><span>{t.quienComo.largo}</span><span className="d">{t.columnaTotal.largo}</span><span /></div>
                {visibles.length === 0
                  ? <p className="detalle vhc-nada" data-testid="nada">{texto.trim() ? `${t.nadaConEsto.largo} «${texto.trim()}»` : "Ninguna venta acá."}</p>
                  : visibles.map((v) => <FilaDeVenta key={v.id} venta={v} buscado={texto} elegida={v.id === elegida?.id} alElegir={() => elegir(v)} />)}
              </div>
            </div>
            {elegida && <PanelDeVenta key={elegida.id} venta={elegida} anula={anula} correccion={corrigiendo}
              alCorregir={empezar} alAnular={() => setPorAnular(elegida)} alDescartar={() => setCorreccion(null)}
              alCambiar={(c) => setCorreccion({ ventaId: elegida.id, c })} alHoja={setHojaAbierta} guardarRef={guardarRef}
              alGuardar={(texto) => { setCorreccion(null); setMensaje(texto); }} />}
          </div>
        )}
      </>}
      {otroDia && <OtroDia dia={r.dia} alElegir={(d) => { setDia(d === hoyLocal() ? null : d); setOtroDia(false); }} alCerrar={() => setOtroDia(false)} />}
      {porAnular && <AnularVenta venta={porAnular} alCerrar={() => setPorAnular(null)} alAnular={() => { setPorAnular(null); setMensaje(`Venta de ${pesosCortos(porAnular.total)} anulada. El stock volvió.`); }} />}
      {mensaje && <div className="vhc-aviso" role="status" data-testid="mensaje"><Icono nombre="tilde" tam={20} /><span>{mensaje}</span></div>}
    </Pagina>
  );
}

function Resaltar({ texto, buscado }: { texto: string; buscado: string }): ReactNode {
  const b = plano(buscado);
  const i = b ? plano(texto).indexOf(b) : -1;
  if (i < 0) return texto;
  return <>{texto.slice(0, i)}<mark>{texto.slice(i, i + b.length)}</mark>{texto.slice(i + b.length)}</>;
}

// Un renglón de la tabla: la hora, el medio, qué se llevó («1 × Martillo…» o «3 productos» con los
// primeros nombres), quién o cómo pagó y el total. La anulada, tachada; la corregida, marcada.
function FilaDeVenta({ venta: v, buscado, elegida, alElegir }: { venta: VentaDelDia; buscado: string; elegida: boolean; alElegir: () => void }) {
  const anulada = v.estado === "anulada";
  const coincide = buscado.trim() ? v.items.find((i) => plano(i.descripcion).includes(plano(buscado))) : undefined;
  const una = coincide ?? (v.items.length === 1 ? v.items[0]! : null);
  const que = una
    ? <>{conUnidad(una.cantidad, una.unidad)} <Resaltar texto={nombreDeProducto(una.descripcion)} buscado={buscado} />{v.items.length > 1 ? <small> y {v.items.length - 1} más</small> : null}</>
    : <>{v.items.length} {t.productos.largo} <small>{v.items.map((i) => nombreDeProducto(i.descripcion).split(" ")[0]).join(", ")}</small></>;
  return (
    <button type="button" className={`vhc-fila ${anulada ? "anulada" : ""}`} data-elegida={elegida ? "si" : "no"} aria-pressed={elegida} tabIndex={elegida ? 0 : -1} onClick={alElegir} data-testid="venta-dia">
      <span className="hora">{hora(v.fecha)}</span>
      <IconoDeMedio medio={v.medio_pago} tam={16} conFondo />
      <span className="que">{que}</span>
      <span className="quien">{anulada ? <Pastilla tipo="mal" sinPunto>{t.anulada.largo}</Pastilla> : (v.correcciones ?? 0) > 0 ? <Pastilla tipo="alerta" sinPunto>{t.corregida.largo}</Pastilla> : v.cliente ? <Resaltar texto={v.cliente} buscado={buscado} /> : NOMBRE_DE_MEDIO[v.medio_pago as Medio]}</span>
      <span className="imp importe">{pesosCortos(v.total)}</span>
      <Icono nombre="derecha" tam={16} />
    </button>
  );
}

function Miniatura({ url }: { url: string | null }) {
  return <span className="miniatura">{url ? <img src={urlDeFoto(url) ?? ""} alt="" loading="lazy" /> : <Icono nombre="productos" tam={18} grosor={1.6} />}</span>;
}

// La venta elegida, a la derecha. Mirándola: sus productos, el total, «Corregir» y «Anular».
// Corrigiéndola: cada renglón con − + y su precio, el tacho, agregar un producto, el medio y el
// cliente; lo anterior tachado, la diferencia y cómo se resuelve (specs/019, E01 a E10).
function PanelDeVenta({ venta: v, anula, correccion: c, alCorregir, alAnular, alDescartar, alCambiar, alGuardar, alHoja, guardarRef }: {
  venta: VentaDelDia; anula: boolean; correccion: Correccion | null; alCorregir: () => void; alAnular: () => void; alDescartar: () => void;
  alCambiar: (c: Correccion) => void; alGuardar: (mensaje: string) => void; alHoja: (abierta: boolean) => void; guardarRef: React.MutableRefObject<() => void>;
}) {
  const anulada = v.estado === "anulada";
  const medio = v.medio_pago as Medio;
  const debe = medio === "cuenta_corriente" && !v.pagada_en && !anulada;
  const titulo = v.cliente ?? (v.items.length === 1 ? nombreDeProducto(v.items[0]!.descripcion) : `${v.items.length} ${t.productos.largo}`);
  const correcciones = v.correcciones ?? 0;
  return (
    <aside className={`vhc-venta ${c ? "corrigiendo" : ""}`} aria-label="La venta elegida" data-testid="venta-elegida">
      <div className="cab">
        <IconoDeMedio medio={c?.medio ?? medio} tam={20} conFondo />
        <div className="tit"><b>{titulo}</b><small>{hora(v.fecha)} · {NOMBRE_DE_MEDIO[medio]}</small></div>
        {anulada ? <Pastilla tipo="mal" sinPunto>{t.anulada.largo}</Pastilla> : debe ? <Pastilla tipo="alerta" sinPunto>{t.debe.largo}</Pastilla> : null}
      </div>
      {c ? <Corrigiendo venta={v} c={c} alCambiar={alCambiar} alDescartar={alDescartar} alGuardar={alGuardar} alHoja={alHoja} guardarRef={guardarRef} /> : <>
        <ul className="renglones" data-testid="detalle-venta">
          {v.items.map((i, n) => (
            <li key={i.id ?? n} className="rv">
              <Miniatura url={i.foto_url} />
              <span className="nom-det"><b>{nombreDeProducto(i.descripcion)}</b><small>{conUnidad(i.cantidad, i.unidad)} × {pesosCortos(i.precio_unitario)}</small></span>
              <span className="st importe">{pesosCortos(i.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="tot"><span>{t.columnaTotal.largo}</span><b className={`importe ${anulada ? "tachado" : ""}`}>{pesosCortos(v.total)}</b></div>
        {anulada ? <Aviso tipo="alerta">{t.anuladaDetalle.largo}</Aviso> : anula && (
          <div className="acciones">
            <Boton icono="editar" onClick={alCorregir} aria-keyshortcuts="E" data-testid="corregir">{t.corregir.largo} <kbd className="tecla">E</kbd></Boton>
            <Boton variante="peligro" icono="prohibido" onClick={alAnular} aria-keyshortcuts="Delete" data-testid="anular">{t.anular.largo} <kbd className="tecla">Supr</kbd></Boton>
          </div>
        )}
        <div className="rastro"><Icono nombre="reloj" tam={16} />{correcciones > 0 ? `Corregida ${correcciones === 1 ? "una vez" : `${correcciones} veces`}` : t.sinCorrecciones.largo}</div>
      </>}
    </aside>
  );
}

function Corrigiendo({ venta: v, c, alCambiar, alDescartar, alGuardar, alHoja, guardarRef }: {
  venta: VentaDelDia; c: Correccion; alCambiar: (c: Correccion) => void; alDescartar: () => void; alGuardar: (mensaje: string) => void; alHoja: (abierta: boolean) => void; guardarRef: React.MutableRefObject<() => void>;
}) {
  const { clientes } = useCatalogo();
  const { corregir, guardando } = useCorregirVenta();
  const [medioDif, setMedioDif] = useState<"efectivo" | "mercado_pago" | "tarjeta">("efectivo");
  const [error, setError] = useState<string | null>(null);
  const [eligiendoCliente, setEligiendoCliente] = useState(false);
  const [agregando, setAgregando] = useState(false);
  useEffect(() => { alHoja(eligiendoCliente); }, [eligiendoCliente, alHoja]);
  const total = totalCorregido(c);
  const diferencia = diferenciaDe(v, c);
  const resuelta = resolucionDe(c.medio, diferencia);
  const falta = porQueNoSeGuarda(v, c);
  const cliente = clientes.find((x) => x.id === c.clienteId);
  const renglon = (i: number, r: RenglonCorregido) => alCambiar({ ...c, renglones: c.renglones.map((x, j) => (j === i ? r : x)) });

  async function guardar() {
    if (falta || guardando) { if (falta) setError(falta); return; }
    setError(null);
    try {
      await corregir(v, aEntrada(v, c, medioDif));
      alGuardar(`${t.correccionGuardada.largo}${diferencia ? ` · ${signo(diferencia)}${resuelta === "cobrada" ? ` en ${NOMBRE_DE_MEDIO[medioDif].toLowerCase()}` : resuelta === "devuelta" ? " en efectivo" : " en la cuenta"}` : ""}`);
    } catch (e) {
      const estado = (e as { estado?: number }).estado;
      // Otra persona la corrigió mientras tanto (E28): se vuelve a cargar y se empieza con lo nuevo.
      if (estado === 409 && /mientras/i.test((e as Error).message)) { void ventasCambiaron(); alGuardar(t.ventaCambio.largo); return; }
      setError(fueSinConexion(e) ? t.sinConexionCorregir.largo : `${(e as Error).message}.`);
    }
  }
  guardarRef.current = () => { void guardar(); };

  return (
    <div className="corregir" data-testid="corrigiendo">
      <ul className="renglones">
        {c.renglones.map((r, i) => {
          const cambioCantidad = r.antes && r.antes.cantidad !== r.cantidad;
          const cambioPrecio = r.antes && r.antes.precio_unitario !== r.precio_unitario;
          const paso = Number.isInteger(r.cantidad) ? 1 : 0.5;
          return (
            <li key={r.id ?? `n${i}`} className="rv ed" data-testid="renglon-corregido">
              <Miniatura url={r.foto_url} />
              <span className="nom-det">
                <b>{nombreDeProducto(r.descripcion)}{!r.antes && <Pastilla tipo="ok" sinPunto>nuevo</Pastilla>}</b>
              </span>
              <span className="st importe">
                {(cambioCantidad || cambioPrecio) && <s className="viejo">{pesosCortos(subtotalCorregido({ cantidad: r.antes!.cantidad, precio_unitario: r.antes!.precio_unitario, margen_aplicado: r.margen_aplicado }))}</s>}
                {pesosCortos(subtotalCorregido(r))}
              </span>
                <span className="editar">
                  <span className={`vhc-cantidad ${cambioCantidad ? "cambio" : ""}`}>
                    <button type="button" aria-label={`Uno menos de ${r.descripcion}`} disabled={r.cantidad - paso < Math.max(r.devuelto, paso) - 1e-9} onClick={() => renglon(i, conCantidad(r, r.cantidad - paso))} data-testid="menos"><Icono nombre="menos" tam={16} /></button>
                    <span className="n" data-testid="cantidad">{numero(r.cantidad)}</span><span className="u" data-testid="unidad-cantidad">{abreviarUnidad(r.unidad || "unidad")}</span>
                    <button type="button" aria-label={`Uno más de ${r.descripcion}`} onClick={() => renglon(i, conCantidad(r, r.cantidad + paso))} data-testid="mas"><Icono nombre="mas" tam={16} /></button>
                  </span>
                  ×
                  <PrecioEditable valor={r.precio_unitario} cambio={Boolean(cambioPrecio)} etiqueta={`Precio de ${r.descripcion}`} alCambiar={(p) => renglon(i, conPrecio(r, p))} />
                  <button type="button" className="vhc-tacho" aria-label={`${t.quitarRenglon.largo} ${r.descripcion}`} title={r.devuelto > 0 ? "Ya volvió en parte por un cambio: no se puede quitar" : t.quitarRenglon.largo} disabled={r.devuelto > 0} onClick={() => alCambiar(quitar(c, i))} data-testid="quitar"><Icono nombre="basura" tam={16} /></button>
                </span>
            </li>
          );
        })}
        {c.quitados.map((r) => (
          <li key={`q${r.id}`} className="rv quitado" data-testid="renglon-quitado">
            <Miniatura url={r.foto_url} />
            <span className="nom-det"><s>{nombreDeProducto(r.descripcion)}</s><small>{conUnidad(r.antes!.cantidad, r.unidad)} × {pesosCortos(r.antes!.precio_unitario)} · quitado</small></span>
            <button type="button" className="enlace" onClick={() => alCambiar({ ...c, quitados: c.quitados.filter((x) => x !== r), renglones: [...c.renglones, r] })}>Volver a poner</button>
          </li>
        ))}
      </ul>
      {agregando ? <AgregarProducto alAgregar={(r) => { alCambiar({ ...c, renglones: [...c.renglones, r] }); setAgregando(false); }} alCerrar={() => setAgregando(false)} />
        : <button type="button" className="vhc-agregar" onClick={() => setAgregando(true)} data-testid="agregar-producto"><Icono nombre="mas" tam={16} />{t.agregarProducto.largo}</button>}
      <div className="vhc-medios-ed" role="radiogroup" aria-label="Medio de pago">
        {MEDIOS.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={c.medio === m} title={NOMBRE_DE_MEDIO[m]} className={`vhc-medio-ed medio-${m} ${c.medio === m ? "elegido" : ""}`}
            onClick={() => { alCambiar({ ...c, medio: m }); if (m === "cuenta_corriente" && !c.clienteId) setEligiendoCliente(true); }} data-testid={`medio-ed-${m}`}>
            <IconoDeMedio medio={m} tam={16} />{c.medio === m && <span>{NOMBRE_CORTO[m]}</span>}
          </button>
        ))}
        {c.medio === "cuenta_corriente" && <button type="button" className={`vhc-cliente-ed ${cliente ? "" : "falta"}`} onClick={() => setEligiendoCliente(true)} data-testid="cliente-ed"><Icono nombre="usuarios" tam={16} />{cliente?.nombre ?? (c.clienteId ? v.cliente : null) ?? t.eligeCliente.largo}</button>}
      </div>
      <div className="tot">
        <span>{t.columnaTotal.largo}</span>
        <span className="nuevo">
          {diferencia !== 0 && <s className="viejo">{pesosCortos(v.total)}</s>}
          <b className="importe" data-testid="total-corregido">{pesosCortos(total)}</b>
          {diferencia !== 0 && <Pastilla tipo="alerta" sinPunto><span data-testid="diferencia">{signo(diferencia)}</span></Pastilla>}
        </span>
      </div>
      <div className="vhc-resuelve" data-testid="como-se-resuelve">
        {resuelta === "cobrada" ? <>
          <span>{t.seCobraCon.largo}</span>
          <span className="vhc-medios-ed" role="radiogroup" aria-label="Con qué se cobra la diferencia">
            {(["efectivo", "mercado_pago", "tarjeta"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={medioDif === m} title={NOMBRE_DE_MEDIO[m]} className={`vhc-medio-ed medio-${m} ${medioDif === m ? "elegido" : ""}`} onClick={() => setMedioDif(m)} data-testid={`dif-${m}`}>
                <IconoDeMedio medio={m} tam={16} />{medioDif === m && <span>{NOMBRE_CORTO[m]}</span>}
              </button>
            ))}
          </span>
        </> : resuelta === "devuelta" ? <span>{t.seDevuelve.largo}: <b>{pesosCortos(-diferencia)}</b></span>
          : resuelta === "cuenta_corriente" && diferencia !== 0 ? <span>{diferencia > 0 ? t.subeLaDeuda.largo : t.bajaLaDeuda.largo}{cliente ? ` ${cliente.nombre}` : ""}: <b>{pesosCortos(Math.abs(diferencia))}</b></span>
            : <span>{t.sinDiferencia.largo}</span>}
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <div className="acciones">
        <Boton className="vhc-fantasma" onClick={alDescartar} aria-keyshortcuts="Escape" title="Esc" data-testid="descartar">{t.descartar.largo}</Boton>
        <Boton variante="principal" disabled={guardando} aria-disabled={Boolean(falta)} className={falta ? "apagado" : ""} onClick={() => void guardar()} aria-keyshortcuts="Control+Enter" data-testid="guardar-correccion">
          {guardando ? "Guardando…" : <>{t.guardarCorreccion.corto}{diferencia ? ` · ${signo(diferencia)}` : ""} <kbd className="tecla">Ctrl Enter</kbd></>}
        </Boton>
      </div>
      {eligiendoCliente && <ElegirCliente clientes={clientes} elegido={c.clienteId ?? ""} alCerrar={() => setEligiendoCliente(false)} alElegir={(id) => { alCambiar({ ...c, clienteId: id || null }); setEligiendoCliente(false); }} />}
    </div>
  );
}

// El precio de un renglón: se toca y se escribe otro; Enter o salir lo deja, Esc lo deja como estaba.
function PrecioEditable({ valor, cambio, etiqueta, alCambiar }: { valor: number; cambio: boolean; etiqueta: string; alCambiar: (v: number) => void }) {
  const [texto, setTexto] = useState<string | null>(null);
  const listo = (ok: boolean) => { if (texto === null) return; const n = Number(texto.replace(/\./g, "").replace(",", ".")); if (ok && n > 0) alCambiar(n); setTexto(null); };
  if (texto !== null) {
    return (
      <span className="vhc-precio editando">$<input autoFocus onFocus={(e) => e.currentTarget.select()} inputMode="decimal" aria-label={etiqueta} value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={() => listo(true)} data-testid="precio-ed"
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); listo(true); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setTexto(null); } }} /></span>
    );
  }
  return <button type="button" className={`vhc-precio ${cambio ? "cambio" : ""}`} aria-label={`${etiqueta}: ${pesosCortos(valor)}. Tocá para cambiarlo`} onClick={() => setTexto(String(valor))} data-testid="precio">{pesosCortos(valor)}</button>;
}

// Agregar un producto a la venta que se corrige: se busca como en Vender y se elige.
function AgregarProducto({ alAgregar, alCerrar }: { alAgregar: (r: RenglonCorregido) => void; alCerrar: () => void }) {
  const { buscarProductos } = useCatalogo();
  const [texto, setTexto] = useState("");
  const [marcado, setMarcado] = useState(0);
  const hallados = texto.trim() ? buscarProductos(texto, 5) : [];
  const agregar = (i: number) => {
    const p = hallados[i];
    if (!p) return;
    const precio = precioDelProducto(p);
    if (precio.valor === null) return;
    alAgregar({ producto_id: p.id, descripcion: p.descripcion, foto_url: p.foto_url ?? null, unidad: p.unidad, cantidad: 1, precio_unitario: precio.valor, margen_aplicado: p.margen_elegido, costo_neto: precio.costo, devuelto: 0, antes: null });
  };
  return (
    <div className="vhc-agregando">
      <label className="vhc-buscar con-texto"><Icono nombre="buscar" tam={18} />
        <input autoFocus type="search" value={texto} placeholder="Escribí el producto" aria-label={t.agregarProducto.largo} data-testid="buscar-producto"
          onChange={(e) => { setTexto(e.target.value); setMarcado(0); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); alCerrar(); }
            else if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((m) => Math.min(m + 1, hallados.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((m) => Math.max(m - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); agregar(marcado); }
          }} />
      </label>
      {hallados.length > 0 && <ul className="vhc-hallados">
        {hallados.map((p, i) => {
          const precio = precioDelProducto(p).valor;
          return (
            <li key={p.id}><button type="button" className={i === marcado ? "marcado" : ""} disabled={precio === null} onClick={() => agregar(i)} data-testid="producto-para-agregar">
              <Miniatura url={p.foto_url ?? null} /><span>{nombreDeProducto(p.descripcion)}</span><b className="importe">{precio === null ? "sin precio" : pesosCortos(precio)}</b>
            </button></li>
          );
        })}
      </ul>}
    </div>
  );
}

// Lo vendido por hora: la barra de cada hora, con una raya punteada en lo que se vendió a esa hora el
// día anterior; la hora actual resaltada con su importe en un globo, y señalar otra muestra el suyo.
function PorHora({ barras, anterior, esHoy }: { barras: { hora: number; total: number }[]; anterior: Map<number, number>; esHoy: boolean }) {
  const [senalada, setSenalada] = useState<number | null>(null);
  const ahora = esHoy ? new Date().getHours() : null;
  const max = Math.max(1, ...barras.map((b) => b.total), ...barras.map((b) => anterior.get(b.hora) ?? 0));
  const conGlobo = senalada ?? (ahora !== null && barras.some((b) => b.hora === ahora && b.total > 0) ? ahora : null);
  return (
    <div className="vhc-por-hora">
      <div className="cab"><span className="vhc-etiqueta">{t.porHora.largo}</span><span className="ley"><span><em />{t.hoy.largo}</span><span><i />{t.ayer.largo}</span></span></div>
      <div className="vhc-horas" data-testid="grafico" onMouseLeave={() => setSenalada(null)}>
        {barras.map((b) => {
          const ayer = anterior.get(b.hora) ?? 0;
          return (
            <div key={b.hora} className={`h ${b.total === 0 ? "sin" : ""} ${b.hora === ahora ? "ahora" : ""}`} data-testid="barra" role="img" aria-label={`${b.hora} h: ${pesosCortos(b.total)}`}
              onMouseEnter={() => setSenalada(b.hora)}>
              <div className="col">
                <b style={{ height: b.total ? `${(b.total / max) * 100}%` : undefined }} />
                {ayer > 0 && <i className="ayer" style={{ bottom: `${(ayer / max) * 100}%` }} />}
                {conGlobo === b.hora && <span className="globo" style={{ bottom: `calc(${(b.total / max) * 100}% + 8px)` }}>{b.hora} h · {pesosCortos(b.total)}</span>}
              </div>
              <span>{b.hora}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// «Otro día», como la v2 y el celular (decisiones 141 y 144): hoy y los seis días anteriores, cada uno
// con lo vendido y cuántas ventas, el que se mira con un tilde; al final, el calendario propio.
function OtroDia({ dia, alElegir, alCerrar }: { dia: string; alElegir: (dia: string) => void; alCerrar: () => void }) {
  const t = TEXTOS.hoy;
  const [conCalendario, setConCalendario] = useState(false);
  const hoy = hoyLocal();
  const dias = [hoy];
  while (dias.length < 7) dias.push(diaAnterior(dias[dias.length - 1]!));
  return (
    <Hoja titulo={t.otroDia.largo} alCerrar={alCerrar} testId="hoja-otro-dia">
      <p className="vhc-otro-detalle">{t.queDiaMirar.largo}</p>
      {conCalendario ? <Calendario elegido={dia} hasta={hoy} hoy={hoy} alElegir={alElegir} /> : <>
        <div className="vhc-dias">{dias.map((d, i) => <DiaParaElegir key={d} dia={d} hoy={i === 0} ayer={i === 1} elegido={d === dia} alElegir={() => alElegir(d)} />)}</div>
        <button type="button" className="vhc-dia vhc-dia-calendario" onClick={() => setConCalendario(true)} data-testid="elegir-en-calendario">
          <Icono nombre="calendario" /><span>{t.elegirEnElCalendario.largo}<small>{t.masAtras.largo}</small></span><Icono nombre="derecha" />
        </button>
      </>}
    </Hoja>
  );
}

function DiaParaElegir({ dia, hoy, ayer, elegido, alElegir }: { dia: string; hoy: boolean; ayer: boolean; elegido: boolean; alElegir: () => void }) {
  const t = TEXTOS.hoy;
  const { datos } = useVentasDelDia(hoy ? null : dia);
  const resumen = datos ? resumenDelDia(datos.ventas) : null;
  const nombre = hoy ? `${t.hoy.largo}, ${nombreDelDia(dia)}` : ayer ? `${t.ayer.largo}, ${nombreDelDia(dia)}` : mayuscula(nombreDelDia(dia));
  const detalle = !resumen ? "…" : resumen.ventas === 0 ? t.sinVentas.largo : `${pesosCortos(resumen.total)} · ${resumen.ventas} ${resumen.ventas === 1 ? t.venta.largo : t.ventas.largo}${hoy ? ` ${t.hasta.largo.toLowerCase()} ${hora(new Date().toISOString())}` : ""}`;
  return (
    <button type="button" className={`vhc-dia ${elegido ? "elegido" : ""}`} aria-pressed={elegido} onClick={alElegir} data-testid={`otro-dia-${dia}`}>
      <Icono nombre="calendario" /><span>{nombre}<small>{detalle}</small></span>{elegido && <Icono nombre="tilde" />}
    </button>
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
