import { useMemo, useState } from "react";
import { cantidadContada, nombreDeMovimiento, productosConStock, useCorregirStock, useMovimientos, useStock, type Movimiento, type StockFila } from "../../negocio/deposito/inventario";
import { usePuede } from "../permisos";
import { MOTIVOS_DE_AJUSTE, TEXTOS } from "../textos";
import { FotoDeProducto } from "./FotoDeProducto";
import { ErrorApi } from "../../api";
import { useCatalogo } from "../../catalogo";
import { fecha, pesos } from "../../formato";
import { irA } from "../../rutas";
import { abreviarUnidad, conUnidad, enteras, unidadDe } from "../../unidades";
import { AvisoError, Buscador, Hoja, Toast } from "./componentes/base";
import { Escaner, hayCamara } from "../../plataforma/camara/Escaner";
import { IconoDeDeposito, type IconoDeDepositoNombre } from "../IconoDeDeposito";
import type { Producto } from "./pantallas/Productos";
import "./stock.css";

// Stock, como la v2 («La lista», decisión 148): tres números arriba (bajo el mínimo, sin stock y
// negativo), el buscador con escanear, los filtros en pastillas y cada producto con su stock en
// color. Tocar un producto abre su hoja: el stock grande, los movimientos con lo que queda
// después de cada uno y la corrección, que siempre lleva motivo (RF-53). Abajo, al pulgar,
// «Qué pedir». El dinero invertido, solo con «Ver el dinero invertido» (decisión 96).
type Filtro = "todos" | "revisar" | "cero" | "negativo";
const t = TEXTOS.stock;
const num = (n: number) => n.toLocaleString("es-AR");
const estadoDe = (n: number) => (n < 0 ? "error" : n === 0 ? "neutro" : "logro");

export function Stock() {
  const { catalogo, buscandoEnElServidor, buscarProductos, actualizarProducto } = useCatalogo();
  const { datos, porId, error: fallo } = useStock();
  const puede = usePuede();
  const veInvertido = puede("negocio.invertido");
  const pidePedidos = puede("deposito.pedidos");
  // El aviso se puede cerrar; vuelve si el próximo pedido falla de nuevo.
  const [cerrado, setCerrado] = useState<unknown>(null);
  const error = !fallo || fallo === cerrado ? null : fallo instanceof ErrorApi ? fallo.message : "Sin conexión con el servidor.";
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState(false);

  const cuenta = useMemo(() => {
    const filas = datos?.productos ?? [];
    const negativos = filas.filter((f) => Number(f.stock) < 0).length;
    const enCero = filas.filter((f) => Number(f.stock) === 0).length;
    return { total: filas.length, negativos, enCero };
  }, [datos]);

  const filas = useMemo(() => {
    let base = consulta.trim() ? buscarProductos(consulta, 100) : productosConStock(catalogo, porId);
    const stock = (p: Producto) => Number(porId.get(p.id)?.stock ?? 0);
    if (filtro === "revisar") base = base.filter((p) => stock(p) <= 0);
    if (filtro === "cero") base = base.filter((p) => stock(p) === 0);
    if (filtro === "negativo") base = base.filter((p) => stock(p) < 0);
    return base.slice(0, 100);
  }, [catalogo, consulta, buscarProductos, porId, filtro]);

  const elegir = (f: Filtro) => setFiltro(filtro === f ? "todos" : f);
  const resumen = (valor: Filtro | null, clase: string, icono: IconoDeDepositoNombre, rotulo: string, cifra: string, testId: string) => {
    const contenido = <><span className="st-et"><IconoDeDeposito nombre={icono} tam={16} />{rotulo}</span><span className="st-va">{cifra}</span></>;
    return valor
      ? <button type="button" className={`st-res ${clase}`} aria-pressed={filtro === valor} onClick={() => elegir(valor)} data-testid={testId}>{contenido}</button>
      : <div className={`st-res ${clase}`} data-testid={testId}>{contenido}</div>;
  };
  const productoAbierto = abierto ? catalogo.find((p) => p.id === abierto) ?? filas.find((p) => p.id === abierto) ?? null : null;

  return (
    <div className="st">
      <AvisoError texto={error} alCerrar={() => setCerrado(fallo)} />
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      <div className="st-resumenes">
        {resumen(null, "urgente", "trending-down", t.bajoElMinimo.corto, "—", "bajo-el-minimo")}
        {resumen("cero", "neutro", "package-minus", t.sinStock.corto, num(cuenta.enCero), "sin-stock")}
        {resumen("negativo", "error", "circle-alert", t.negativo.corto, num(cuenta.negativos), "stock-negativo")}
      </div>
      {veInvertido && datos && (
        <div className="st-dinero" data-testid="dinero-invertido-stock"><span>{t.dineroInvertido.corto}</span><strong>{pesosEnteros(datos.valor_total)}</strong></div>
      )}
      <div className="st-buscar">
        <Buscador chico valor={consulta} alCambiar={(v) => { setConsulta(v); setAbierto(null); }} placeholder={t.buscar.corto} alEscanear={hayCamara() ? () => setEscaneando(true) : undefined} />
      </div>
      {escaneando && <Escaner alDetectar={(codigo) => { setEscaneando(false); setConsulta(codigo); setAbierto(null); }} alCerrar={() => setEscaneando(false)} />}
      <div className="st-chips" role="group" aria-label="Qué productos mostrar">
        <button type="button" className={`st-chip ${filtro === "revisar" ? "elegido" : ""}`} aria-pressed={filtro === "revisar"} onClick={() => setFiltro("revisar")} data-testid="filtro-revisar">{t.paraRevisar.corto} {num(cuenta.enCero + cuenta.negativos)}</button>
        <button type="button" className={`st-chip ${filtro === "todos" ? "elegido" : ""}`} aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")} data-testid="filtro-todos">{t.todos.corto} {num(cuenta.total)}</button>
        <button type="button" className="st-chip" disabled data-testid="filtro-sin-codigo"><IconoDeDeposito nombre="barcode" tam={16} />{t.sinCodigo.corto} —</button>
      </div>

      <ul className="st-lista" data-testid="tabla-stock">
        {filas.map((p) => {
          const n = Number(porId.get(p.id)?.stock ?? 0);
          return (
            <li key={p.id} className="st-r" data-testid="fila-stock">
              <FotoDeProducto producto={p} alCambiar={(f) => { actualizarProducto(p.id, { foto_url: f }).catch(() => undefined); }} />
              <button type="button" className="st-r-boton" onClick={() => setAbierto(p.id)} data-testid="stock" aria-haspopup="dialog">
                <span className="st-r-texto"><span className="st-t">{p.descripcion}</span><span className="st-d">{[p.marca, p.proveedor].filter(Boolean).join(" · ") || "Sin marca"}</span></span>
                <span className={`st-dato ${estadoDe(n)}`}><span className="st-et">Stock</span><span className="st-va">{conUnidad(n, p.unidad).replace("-", "−")}</span></span>
              </button>
            </li>
          );
        })}
      </ul>
      {consulta.trim() && filas.length === 0 && !buscandoEnElServidor && <div className="aviso-suave">Nada con "{consulta}".</div>}
      {!consulta.trim() && filtro !== "todos" && filas.length === 0 && <div className="aviso-suave">Con este filtro no queda ningún producto.</div>}

      {pidePedidos && (
        <div className="st-pedir">
          <span className="st-pedir-txt"><b>— {t.paraPedir.corto}</b>{t.aProveedores.corto}</span>
          <button type="button" className="st-pedir-boton" onClick={() => irA("deposito/pedidos")} data-testid="que-pedir"><IconoDeDeposito nombre="truck" />{t.quePedir.corto}</button>
        </div>
      )}

      {productoAbierto && (
        <HojaDeStock producto={productoAbierto} fila={porId.get(productoAbierto.id) ?? null} alCerrar={() => setAbierto(null)} alAjustar={(m) => { setMensaje(m); setAbierto(null); }} />
      )}
    </div>
  );
}

const ICONO_DEL_MOVIMIENTO: Record<string, { icono: IconoDeDepositoNombre; clase: string }> = {
  Venta: { icono: "shopping-cart", clase: "" }, Compra: { icono: "truck", clase: "compra" }, Ajuste: { icono: "square-pen", clase: "ajuste" }, Conteo: { icono: "clipboard-list", clase: "ajuste" },
};

// La hoja de un producto: su stock, los movimientos que lo explican y la corrección.
function HojaDeStock({ producto: p, fila, alCerrar, alAjustar }: { producto: Producto; fila: StockFila | null; alCerrar: () => void; alAjustar: (mensaje: string) => void }) {
  const puede = usePuede();
  const corrige = puede("deposito.stock");
  const veInvertido = puede("negocio.invertido");
  const cantidad = fila ? Number(fila.stock) : 0;
  const { movimientos: traidos, error: sinMovimientos } = useMovimientos(p.id);
  const movimientos = traidos ?? (sinMovimientos ? [] : null);
  const { faltaEn, corregir, guardando } = useCorregirStock(p);
  const [real, setReal] = useState(String(cantidad).replace(".", ","));
  const [motivo, setMotivo] = useState("");
  const [otro, setOtro] = useState(false);
  const [todos, setTodos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unidad = abreviarUnidad(p.unidad);

  async function guardar() {
    const falta = faltaEn(real, motivo);
    if (falta?.real) { setError(TEXTOS.inventario.faltaCuantasHay.corto); return; }
    // El motivo es obligatorio, igual que en la computadora (RF-53).
    if (falta?.motivo) { setError(TEXTOS.inventario.faltaElMotivo.corto); return; }
    try {
      const { hay, encolado } = await corregir(real, motivo);
      const dif = hay - cantidad;
      alAjustar(encolado ? `Quedó en ${conUnidad(hay, p.unidad)}. Se manda al volver internet.` : dif === 0 ? "Sin diferencia: el stock ya decía eso." : `Stock corregido a ${num(hay)} ${unidad} (${dif > 0 ? "+" : ""}${num(dif)} ${unidad}).`);
    } catch (e) { setError((e as Error).message); }
  }
  const hay = cantidadContada(real, p);
  const valida = !Number.isNaN(hay);
  const sumar = (d: number) => { setReal(String(Math.max(0, (valida ? hay : cantidad) + d)).replace(".", ",")); setError(null); };
  const conSaldo = useMemo(() => {
    let queda = cantidad;
    return (movimientos ?? []).map((m) => { const r = { m, queda }; queda -= Number(m.cantidad); return r; });
  }, [movimientos, cantidad]);
  const valor = Number(fila?.valor ?? 0);

  return (
    <Hoja titulo={p.descripcion} alCerrar={alCerrar} testId="detalle-stock" clase="st-hoja">
      <p className="st-hoja-quien">{[p.marca, fila?.proveedor ?? p.proveedor].filter(Boolean).join(" · ") || "Sin marca ni proveedor"}</p>
      <div className="st-saldo">
        <span className={`st-total ${cantidad < 0 ? "negativo" : ""}`}>{cantidad < 0 ? "−" : ""}{num(Math.abs(cantidad))}<small>{unidad}</small></span>
        <span className="st-cuenta">{movimientos ? <>Es la suma de sus <b>{movimientos.length} {movimientos.length === 1 ? "movimiento" : "movimientos"}</b></> : "Es la suma de sus movimientos"}<br />
          Mínimo <b>—</b>{veInvertido && <> · vale <b data-testid="valor-stock">{fila?.costo_neto == null || valor <= 0 ? "—" : pesosEnteros(valor)}</b></>}</span>
      </div>
      <div className="st-movs-cab"><b>Movimientos</b><span>queda</span></div>
      {movimientos === null ? <small>Cargando…</small> : movimientos.length === 0 ? <small>Sin movimientos: su stock es cero.</small> : (
        <ul className="st-movs" data-testid="movimientos">
          {(todos ? conSaldo : conSaldo.slice(0, 4)).map(({ m, queda }) => <Renglon key={m.id} m={m} queda={queda} />)}
          {conSaldo.length > 4 && <li><button type="button" className="st-mas-movs" onClick={() => setTodos((x) => !x)}>{todos ? "Ver solo los últimos" : `Ver ${conSaldo.length - 4} más`}</button></li>}
        </ul>
      )}
      {corrige && (
        <div className="st-corregir" data-testid="correccion">
          <div className="st-fila-c">
            <span className="st-et-c">¿Cuántas hay?</span>
            <span className="st-cantidad">
              <button type="button" onClick={() => sumar(-1)} aria-label="Una menos"><IconoDeDeposito nombre="minus" /></button>
              <input inputMode={enteras(unidadDe(p)) ? "numeric" : "decimal"} value={real} onFocus={(e) => e.target.select()} onChange={(e) => { setReal(e.target.value); setError(null); }} onKeyDown={(e) => { if (e.key === "Enter") void guardar(); }} aria-label="Cuántas hay" data-testid="cantidad-real" />
              <button type="button" onClick={() => sumar(1)} aria-label="Una más"><IconoDeDeposito nombre="plus" /></button>
            </span>
          </div>
          <p className="st-vista">{!valida ? <>El sistema dice <b>{num(cantidad)}</b></> : hay === cantidad ? "Coincide con el sistema" : <>Había <b>{num(cantidad)}</b>, hay <b>{num(hay)}</b></>}</p>
          <div className="st-motivos" role="group" aria-label="Motivo">
            {MOTIVOS_DE_AJUSTE.map((m) => <button key={m} type="button" className={`st-chip ${motivo === m && !otro ? "elegido" : ""}`} aria-pressed={motivo === m && !otro} onClick={() => { setMotivo(m); setOtro(false); setError(null); }}>{m}</button>)}
            <button type="button" className={`st-chip ${otro ? "elegido" : ""}`} aria-pressed={otro} onClick={() => { setOtro(true); setMotivo(""); }}>Otro…</button>
          </div>
          {otro && <input className="campo" autoFocus placeholder="Escribí el motivo" value={motivo} onChange={(e) => { setMotivo(e.target.value); setError(null); }} data-testid="motivo" />}
          <AvisoError texto={error} />
          <button type="button" className="st-guardar" onClick={() => void guardar()} disabled={guardando} data-testid="guardar-ajuste">{guardando ? "Guardando…" : "Guardar corrección"}</button>
        </div>
      )}
    </Hoja>
  );
}

function Renglon({ m, queda }: { m: Movimiento; queda: number }) {
  const nombre = nombreDeMovimiento(m);
  const { icono, clase } = ICONO_DEL_MOVIMIENTO[nombre] ?? ICONO_DEL_MOVIMIENTO.Ajuste!;
  const c = Number(m.cantidad);
  return (
    <li className="st-mov">
      <span className={`st-mov-ic ${clase}`}><IconoDeDeposito nombre={icono} tam={16} /></span>
      <span className="st-mov-texto"><b>{nombre} · {fecha(m.fecha.slice(0, 10))}</b>{m.nota && <span>{m.nota}</span>}</span>
      <span className={`st-mov-q ${c > 0 ? "mas" : ""}`}>{c > 0 ? "+" : c < 0 ? "−" : ""}{num(Math.abs(c))}</span>
      <span className="st-mov-queda">{num(queda)}</span>
    </li>
  );
}

const pesosEnteros = (n: number) => pesos(Math.round(n)).replace(/,00$/, "");
