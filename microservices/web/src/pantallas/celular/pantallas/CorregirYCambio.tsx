import { useEffect, useState } from "react";
import { Hoja, Icono, AvisoError } from "../componentes/base";
import { Icono as IconoC } from "../../compu/base/ui";
import { IconoDeMedio } from "../../IconoDeMedio";
import { TEXTOS } from "../../textos";
import { ElegirCliente } from "../Vender";
import { MEDIOS, NOMBRE_DE_MEDIO, type Medio } from "../../../negocio/ventas/venta";
import { fueSinConexion, type VentaDelDia } from "../../../negocio/ventas/ventas-del-dia";
import { aEntrada, conCantidad, conPrecio, diferenciaDe, porQueNoSeGuarda, quitar, resolucionDe, subtotalCorregido, totalCorregido, useCorregirVenta, type Correccion, type RenglonCorregido } from "../../../negocio/ventas/correccion";
import { aEntradaDeCambio, diferenciaDelCambio, paraVolver, paraVolverDeLaBusqueda, resolucionDelCambio, useRegistrarCambio, useVentasParaCambio, valorQueVuelve, type ParaVolver, type SeLleva, type VentaParaCambio, type Vuelve } from "../../../negocio/ventas/cambio";
import { precioDelProducto } from "../../../negocio/catalogo/precio";
import { pedirClientes, useCatalogo } from "../../../catalogo";
import { nombreDeProducto, pesosCortos } from "../../../formato";
import { urlDeFoto } from "../../../api";
import { abreviarUnidad, conUnidad } from "../../../unidades";

// Corregir y cambiar una venta en el celular (specs/019, decisiones 124 y 135), como la v2: corregir
// edita la venta en su hoja, con lo de antes tachado; el cambio (o la devolución, si no se lleva
// nada) abre su propia hoja.

const t = TEXTOS.hoy;
const signo = (n: number) => `${n > 0 ? "+" : "−"}${pesosCortos(Math.abs(n))}`;
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" });
const numero = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 3 });
const COBROS = ["efectivo", "mercado_pago", "tarjeta"] as const;
type Cobro = (typeof COBROS)[number];
const NOMBRE_CORTO: Record<Medio, string> = { efectivo: "Efectivo", mercado_pago: "M. Pago", tarjeta: "Tarjeta", cuenta_corriente: "Cta. cte." };

function Foto({ url }: { url: string | null }) {
  return <span className="cc-foto">{urlDeFoto(url) ? <img src={urlDeFoto(url)!} alt="" /> : <Icono nombre="imagen" tam={18} />}</span>;
}

// La fila de pastillas de los medios, como en Vender (decisión 142).
function Medios<M extends Medio>({ medios, elegido, alElegir, etiqueta, prefijo }: { medios: readonly M[]; elegido: M; alElegir: (m: M) => void; etiqueta: string; prefijo: string }) {
  return (
    <div className="vm-medios-fila" role="radiogroup" aria-label={etiqueta}>
      {medios.map((m) => (
        <button key={m} type="button" role="radio" aria-checked={elegido === m} aria-label={NOMBRE_DE_MEDIO[m]} className={`vm-mp medio-${m} ${elegido === m ? "elegido" : ""}`} onClick={() => alElegir(m)} data-testid={`${prefijo}-${m}`}>
          <IconoDeMedio medio={m} tam={18} />{elegido === m && <span>{NOMBRE_CORTO[m]}</span>}
        </button>
      ))}
    </div>
  );
}

// Un producto del catálogo para sumar (al corregir o en lo que se lleva), buscado como en Vender.
function SumarProducto({ alSumar, etiqueta }: { alSumar: (p: SeLleva) => void; etiqueta: string }) {
  const { buscarProductos } = useCatalogo();
  const [texto, setTexto] = useState("");
  const hallados = texto.trim() ? buscarProductos(texto, 5) : [];
  return (
    <div className="cc-sumar">
      <label className="hoy-buscar-caja"><Icono nombre="buscar" tam={20} />
        <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Producto, código o marca" aria-label={etiqueta} data-testid="buscar-producto" />
      </label>
      {hallados.map((p) => {
        const precio = precioDelProducto(p);
        return (
          <button key={p.id} type="button" className="cc-renglon cc-hallado" disabled={precio.valor === null} data-testid="producto-para-sumar"
            onClick={() => { alSumar({ producto_id: p.id, descripcion: p.descripcion, foto_url: p.foto_url ?? null, unidad: p.unidad, cantidad: 1, precio_unitario: precio.valor!, margen_aplicado: p.margen_elegido, costo_neto: precio.costo }); setTexto(""); }}>
            <Foto url={p.foto_url ?? null} /><span className="cc-nom"><b>{nombreDeProducto(p.descripcion)}</b><small>{p.marca ?? ""}</small></span>
            <strong className="importe">{precio.valor === null ? "Sin precio" : `+${pesosCortos(precio.valor)}`}</strong>
          </button>
        );
      })}
    </div>
  );
}

// − cantidad +, con un paso de 1 (o de 0,5 si es a granel) y un mínimo.
function MasMenos({ valor, unidad, min, max, alCambiar, etiqueta }: { valor: number; unidad?: string; min: number; max?: number; alCambiar: (v: number) => void; etiqueta: string }) {
  const paso = Number.isInteger(valor) && Number.isInteger(max ?? 1) ? 1 : 0.5;
  return (
    <span className="vhc-cantidad cc-cantidad">
      <button type="button" aria-label={`Menos ${etiqueta}`} disabled={valor - paso < min - 1e-9} onClick={() => alCambiar(Math.round((valor - paso) * 1000) / 1000)} data-testid="menos"><IconoC nombre="menos" tam={16} /></button>
      <span className="n" data-testid="cantidad">{numero(valor)}</span><span className="u" data-testid="unidad-cantidad">{abreviarUnidad(unidad || "unidad")}</span>
      <button type="button" aria-label={`Más ${etiqueta}`} disabled={max !== undefined && valor + paso > max + 1e-9} onClick={() => alCambiar(Math.round((valor + paso) * 1000) / 1000)} data-testid="mas"><IconoC nombre="mas" tam={16} /></button>
    </span>
  );
}

// ---------- Corregir, dentro de la hoja de la venta ----------

export function CorregirEnLaHoja({ venta: v, c, alCambiar, alGuardar, alDescartar }: { venta: VentaDelDia; c: Correccion; alCambiar: (c: Correccion) => void; alGuardar: (mensaje: string) => void; alDescartar: () => void }) {
  const { clientes } = useCatalogo();
  const { corregir, guardando } = useCorregirVenta();
  const [medioDif, setMedioDif] = useState<Cobro>("efectivo");
  const [error, setError] = useState<string | null>(null);
  const [eligiendoCliente, setEligiendoCliente] = useState(false);
  const [sumando, setSumando] = useState(false);
  useEffect(() => { pedirClientes(); }, []);
  const total = totalCorregido(c);
  const diferencia = diferenciaDe(v, c);
  const resuelta = resolucionDe(c.medio, diferencia);
  const falta = porQueNoSeGuarda(v, c);
  const cliente = clientes.find((x) => x.id === c.clienteId);
  const renglon = (i: number, r: RenglonCorregido) => alCambiar({ ...c, renglones: c.renglones.map((x, j) => (j === i ? r : x)) });

  async function guardar() {
    if (falta) { setError(falta); return; }
    setError(null);
    try {
      await corregir(v, aEntrada(v, c, medioDif));
      alGuardar(`${t.correccionGuardada.corto}${diferencia ? ` · ${signo(diferencia)}` : ""}`);
    } catch (e) {
      setError(fueSinConexion(e) ? t.sinConexionCorregir.corto : /mientras/i.test((e as Error).message) ? t.ventaCambio.corto : `${(e as Error).message}.`);
    }
  }
  return (
    <div className="cc-corregir" data-testid="corrigiendo">
      {c.renglones.map((r, i) => {
        const cambioCant = r.antes && r.antes.cantidad !== r.cantidad;
        const cambioPrecio = r.antes && r.antes.precio_unitario !== r.precio_unitario;
        return (
          <div key={r.id ?? `n${i}`} className="cc-renglon" data-testid="renglon-corregido">
            <Foto url={r.foto_url} />
            <span className="cc-nom"><b>{nombreDeProducto(r.descripcion)}</b>
              <span className="cc-ed">
                <MasMenos valor={r.cantidad} min={Math.max(r.devuelto, Number.isInteger(r.cantidad) ? 1 : 0.5)} alCambiar={(n) => renglon(i, conCantidad(r, n))} unidad={r.unidad} etiqueta={r.descripcion} />
                <PrecioTocable valor={r.precio_unitario} cambio={Boolean(cambioPrecio)} alCambiar={(p) => renglon(i, conPrecio(r, p))} etiqueta={`Precio de ${r.descripcion}`} />
                <button type="button" className="vhc-tacho" aria-label={`Quitar ${r.descripcion}`} disabled={r.devuelto > 0} onClick={() => alCambiar(quitar(c, i))} data-testid="quitar"><IconoC nombre="basura" tam={18} /></button>
              </span>
            </span>
            <span className="cc-sub importe">{(cambioCant || cambioPrecio) && <s className="cc-viejo">{pesosCortos(subtotalCorregido({ cantidad: r.antes!.cantidad, precio_unitario: r.antes!.precio_unitario, margen_aplicado: r.margen_aplicado }))}</s>}{pesosCortos(subtotalCorregido(r))}</span>
          </div>
        );
      })}
      {c.quitados.map((r) => (
        <div key={`q${r.id}`} className="cc-renglon quitado" data-testid="renglon-quitado">
          <Foto url={r.foto_url} /><span className="cc-nom"><s>{nombreDeProducto(r.descripcion)}</s><small>quitado</small></span>
          <button type="button" className="enlace" onClick={() => alCambiar({ ...c, quitados: c.quitados.filter((x) => x !== r), renglones: [...c.renglones, r] })}>Volver a poner</button>
        </div>
      ))}
      {sumando ? <SumarProducto etiqueta={t.agregarProducto.corto} alSumar={(p) => { alCambiar({ ...c, renglones: [...c.renglones, { ...p, devuelto: 0, antes: null }] }); setSumando(false); }} />
        : <button type="button" className="vhc-agregar" onClick={() => setSumando(true)} data-testid="agregar-producto"><IconoC nombre="mas" tam={16} />{t.agregarProducto.corto}</button>}
      <div className="cc-fila">
        <Medios medios={MEDIOS} elegido={c.medio} etiqueta="Medio de pago" prefijo="medio-ed" alElegir={(m) => { alCambiar({ ...c, medio: m }); if (m === "cuenta_corriente" && !c.clienteId) setEligiendoCliente(true); }} />
        {c.medio === "cuenta_corriente" && <button type="button" className={`vm-cliente ${cliente ? "elegido" : "falta"}`} onClick={() => setEligiendoCliente(true)} aria-label={cliente ? `Cliente: ${cliente.nombre}` : t.eligeCliente.corto} data-testid="cliente-ed"><Icono nombre="persona" tam={20} /></button>}
      </div>
      <div className="cc-total"><span>{t.columnaTotal.corto}</span><span>{diferencia !== 0 && <s className="cc-viejo">{pesosCortos(v.total)}</s>}<b className="importe" data-testid="total-corregido">{pesosCortos(total)}</b></span></div>
      <div className="cc-resuelve" data-testid="como-se-resuelve">
        {resuelta === "cobrada" ? <><span>{t.seCobraCon.corto}</span><Medios medios={COBROS} elegido={medioDif} alElegir={setMedioDif} etiqueta="Con qué se cobra la diferencia" prefijo="dif" /></>
          : resuelta === "devuelta" ? <span>{t.seDevuelve.corto}: <b>{pesosCortos(-diferencia)}</b></span>
            : resuelta === "cuenta_corriente" && diferencia !== 0 ? <span>{diferencia > 0 ? t.subeLaDeuda.corto : t.bajaLaDeuda.corto}{cliente ? ` ${cliente.nombre}` : ""}: <b>{pesosCortos(Math.abs(diferencia))}</b></span>
              : <span>{t.sinDiferencia.corto}</span>}
      </div>
      <AvisoError texto={error} />
      <div className="cc-botones">
        <button type="button" className="boton" onClick={alDescartar} data-testid="descartar">{t.descartar.corto}</button>
        <button type="button" className="boton cc-principal" disabled={guardando} onClick={() => void guardar()} data-testid="guardar-correccion">
          <span>{guardando ? "Guardando…" : t.guardarCorreccion.corto}</span>{diferencia !== 0 && !guardando && <span className="cc-dif" data-testid="diferencia">{signo(diferencia)}</span>}
        </button>
      </div>
      {eligiendoCliente && (
        <Hoja titulo={t.eligeCliente.corto} alCerrar={() => setEligiendoCliente(false)} testId="hoja-clientes">
          <ElegirCliente clientes={clientes} elegido={c.clienteId ?? ""} alElegir={(id) => { alCambiar({ ...c, clienteId: id || null }); setEligiendoCliente(false); }} />
        </Hoja>
      )}
    </div>
  );
}

// El precio de un renglón: se toca y se escribe otro.
function PrecioTocable({ valor, cambio, alCambiar, etiqueta }: { valor: number; cambio: boolean; alCambiar: (v: number) => void; etiqueta: string }) {
  const [texto, setTexto] = useState<string | null>(null);
  const listo = () => { const n = Number((texto ?? "").replace(/\./g, "").replace(",", ".")); if (n > 0) alCambiar(n); setTexto(null); };
  if (texto !== null) {
    return <span className="vhc-precio editando">$<input autoFocus inputMode="decimal" aria-label={etiqueta} value={texto} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setTexto(e.target.value)} onBlur={listo} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); listo(); } }} data-testid="precio-ed" /></span>;
  }
  return <button type="button" className={`vhc-precio ${cambio ? "cambio" : ""}`} aria-label={`${etiqueta}: ${pesosCortos(valor)}. Tocá para cambiarlo`} onClick={() => setTexto(String(valor))} data-testid="precio">{pesosCortos(valor)}</button>;
}

// ---------- El cambio (o la devolución), en su hoja ----------

// `venta`: la venta de la que vuelve (desde su hoja); sin venta, primero se busca por el producto (E11).
export function HojaDeCambio({ venta, alCerrar, alListo }: { venta: VentaDelDia | null; alCerrar: () => void; alListo: (mensaje: string) => void }) {
  const [original, setOriginal] = useState<{ id: string; fecha: string; medio: Medio; renglones: ParaVolver[] } | null>(
    venta ? { id: venta.id, fecha: venta.fecha, medio: venta.medio_pago as Medio, renglones: paraVolver(venta) } : null);
  const [buscado, setBuscado] = useState("");
  const halladas = useVentasParaCambio(original ? "" : buscado);
  const [vuelve, setVuelve] = useState<Vuelve[]>([]);
  const [lleva, setLleva] = useState<SeLleva[]>([]);
  const [medioDif, setMedioDif] = useState<Cobro>("efectivo");
  const [error, setError] = useState<string | null>(null);
  const { registrar, registrando } = useRegistrarCambio();
  const diferencia = diferenciaDelCambio(vuelve, lleva);
  const resuelto = original ? resolucionDelCambio(original.medio, diferencia) : "sin_diferencia";
  const elegir = (v: VentaParaCambio) => { setOriginal({ id: v.id, fecha: v.fecha, medio: v.medio_pago, renglones: paraVolverDeLaBusqueda(v) }); setVuelve([]); };
  const marca = (r: ParaVolver) => vuelve.find((x) => x.renglon.id === r.id);
  const cambiarVuelve = (r: ParaVolver, cambio: Partial<Vuelve> | null) =>
    setVuelve((vs) => (cambio === null ? vs.filter((x) => x.renglon.id !== r.id) : vs.some((x) => x.renglon.id === r.id) ? vs.map((x) => (x.renglon.id === r.id ? { ...x, ...cambio } : x)) : [...vs, { renglon: r, cantidad: r.porDevolver >= 1 ? 1 : r.porDevolver, fallado: false, ...cambio }]));

  async function confirmar() {
    if (!original || vuelve.length === 0) return;
    setError(null);
    try {
      await registrar(original.id, aEntradaDeCambio(vuelve, lleva, medioDif, original.medio));
      const que = lleva.length ? t.cambioRegistrado.corto : t.devolucionRegistrada.corto;
      alListo(`${que}${diferencia ? ` · ${diferencia > 0 ? `${signo(diferencia)} cobrados` : resuelto === "cuenta_corriente" ? `${signo(diferencia)} en la cuenta` : `${pesosCortos(-diferencia)} devueltos`}` : ""}`);
    } catch (e) { setError(fueSinConexion(e) ? t.sinConexionCambio.corto : `${(e as Error).message}.`); }
  }

  const textoDelBoton = diferencia > 0 && resuelto === "cobrado" ? `Cobrar ${pesosCortos(diferencia)}` : diferencia < 0 && resuelto === "devuelto" ? `Devolver ${pesosCortos(-diferencia)}` : lleva.length ? t.registrarElCambio.corto : "Registrar la devolución";
  return (
    <Hoja titulo={t.registrarCambio.largo} alCerrar={alCerrar} testId="hoja-cambio">
      <p className="hoy-hoja-detalle">Lo que vuelve se toma al precio que se pagó.</p>
      {!original ? (
        <>
          <label className="hoy-buscar-caja"><Icono nombre="buscar" tam={20} />
            <input type="search" autoFocus value={buscado} onChange={(e) => setBuscado(e.target.value)} placeholder="Producto que vuelve" aria-label={t.deQueVenta.corto} data-testid="buscar-venta-cambio" />
          </label>
          <p className="hoy-hoja-detalle">{t.deQueVenta.corto}</p>
          {halladas.ventas?.map((v) => (
            <button key={v.id} type="button" className="cc-renglon cc-venta" onClick={() => elegir(v)} data-testid="venta-para-cambio">
              <IconoDeMedio medio={v.medio_pago} tam={18} conFondo />
              <span className="cc-nom"><b>{v.cliente ?? v.items.map((i) => nombreDeProducto(i.descripcion)).join(", ")}</b><small>{fechaCorta(v.fecha)} · {hora(v.fecha)} · {NOMBRE_DE_MEDIO[v.medio_pago]}</small></span>
              <strong className="importe">{pesosCortos(v.total)}</strong>
            </button>
          ))}
          {buscado.trim().length >= 2 && halladas.ventas?.length === 0 && !halladas.buscando && <p className="detalle">Ninguna venta de los últimos 15 días con «{buscado.trim()}».</p>}
        </>
      ) : <>
        <div className="cc-titulo"><IconoC nombre="deshacer" tam={18} />{t.vuelve.corto}, de la venta del {fechaCorta(original.fecha)} · {hora(original.fecha)}
          {!venta && <button type="button" className="enlace" onClick={() => setOriginal(null)}>{t.otraVenta.corto}</button>}</div>
        {original.renglones.map((r) => {
          const m = marca(r);
          const nada = r.porDevolver <= 0;
          return (
            <div key={r.id} className={`cc-renglon cc-vuelve ${m ? "elegido" : ""}`} data-testid="renglon-que-vuelve">
              <button type="button" className="cc-marca" role="checkbox" aria-checked={Boolean(m)} disabled={nada} onClick={() => cambiarVuelve(r, m ? null : {})} aria-label={`Vuelve ${r.descripcion}`} data-testid="marcar-vuelve">
                {m && <Icono nombre="tilde" tam={16} grosor={3} />}
              </button>
              <Foto url={r.foto_url} />
              <span className="cc-nom"><b>{nombreDeProducto(r.descripcion)}</b>
                <small>{nada ? "Ya volvió todo" : `Se pagó ${pesosCortos(r.pagado)} c/u${r.porDevolver < r.vendido ? ` · quedan ${conUnidad(r.porDevolver, r.unidad)}` : ""}`}</small>
                {m && <span className="cc-ed">
                  <MasMenos valor={m.cantidad} min={Number.isInteger(m.cantidad) ? 1 : 0.5} max={r.porDevolver} unidad={r.unidad} alCambiar={(n) => cambiarVuelve(r, { cantidad: n })} etiqueta={r.descripcion} />
                  <label className="cc-fallado"><input type="checkbox" checked={m.fallado} onChange={(e) => cambiarVuelve(r, { fallado: e.target.checked })} data-testid="fallado" />{t.estaFallado.corto}</label>
                </span>}
              </span>
              {m && <strong className="importe cc-sub">−{pesosCortos(r.pagado * m.cantidad)}</strong>}
            </div>
          );
        })}
        <div className="cc-titulo"><Icono nombre="carrito" tam={18} />{t.seLleva.corto}</div>
        {lleva.map((l, i) => (
          <div key={i} className="cc-renglon" data-testid="renglon-que-se-lleva">
            <Foto url={l.foto_url} />
            <span className="cc-nom"><b>{nombreDeProducto(l.descripcion)}</b>
              <span className="cc-ed"><MasMenos valor={l.cantidad} min={Number.isInteger(l.cantidad) ? 1 : 0.5} alCambiar={(n) => setLleva(lleva.map((x, j) => (j === i ? { ...x, cantidad: n } : x)))} unidad={l.unidad} etiqueta={l.descripcion} />
                <button type="button" className="vhc-tacho" aria-label={`Sacar ${l.descripcion}`} onClick={() => setLleva(lleva.filter((_, j) => j !== i))}><IconoC nombre="basura" tam={18} /></button></span>
            </span>
            <strong className="importe cc-sub">+{pesosCortos(valorDe(l))}</strong>
          </div>
        ))}
        <SumarProducto etiqueta={t.seLleva.corto} alSumar={(p) => setLleva([...lleva, p])} />
        {lleva.length === 0 && <p className="hoy-hoja-detalle">{t.nadaQueSeLleva.corto}</p>}
        <div className="cc-difer" data-testid="diferencia-cambio">
          <div><small>{diferencia >= 0 ? t.aCobrar.corto : t.aDevolver.corto}</small><b className="importe">{vuelve.length ? pesosCortos(Math.abs(diferencia)) : "—"}</b>
            {resuelto === "cuenta_corriente" && diferencia !== 0 && <small>{diferencia > 0 ? t.subeLaDeuda.corto : t.bajaLaDeuda.corto}</small>}</div>
          {resuelto === "cobrado" && <Medios medios={COBROS} elegido={medioDif} alElegir={setMedioDif} etiqueta="Con qué se cobra la diferencia" prefijo="dif" />}
        </div>
        <p className="hoy-hoja-detalle cc-valores">Vuelve {pesosCortos(valorQueVuelve(vuelve))}{lleva.length ? ` · se lleva ${pesosCortos(lleva.reduce((s, l) => s + valorDe(l), 0))}` : ""}</p>
        <AvisoError texto={error} />
        <button type="button" className="boton cc-principal" disabled={registrando || vuelve.length === 0} onClick={() => void confirmar()} data-testid="confirmar-cambio">
          <Icono nombre="tilde" tam={20} />{registrando ? "Registrando…" : vuelve.length ? textoDelBoton : "Marcá lo que vuelve"}
        </button>
      </>}
    </Hoja>
  );
}
const valorDe = (l: SeLleva) => diferenciaDelCambio([], [l]);
