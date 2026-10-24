import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { conUnidad } from "../../negocio/catalogo";
import { usePuede } from "../permisos";
import { MOTIVOS_DE_AJUSTE, TEXTOS } from "../textos";
import { FotoDeProducto } from "./FotoDeProducto";
import { ErrorApi } from "../../datos/conexion";
import { useCatalogo } from "../../negocio/catalogo";
import { EVENTO_EMPAREJAMIENTO, puestoLocal } from "../../puesto";
import { escucharPuesto, pedirLector } from "../../codigos-del-celular";
import { useTeclasGlobales } from "../../plataforma/teclado/teclas";
import { cantidadContada, nombreDeMovimiento, productosConStock, useCorregirStock, useMovimientos, useStock, type Movimiento, type StockFila } from "../../negocio/deposito/inventario";
import { fecha, pesos } from "../../formato";
import { enteras, unidadDe } from "../../negocio/catalogo";
import { irA } from "./base/rutas";
import { Aviso, Boton, Buscador, Explicado, Hoja, Pagina, Progreso, Toast, Vacio, numero } from "./base/ui";
import { useEsCelular } from "./base/vista";
import { AlLadoDeLasPestanas } from "../AlLadoDeLasPestanas";
import { IconoDeDeposito, type IconoDeDepositoNombre } from "../IconoDeDeposito";
import { conSigno, mensajeDe, nombreUnidad, plural, useEnLinea, type Producto } from "./base/pantallas/deposito-comun";
import "./base/estilos/stock.css";

// Stock, como la v2 («Lista y cuenta del producto», decisión 148): arriba los números del depósito,
// a la izquierda la búsqueda, los filtros y los productos, y a la derecha, fijo, el elegido con su
// stock, los movimientos que lo explican (con lo que queda después de cada uno) y la corrección.
// El dinero invertido, solo con «Ver el dinero invertido» (decisión 96). Corregir pide cuántas hay y
// por qué, y no confirma: el ajuste queda a la vista entre los movimientos. Teclas: «/» busca,
// ↑ ↓ eligen, C va a «¿Cuántas hay?», Enter guarda y Esc cancela. En una ventana angosta, cada
// producto abre su cuenta encima.
type Filtro = "todos" | "revisar" | "negativo" | "con" | "cero";
type Columna = "producto" | "stock" | "ultimo";

const TOPE = 100;
const t = TEXTOS.stock;

export function Inventario() {
  const puedeEsto = usePuede();
  const corrige = puedeEsto("deposito.stock");
  const veInvertido = puedeEsto("negocio.invertido");
  const pidePedidos = puedeEsto("deposito.pedidos");
  const esCelular = useEsCelular();
  const enLinea = useEnLinea();
  const { catalogo, buscandoEnElServidor, error: errorCatalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const { datos, porId, delDispositivo, error: fallo, recargar: cargar } = useStock();
  const error = !fallo ? null : fallo instanceof ErrorApi ? `No se pudo traer el stock: ${fallo.message}` : "Sin conexión con el servidor y sin stock guardado en este dispositivo. Revisá internet y tocá «Reintentar».";
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [orden, setOrden] = useState<{ columna: Columna; sube: boolean } | null>(null);
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  // En la ventana angosta, la cuenta del producto que se abrió encima.
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  // Correcciones guardadas sin conexión: se ven en la fila hasta que el servidor las confirma.
  const [porEnviar, setPorEnviar] = useState<Map<string, number>>(new Map());
  const caja = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLElement>(null);

  // Cuando el servidor vuelve a contestar, lo que estaba por enviarse ya está en lo que trae.
  useEffect(() => { if (datos && !delDispositivo) setPorEnviar(new Map()); }, [datos, delDispositivo]);
  useEffect(() => { if (enLinea && delDispositivo) cargar(); }, [enLinea, delDispositivo, cargar]);

  // Lo que lee el celular vinculado queda escrito en la búsqueda (decisión 59).
  const [emparejado, setEmparejado] = useState(() => puestoLocal()?.id ?? null);
  useEffect(() => { const mirar = () => setEmparejado(puestoLocal()?.id ?? null); window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar); return () => window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar); }, []);
  useEffect(() => { if (!emparejado || esCelular) return; return escucharPuesto(emparejado, (codigo) => setConsulta(codigo)); }, [emparejado, esCelular]);
  const [lectorPedido, setLectorPedido] = useState<boolean | null>(null);
  useEffect(() => { if (lectorPedido === null) return; const x = setTimeout(() => setLectorPedido(null), 20000); return () => clearTimeout(x); }, [lectorPedido]);

  const cantidadDe = useCallback((id: string) => porEnviar.get(id) ?? Number(porId.get(id)?.stock ?? 0), [porEnviar, porId]);

  const cuenta = useMemo(() => {
    const filas = datos?.productos ?? [];
    const con = filas.filter((f) => Number(f.stock) > 0).length;
    const negativos = filas.filter((f) => Number(f.stock) < 0).length;
    return { total: filas.length, con, negativos, enCero: filas.length - con - negativos };
  }, [datos]);

  const { filas, hayMas } = useMemo(() => {
    let base = consulta.trim() ? buscarProductos(consulta, TOPE) : productosConStock(catalogo, porId);
    if (filtro === "con") base = base.filter((p) => cantidadDe(p.id) > 0);
    if (filtro === "cero") base = base.filter((p) => cantidadDe(p.id) === 0);
    if (filtro === "negativo") base = base.filter((p) => cantidadDe(p.id) < 0);
    if (filtro === "revisar") base = base.filter((p) => cantidadDe(p.id) <= 0);
    if (orden) {
      const clave = (p: Producto): string | number => orden.columna === "producto" ? p.descripcion.toLocaleLowerCase("es") : orden.columna === "stock" ? cantidadDe(p.id) : (porId.get(p.id)?.ultimo_movimiento ?? "");
      base = [...base].sort((a, b) => { const x = clave(a), y = clave(b); return (x < y ? -1 : x > y ? 1 : 0) * (orden.sube ? 1 : -1); });
    }
    return { filas: base.slice(0, TOPE), hayMas: base.length > TOPE };
  }, [catalogo, consulta, buscarProductos, porId, filtro, orden, cantidadDe]);

  // El elegido es el primero de la lista hasta que se elige otro, y sigue a la búsqueda.
  const marcada = Math.max(0, filas.findIndex((p) => p.id === elegidoId));
  const elegido = filas[marcada] ?? null;
  useEffect(() => { setElegidoId(null); }, [consulta, filtro]);
  useEffect(() => { document.querySelector(".sv-filas [aria-selected='true']")?.scrollIntoView?.({ block: "nearest" }); }, [marcada]);

  function corregido(p: Producto, habia: number, hay: number, encolado: boolean) {
    setAbiertoId(null);
    const dif = hay - habia;
    if (encolado) { setPorEnviar((m) => new Map(m).set(p.id, hay)); setMensaje(`${p.descripcion}: quedó en ${conUnidad(hay, p.unidad)}. Guardado en este dispositivo, se manda al volver internet.`); return; }
    setMensaje(dif === 0 ? `${p.descripcion}: sin diferencia, el stock ya decía ${conUnidad(hay, p.unidad)}.` : `${p.descripcion}: había ${conUnidad(habia, p.unidad)}, hay ${conUnidad(hay, p.unidad)} (${conSigno(dif)} ${nombreUnidad(p.unidad)}).`);
  }

  const teclas = useCallback((e: globalThis.KeyboardEvent) => {
    if (abiertoId || document.querySelector("dialog[open]")) return;
    const destino = e.target as HTMLElement;
    const enPanel = Boolean(panel.current?.contains(destino));
    const escribiendo = destino.tagName === "INPUT" || destino.tagName === "TEXTAREA";
    if (e.key === "/" && !escribiendo) { e.preventDefault(); caja.current?.focus(); return; }
    if ((e.key === "c" || e.key === "C") && !escribiendo && !e.ctrlKey && !e.metaKey && !e.altKey && corrige && elegido) { e.preventDefault(); panel.current?.querySelector<HTMLInputElement>("[data-testid='cantidad-real']")?.focus(); return; }
    if (enPanel) return;
    if (e.key === "ArrowDown" && filas.length) { e.preventDefault(); setElegidoId(filas[Math.min(marcada + 1, filas.length - 1)]!.id); }
    else if (e.key === "ArrowUp" && filas.length) {
      e.preventDefault();
      // Arriba del primer producto están las pestañas (decisión 82), salvo con el cursor en la
      // búsqueda: las flechas nunca lo sacan de la caja (decisiones 130 y 133).
      if (marcada === 0) { if (!escribiendo) document.querySelector<HTMLElement>(".cuerpo .pestanas button[aria-current='page']")?.focus(); }
      else setElegidoId(filas[marcada - 1]!.id);
    }
    else if (e.key === "Enter" && destino === caja.current && elegido) { e.preventDefault(); if (esCelular) setAbiertoId(elegido.id); else panel.current?.querySelector<HTMLInputElement>("[data-testid='cantidad-real']")?.focus(); }
    else if (e.key === "Escape" && destino === caja.current && consulta) { e.preventDefault(); setConsulta(""); }
  }, [abiertoId, filas, marcada, elegido, corrige, consulta, esCelular]);
  useTeclasGlobales(teclas, caja.current);

  const productoAbierto = abiertoId ? (catalogo?.find((p) => p.id === abiertoId) ?? null) : null;
  const sinNada = datos !== null && datos.productos.length === 0 && !consulta.trim();
  const esperando = datos === null && !error && !errorCatalogo;
  const ordenar = (columna: Columna) => setOrden((o) => (o?.columna === columna ? (o.sube === (columna === "producto") ? { columna, sube: !o.sube } : null) : { columna, sube: columna === "producto" }));

  const resumen = (valor: Filtro | null, clase: string, icono: IconoDeDepositoNombre, rotulo: string, cifra: ReactNode, testId: string) => {
    const contenido = <><span className="sv-ico"><IconoDeDeposito nombre={icono} /></span><span><span className="sv-et">{rotulo}</span><span className="sv-va">{cifra}</span></span></>;
    return valor
      ? <button type="button" className={`sv-resumen ${clase}`} aria-pressed={filtro === valor} onClick={() => setFiltro(filtro === valor ? "todos" : valor)} data-testid={testId}>{contenido}</button>
      : <div className={`sv-resumen ${clase}`} data-testid={testId}>{contenido}</div>;
  };
  const chip = (valor: Filtro, nombre: string, n: number, punto?: string) => (
    <button type="button" className={`sv-chip ${filtro === valor ? "elegido" : ""}`} aria-pressed={filtro === valor} onClick={() => setFiltro(valor)} data-testid={`filtro-${valor}`}>
      {punto && <span className="sv-punto" style={{ background: punto }} />}{nombre} <span className="sv-n">{numero(n)}</span>
    </button>
  );
  const cabezaOrden = (columna: Columna, nombre: string) => (
    <button type="button" className={`sv-orden ${orden?.columna === columna ? "activo" : ""}`} onClick={() => ordenar(columna)} aria-pressed={orden?.columna === columna}>
      {nombre}{orden?.columna === columna ? (orden.sube ? " ↑" : " ↓") : ""}
    </button>
  );

  return (
    <Pagina titulo="Inventario" testId="pantalla-stock" className="stock-v2"
      acciones={<AlLadoDeLasPestanas>
        <div className="sv-acciones">
          <Boton tam="chico" disabled title={t.todaviaNo.largo} data-testid="exportar-excel"><IconoDeDeposito nombre="file-spreadsheet" tam={16} />{t.exportar.largo}</Boton>
          <Boton tam="chico" disabled title={t.todaviaNo.largo} data-testid="etiquetas"><IconoDeDeposito nombre="printer" tam={16} />{t.etiquetas.largo} <kbd className="tecla">Alt E</kbd></Boton>
          {pidePedidos && <Boton tam="chico" variante="principal" className="sv-que-pedir" onClick={() => irA("pedidos")} data-testid="que-pedir"><IconoDeDeposito nombre="truck" tam={16} />{t.quePedir.largo} · — </Boton>}
        </div>
      </AlLadoDeLasPestanas>}>
      <Aviso tipo="error" accion={<Boton tam="chico" icono="repetir" onClick={cargar}>Reintentar</Boton>}>{error}</Aviso>
      <Aviso tipo="error">{!error ? errorCatalogo : null}</Aviso>
      <Aviso tipo="alerta" testId="sin-conexion">{!enLinea || delDispositivo ? "Sin conexión: ves el último stock que bajó este dispositivo. Si corregís un stock queda guardado acá y se manda solo al volver internet." : null}</Aviso>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />

      {esperando && <Progreso texto="Trayendo el stock…" />}

      {datos && !sinNada && (
        <div className={`sv-resumenes ${veInvertido ? "" : "sin-dinero"}`} data-testid="valorizacion">
          {resumen("con", "logro", "package-check", t.conStock.largo, numero(cuenta.con), "con-stock")}
          {resumen(null, "urgente", "trending-down", t.bajoElMinimo.largo, "—", "bajo-el-minimo")}
          {resumen("cero", "neutro", "package-minus", t.sinStock.largo, numero(cuenta.enCero), "sin-stock")}
          {resumen("negativo", cuenta.negativos ? "error" : "neutro", "circle-alert", t.negativo.largo, numero(cuenta.negativos), "stock-negativo")}
          {veInvertido && (
            <div className="sv-resumen dinero" data-testid="dinero-invertido-stock">
              <span className="sv-ico"><IconoDeDeposito nombre="coins" /></span>
              <span><span className="sv-et">{t.dineroInvertido.largo}</span>
                <span className="sv-va"><Explicado valor={pesosEnteros(datos.valor_total)} etiqueta="Dinero invertido" titulo="De dónde sale el dinero invertido" pasos={pasosDelInvertido(datos.por_proveedor, datos.valor_total)} /></span></span>
              <span className="sv-candado" title="Lo ve solo quien tiene el permiso «Ver el dinero invertido»"><IconoDeDeposito nombre="lock" tam={16} /></span>
            </div>
          )}
        </div>
      )}

      {sinNada && (
        <Vacio icono="stock" titulo="Todavía no hay stock cargado" accion={
          <div className="stock-primeros-pasos">
            <Boton variante="principal" icono="compras" onClick={() => irA("ingreso")}>Registrar un ingreso</Boton>
            <Boton icono="contar" onClick={() => irA("contar")}>Contar un sector</Boton>
          </div>
        }>El stock arranca en cero. Se carga registrando la mercadería que llega o contando lo que ya hay en cada estantería.</Vacio>
      )}

      {datos && !sinNada && (
        <div className="sv-cuerpo">
          <div className="sv-izq">
            <Buscador valor={consulta} alCambiar={setConsulta} placeholder={esCelular ? t.buscar.corto : t.buscar.largo} etiqueta="Buscar un producto" cajaRef={caja} autoFoco={!esCelular}
              extra={<>
                {!consulta && <kbd className="tecla sv-barra">/</kbd>}
                {!esCelular && emparejado && <Boton variante="marino" className="sv-celular" onClick={() => void pedirLector().then(setLectorPedido)} data-testid="pedir-lector"><IconoDeDeposito nombre="scan-barcode" />{t.conElCelular.largo}</Boton>}
              </>} />
            {lectorPedido !== null && <Aviso tipo={lectorPedido ? "info" : "alerta"}>{lectorPedido ? "Abrí Ferrebress en el celular y tocá «Abrir el lector»." : "No se pudo avisar al celular."}</Aviso>}
            <div className="sv-chips" role="group" aria-label="Qué productos mostrar">
              {chip("todos", t.todos.largo, cuenta.total)}
              {chip("revisar", t.paraRevisar.largo, cuenta.enCero + cuenta.negativos, "var(--p-urgente)")}
              {chip("negativo", t.negativo.corto, cuenta.negativos, "var(--p-error)")}
              <button type="button" className="sv-chip" disabled title={t.todaviaNo.largo} data-testid="filtro-sin-codigo"><IconoDeDeposito nombre="barcode" tam={16} />{t.sinCodigo.largo} <span className="sv-n">—</span></button>
              {(filtro === "con" || filtro === "cero") && chip(filtro, filtro === "con" ? t.conStock.largo : t.sinStock.largo, filtro === "con" ? cuenta.con : cuenta.enCero)}
            </div>

            {filas.length === 0 && !buscandoEnElServidor && (
              <Vacio icono="buscar" titulo={consulta.trim() ? `Nada con «${consulta.trim()}»` : "Ningún producto con este filtro"}
                accion={(consulta.trim() || filtro !== "todos") ? <Boton onClick={() => { setConsulta(""); setFiltro("todos"); caja.current?.focus(); }}>Ver todos</Boton> : undefined}>
                {consulta.trim() ? "Probá con otra palabra, con la marca o con el código del proveedor." : "Con este filtro no queda ningún producto."}
              </Vacio>
            )}

            {filas.length > 0 && (
              <>
                <p className="sv-cuenta"><span>{plural(filas.length, "producto", "productos")}{hayMas ? ` de más de ${TOPE}` : ""}</span><span className="sv-ordenes">Ordenar: {cabezaOrden("producto", "nombre")}{cabezaOrden("stock", "stock")}{cabezaOrden("ultimo", "último movimiento")}</span></p>
                <ul className="sv-filas" data-flechas-propias data-testid="tabla-stock">
                  {filas.map((p) => {
                    const n = cantidadDe(p.id);
                    return (
                      <li key={p.id} className={`sv-fila ${p.id === elegido?.id ? "foco" : ""}`} aria-selected={p.id === elegido?.id} data-testid="fila-stock"
                        onClick={() => { setElegidoId(p.id); if (esCelular) setAbiertoId(p.id); }}>
                        <FotoDeProducto producto={p} alCambiar={(f) => { actualizarProducto(p.id, { foto_url: f }).catch(() => undefined); }} />
                        <span className="sv-texto">
                          <span className="sv-nombre">{p.descripcion}</span>
                          <span className="sv-detalle">{[p.marca, p.codigo_proveedor].filter(Boolean).join(" · ") || "Sin marca"}
                            {n < 0 && <span className="sv-pastilla error">{t.revisar.largo}</span>}
                            {porEnviar.has(p.id) && <span className="sv-pastilla urgente">Se manda al volver internet</span>}
                          </span>
                        </span>
                        <button type="button" className={`sv-dato ${estadoDe(n)}`} onClick={(e) => { e.stopPropagation(); setElegidoId(p.id); if (esCelular) setAbiertoId(p.id); }}
                          aria-label={`${conUnidad(n, p.unidad)}. Ver los movimientos de ${p.descripcion}`} data-testid="stock">
                          <span className="sv-et">Stock</span><span className="sv-va">{conUnidad(n, p.unidad).replace("-", "−")}</span>
                        </button>
                        <IconoDeDeposito nombre="chevron-right" className="sv-flecha" />
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {!esCelular && (elegido
            ? <CuentaDelProducto key={elegido.id} panelRef={panel} producto={catalogo.find((p) => p.id === elegido.id) ?? elegido} fila={porId.get(elegido.id) ?? null} cantidad={cantidadDe(elegido.id)} porEnviar={porEnviar.has(elegido.id)}
              alCorregir={(habia, hay, encolado) => corregido(elegido, habia, hay, encolado)} alTerminar={() => caja.current?.focus()} />
            : <aside className="sv-panel sv-sin-elegido detalle">Elegí un producto para ver su stock, sus movimientos y corregirlo.</aside>)}
        </div>
      )}

      {abiertoId && productoAbierto && (
        <Hoja ancha titulo={productoAbierto.descripcion} alCerrar={() => setAbiertoId(null)} testId="detalle-stock">
          <CuentaDelProducto producto={productoAbierto} fila={porId.get(productoAbierto.id) ?? null} cantidad={cantidadDe(productoAbierto.id)} porEnviar={porEnviar.has(productoAbierto.id)} enHoja
            alCorregir={(habia, hay, encolado) => corregido(productoAbierto, habia, hay, encolado)} alTerminar={() => setAbiertoId(null)} />
        </Hoja>
      )}
    </Pagina>
  );
}

const estadoDe = (n: number) => (n < 0 ? "error" : n === 0 ? "neutro" : "logro");

const ICONO_DEL_MOVIMIENTO: Record<string, { icono: IconoDeDepositoNombre; clase: string }> = {
  Venta: { icono: "shopping-cart", clase: "" }, Compra: { icono: "truck", clase: "compra" }, Ajuste: { icono: "square-pen", clase: "ajuste" }, Conteo: { icono: "clipboard-list", clase: "ajuste" },
};

// La cuenta de un producto: su stock grande, los movimientos que lo explican con lo que queda
// después de cada uno, y la corrección a mano. Fija a la derecha de la lista, o en una hoja.
function CuentaDelProducto({ producto: p, fila, cantidad, porEnviar, enHoja, panelRef, alCorregir, alTerminar }: {
  producto: Producto; fila: StockFila | null; cantidad: number; porEnviar: boolean; enHoja?: boolean; panelRef?: React.RefObject<HTMLElement>;
  alCorregir: (habia: number, hay: number, encolado: boolean) => void; alTerminar: () => void;
}) {
  const puede = usePuede();
  const corrige = puede("deposito.stock");
  const veInvertido = puede("negocio.invertido");
  const { actualizarProducto } = useCatalogo();
  const { movimientos, error: falloDeMovimientos } = useMovimientos(p.id);
  const errorMovimientos = falloDeMovimientos && mensajeDe(falloDeMovimientos, "Sin conexión: los movimientos se ven cuando vuelve internet. Corregir el stock se puede igual.");
  const { faltaEn, corregir, guardando } = useCorregirStock(p);
  const inicial = String(cantidad).replace(".", ",");
  const [real, setReal] = useState(inicial);
  const [motivo, setMotivo] = useState("");
  const [otro, setOtro] = useState(false);
  const [todos, setTodos] = useState(false);
  const [falta, setFalta] = useState<{ real?: string; motivo?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const unidad = unidadDe(p);
  const rotulo = nombreUnidad(p.unidad);
  useEffect(() => { setReal(inicial); }, [inicial]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (guardando) return;
    const faltan = faltaEn(real, motivo);
    setFalta({ real: faltan?.real ? TEXTOS.inventario.faltaCuantasHay.largo : undefined, motivo: faltan?.motivo ? TEXTOS.inventario.faltaElMotivo.largo : undefined });
    if (faltan) return;
    setError(null);
    try {
      const { hay, encolado } = await corregir(real, motivo);
      setMotivo(""); setOtro(false);
      alCorregir(cantidad, hay, encolado);
      alTerminar();
    } catch (err) {
      setError(`No se guardó la corrección: ${(err as Error).message}`);
    }
  }
  function cancelar() { setReal(inicial); setMotivo(""); setOtro(false); setFalta({}); alTerminar(); }

  const hay = cantidadContada(real, p);
  const valida = !Number.isNaN(hay);
  const sumar = (d: number) => { const base = valida ? hay : cantidad; setReal(String(Math.max(0, base + d)).replace(".", ",")); setFalta((f) => ({ ...f, real: undefined })); };
  // Lo que queda después de cada movimiento: del stock de hoy hacia atrás.
  const conSaldo = useMemo(() => {
    let queda = Number(fila?.stock ?? cantidad);
    return (movimientos ?? []).map((m) => { const r = { m, queda }; queda -= Number(m.cantidad); return r; });
  }, [movimientos, fila, cantidad]);
  const visibles = todos ? conSaldo : conSaldo.slice(0, 3);
  const valor = Number(fila?.valor ?? 0);

  const Contenedor = enHoja ? "div" : "aside";
  return (
    <Contenedor ref={panelRef as React.RefObject<HTMLDivElement>} className={`sv-panel ${enHoja ? "en-hoja" : ""}`} data-testid={enHoja ? undefined : "detalle-stock"} aria-label={`Stock de ${p.descripcion}`}>
      {!enHoja && (
        <div className="sv-p-cab">
          <FotoDeProducto producto={p} alCambiar={(f) => { actualizarProducto(p.id, { foto_url: f }).catch(() => undefined); }} />
          <div className="sv-p-titulo"><h2>{p.descripcion}</h2><span className="detalle">{[p.marca, fila?.proveedor ?? p.proveedor].filter(Boolean).join(" · ") || "Sin marca ni proveedor"}</span></div>
          <Boton tam="chico" className="sv-icono" disabled title={TEXTOS.stock.todaviaNo.largo} aria-label="Imprimir su etiqueta"><IconoDeDeposito nombre="printer" tam={16} /></Boton>
        </div>
      )}
      <div className="sv-saldo">
        <div className={`sv-total ${cantidad < 0 ? "negativo" : ""}`} data-testid="stock-del-producto">{cantidad < 0 ? "−" : ""}{numero(Math.abs(cantidad))}<small>{rotulo}</small></div>
        <div className="sv-cuenta-saldo">
          {movimientos ? <>Es la suma de sus <b>{plural(movimientos.length, "movimiento", "movimientos")}</b></> : "Es la suma de sus movimientos"}<br />
          Mínimo <b>—</b>{veInvertido && <> · vale <b data-testid="valor-stock">{fila?.costo_neto == null || valor <= 0 ? "—" : pesosEnteros(valor)}</b></>}
          {porEnviar && <><br /><span className="sv-pastilla urgente">Se manda al volver internet</span></>}
        </div>
      </div>

      <div className="sv-movs-cab"><h3 id={`${id}-mov`}>Movimientos</h3><span className="detalle">queda</span></div>
      <Aviso tipo="alerta">{errorMovimientos}</Aviso>
      {movimientos === null && !errorMovimientos && <Progreso texto="Buscando los movimientos…" />}
      {movimientos?.length === 0 && <p className="detalle">Este producto todavía no tiene movimientos: su stock es cero. Se carga con un ingreso de mercadería, un conteo o corrigiéndolo acá.</p>}
      {movimientos && movimientos.length > 0 && (
        <ul className={`sv-movs ${todos ? "todos" : ""}`} aria-labelledby={`${id}-mov`} data-testid="movimientos">
          {visibles.map(({ m, queda }) => <Renglon key={m.id} m={m} queda={queda} />)}
          {conSaldo.length > 3 && (
            <li className="sv-mov">
              <span className="sv-mov-ic"><IconoDeDeposito nombre="history" tam={16} /></span>
              <button type="button" className="sv-mas-movs" onClick={() => setTodos((x) => !x)}>{todos ? "Ver solo los últimos 3" : `Ver ${numero(conSaldo.length - 3)} más, hasta el ${fecha(conSaldo[conSaldo.length - 1]!.m.fecha).slice(0, 5)}`}</button>
              <span /><span className="sv-mov-queda">{todos ? "↑" : "↓"}</span>
            </li>
          )}
        </ul>
      )}

      {corrige && (
        <form className="sv-corregir" onSubmit={guardar} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancelar(); } }} noValidate data-testid="correccion">
          <div className="sv-fila-c">
            <label className="sv-et-c" htmlFor={`${id}-real`}>¿Cuántas hay?</label>
            <span className="sv-cantidad">
              <button type="button" onClick={() => sumar(-1)} aria-label="Una menos"><IconoDeDeposito nombre="minus" tam={16} /></button>
              <input id={`${id}-real`} inputMode={enteras(unidad) ? "numeric" : "decimal"} autoComplete="off" value={real} onFocus={(e) => e.target.select()}
                onChange={(e) => { setReal(e.target.value.replace(enteras(unidad) ? /[^\d]/g : /[^\d,.]/g, "")); setFalta((f) => ({ ...f, real: undefined })); }}
                aria-invalid={Boolean(falta.real)} aria-describedby={falta.real ? `${id}-falta-real` : `${id}-vista`} data-testid="cantidad-real" />
              <button type="button" onClick={() => sumar(1)} aria-label="Una más"><IconoDeDeposito nombre="plus" tam={16} /></button>
            </span>
            <span className="sv-vista" id={`${id}-vista`}>{!valida ? <>el sistema dice <b>{numero(cantidad)}</b></> : hay === cantidad ? "coincide con el sistema" : <>había <b>{numero(cantidad)}</b>, hay <b>{numero(hay)}</b></>}</span>
          </div>
          {falta.real && <p className="stock-falta" id={`${id}-falta-real`} role="alert">{falta.real}</p>}
          <div className="sv-motivos" role="group" aria-label="Motivo">
            {MOTIVOS_DE_AJUSTE.map((m) => <button key={m} type="button" className={`sv-chip ${motivo === m && !otro ? "elegido" : ""}`} aria-pressed={motivo === m && !otro} onClick={() => { setMotivo(m); setOtro(false); setFalta((f) => ({ ...f, motivo: undefined })); }}>{m}</button>)}
            <button type="button" className={`sv-chip ${otro ? "elegido" : ""}`} aria-pressed={otro} onClick={() => { setOtro(true); setMotivo(""); }}>Otro…</button>
          </div>
          {otro && <input className="entrada" autoFocus value={motivo} onChange={(e) => { setMotivo(e.target.value); setFalta((f) => ({ ...f, motivo: undefined })); }} placeholder="Escribí el motivo" aria-label="Motivo de la corrección" maxLength={200}
            aria-invalid={Boolean(falta.motivo)} aria-describedby={falta.motivo ? `${id}-falta-motivo` : undefined} data-testid="motivo" />}
          {falta.motivo && <p className="stock-falta" id={`${id}-falta-motivo`} role="alert">{falta.motivo}</p>}
          <Aviso tipo="error">{error}</Aviso>
          <div className="sv-fila-c">
            <Boton type="submit" variante="marino" className="sv-guardar" disabled={guardando} data-testid="guardar-ajuste">{guardando ? "Guardando…" : "Guardar corrección"} <kbd className="tecla">Enter</kbd></Boton>
            <Boton className="sv-cancelar" onClick={cancelar} disabled={guardando}>Cancelar <kbd className="tecla">Esc</kbd></Boton>
          </div>
        </form>
      )}
    </Contenedor>
  );
}

function Renglon({ m, queda }: { m: Movimiento; queda: number }) {
  const nombre = nombreDeMovimiento(m);
  const { icono, clase } = ICONO_DEL_MOVIMIENTO[nombre] ?? ICONO_DEL_MOVIMIENTO.Ajuste!;
  const c = Number(m.cantidad);
  return (
    <li className="sv-mov">
      <span className={`sv-mov-ic ${clase}`}><IconoDeDeposito nombre={icono} tam={16} /></span>
      <span className="sv-mov-texto"><span className="sv-mov-tt">{nombre} · {fecha(m.fecha)}</span>{m.nota && <span className="sv-mov-nn">{m.nota}</span>}</span>
      <span className={`sv-mov-q ${c > 0 ? "mas" : ""}`}>{conSigno(c)}</span>
      <span className="sv-mov-queda">{numero(queda)}</span>
    </li>
  );
}

// El dinero invertido en enteros, y de dónde sale: proveedor por proveedor.
const pesosEnteros = (n: number) => pesos(Math.round(n)).replace(/,00$/, "");
function pasosDelInvertido(porProveedor: Record<string, { valor: number; productos: number }>, total: number): string[] {
  const pasos = Object.entries(porProveedor).filter(([, v]) => v.valor > 0).sort((a, b) => b[1].valor - a[1].valor)
    .map(([nombre, v]) => `${nombre}, ${plural(v.productos, "producto", "productos")}: ${pesosEnteros(v.valor)}`);
  return [...(pasos.length ? pasos : ["Ningún producto con stock tiene costo cargado"]), `Dinero invertido: ${pesosEnteros(total)}`];
}
