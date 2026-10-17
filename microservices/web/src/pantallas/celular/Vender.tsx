import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { irA } from "../../rutas";
import { contarAlEspejo, useEspejar } from "../../espejo";
import { NOMBRE_DE_MEDIO, precioDe, subtotalDe, useVenta, type Item, type MotivoDeCambio } from "../../negocio/ventas/venta";
import { SiVeCostos } from "../Costos";
import { usePuede, type Permiso } from "../permisos";
import { MEDIOS, TEXTOS } from "../textos";
import { ISOTIPO_DE_MERCADO_PAGO } from "../mercado-pago";
import { esMargenBoton, MARGENES } from "../../negocio/precios/vista-previa";
import { precioDelProducto } from "../../negocio/catalogo/precio";
import { FotoProducto } from "./componentes/Foto";
import { AvisoError, Buscador, Contador, Exito, Hoja, Icono, Toast, Lista } from "./componentes/base";
import { Explicacion } from "./componentes/Explicacion";
import { cantidadValida, enteras, UNIDADES, unidadDe, type Unidad } from "../../unidades";
import { api, ErrorApi, subirFoto } from "../../api";
import { guardar, borrarAnterioresA } from "../../almacen";
import { alCambiarLaCola, enviarOEncolar, enviarPendientes, pendientes as pendientesEnCola } from "../../cola";
import { traerPorCodigo, useCatalogo } from "../../catalogo";
import { useTeclasGlobales } from "../../plataforma/teclado/teclas";
import { pesos, pesosCortos } from "../../formato";
import { describirDispositivo } from "./pantallas/Login";
import { Escaner, hayCamara } from "../../plataforma/camara/Escaner";
import { VincularCelular } from "./componentes/VincularCelular";
import { escucharPuesto, EVENTO_EMPAREJAMIENTO, puestoRemoto } from "../../puesto";
import { AnularVentas, VentasDeHoy } from "./pantallas/VentasDeHoy";
import { Pestanas } from "./Pestanas";
import { SinPermiso } from "../SinPermiso";
import type { Producto } from "./pantallas/Productos";
import { FichaProducto } from "./FichaProducto";

// La venta (issue #15): el orden es el del mostrador (specs/003-ventas/research.md). Buscar →
// precio → cantidad → cobro. Enter agrega; Esc descarta ("no llevó"); F2 cobra. Cada
// renglón es una tarjeta; el margen se cambia ahí mismo y queda guardado en el producto.
// Un dibujo por medio de pago, con su nombre chico debajo como en el menú de abajo: billete,
// tarjeta y libreta. Mercado Pago lleva su propio isotipo.
const DIBUJO_DE_MEDIO: Record<string, string> = {
  efectivo: "M3 7h18v10H3ZM12 14.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5ZM6 10v4M18 10v4",
  tarjeta: "M3 6h18v12H3ZM3 10h18M7 15h4",
  cuenta_corriente: "M6 3h12v18H6ZM9 8h6M9 12h6M9 16h3",
};

const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");
const num = (n: number) => n.toLocaleString("es-AR");

// Vender tiene tres pestañas (decisión 72): vender, ver lo vendido hoy y anular una venta.
const SUB = [{ valor: "vender", nombre: "Vender", icono: "vender" }, { valor: "hoy", nombre: "Hoy", icono: "ventas" }, { valor: "anular", nombre: "Anular", icono: "deshacer" }] as const;
type Sub = (typeof SUB)[number]["valor"];
const PIDE: Record<Sub, Permiso[]> = { vender: ["ventas.registrar"], hoy: ["ventas.ver"], anular: ["ventas.anular", "ventas.anular_cualquiera"] };

export function ParteVender({ sub }: { sub: string | null }) {
  const puedeEsto = usePuede();
  const permitidas = SUB.filter((s) => puedeEsto(...PIDE[s.valor]));
  const actual: Sub = SUB.find((s) => s.valor === sub)?.valor ?? permitidas[0]?.valor ?? "vender";
  // Con una sola pestaña a la vista no se dibujan.
  const pestanas = permitidas.length > 1 ? <Pestanas opciones={permitidas.map((s) => ({ valor: s.valor, nombre: s.nombre, icono: s.icono }))} actual={actual} alElegir={(v) => irA(v === "vender" ? "vender" : `vender/${v}`)} /> : null;
  if (!puedeEsto(...PIDE[actual])) return <SinPermiso falta={PIDE[actual]} />;
  if (actual === "vender") return <Vender pestanas={pestanas} />;
  return (
    <main className="contenido">
      <div className="encabezado"><h1 className="titulo">Vender</h1>{pestanas}</div>
      {actual === "hoy" ? <VentasDeHoy /> : <AnularVentas cualquierDia={puedeEsto("ventas.anular_cualquiera")} />}
    </main>
  );
}

export function Vender({ pestanas = null }: { pestanas?: ReactNode }) {
  const puedeEsto = usePuede();
  const fijaMargen = puedeEsto("catalogo.margenes");
  const { catalogo, catalogoCompleto, stock: stockPorId, clientes, error: errorCatalogo, buscarProductos, actualizarProducto, ajustarStockLocal, enElServidor } = useCatalogo();
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const [pendientes, setPendientes] = useState(0);
  const [escaneando, setEscaneando] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState<string | null>(null);
  const [puestoVinculado, setPuestoVinculado] = useState(false);
  // El celular emparejado con una computadora (decisión 58): Vender es su propia venta; para
  // leerle códigos a la computadora está el lector, que es un modo aparte (decisión 59).
  const [emparejado, setEmparejado] = useState(() => Boolean(puestoRemoto()));
  useEffect(() => {
    const mirar = () => setEmparejado(Boolean(puestoRemoto()));
    window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar);
    return () => window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar);
  }, []);
  const [hoja, setHoja] = useState<"clientes" | null>(null);
  const caja = useRef<HTMLInputElement>(null);

  // La venta en sí (renglones, precios, cobrar, «no llevó») está una sola vez, en el negocio:
  // acá va solo lo de esta interfaz: sus textos cortos y sus hojas.
  const venta = useVenta({
    lado: "celular", dispositivo: describirDispositivo, fijaMargen,
    textoDe: (motivo) => TEXTOS.vender[motivo === "sin-precio" ? "sinPrecio" : motivo === "sin-medio" ? "elegiComoPaga" : "faltaElCliente"].corto,
    textoDeRechazo: (m) => m,
    alCambiar: useCallback((motivo: MotivoDeCambio) => { if (motivo === "agregar") setConsulta(""); }, []),
    alFaltarCliente: () => setHoja("clientes"),
    alCobrar: (c) => setMensaje(c.encolado ? `Venta guardada en este dispositivo (${pesos(c.total)}). Sin conexión: se envía sola cuando vuelva.` : `Venta registrada: ${pesos(c.total)} en ${(NOMBRE_DE_MEDIO[c.medio]).toLowerCase()}.`),
  });
  const { items, medio, setMedio, clienteId, setClienteId, cliente, total, sinPrecio, mensaje, setMensaje, error, setError, ocupado, codigoDesconocido, setCodigoDesconocido, cobro, agregar, cambiarItem, cambiarUnidad, quitar, elegirMargen, elegirSugerencia, elegirMedio, cobrar } = venta;
  const [ficha, setFicha] = useState<string | null>(null);
  const productoDeLaFicha = ficha ? (catalogo ?? []).find((p) => p.id === ficha) ?? items.find((i) => i.producto?.id === ficha)?.producto ?? null : null;
  // Un código que no es de ningún producto deja la búsqueda limpia, para elegir a cuál asociarlo.
  const agregarPorCodigo = useCallback((codigo: string) => { const conocido = venta.agregarPorCodigo(codigo); setConsulta(""); return conocido; }, [venta.agregarPorCodigo]);
  const noLlevo = () => venta.noLlevo(TEXTOS.vender.noLlevo.corto);
  // Lo que se dice de la venta recién cobrada, con las palabras del celular.
  const exito = useMemo(() => cobro && {
    total: cobro.total,
    medio: (NOMBRE_DE_MEDIO[cobro.medio]) + (cobro.cliente ? ` · ${cobro.cliente}` : ""),
    detalle: cobro.encolado ? "Sin conexión: se envía sola cuando vuelva internet." : `${cobro.productos} ${cobro.productos === 1 ? "producto" : "productos"} · ${new Date(cobro.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} · el stock ya se descontó.`,
  }, [cobro]);
  // En el celular la búsqueda no toma el foco sola: abriría el teclado y taparía media pantalla.

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 8) : []), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);
  useEffect(() => {
    const contar = () => pendientesEnCola().then((l) => setPendientes(l.length)).catch(() => undefined);
    void contar();
    const quitar = alCambiarLaCola(contar);
    const reintentar = () => { enviarPendientes().then(setPendientes).catch(() => undefined); };
    window.addEventListener("online", reintentar);
    return () => { quitar(); window.removeEventListener("online", reintentar); };
  }, []);

  const manejarCodigo = useRef(agregarPorCodigo);
  useEffect(() => { manejarCodigo.current = agregarPorCodigo; }, [agregarPorCodigo]);

  // Códigos que llegan del celular vinculado.
  const alVincular = useCallback((puestoId: string) => {
    setPuestoVinculado(true);
    const parar = escucharPuesto(puestoId, (codigo) => manejarCodigo.current(codigo), (conectado) => { if (!conectado) setPuestoVinculado(Boolean(localStorage.getItem("ferre.puesto"))); });
    (window as unknown as { __pararPuesto?: () => void }).__pararPuesto?.();
    (window as unknown as { __pararPuesto?: () => void }).__pararPuesto = parar;
  }, []);
  useEffect(() => () => (window as unknown as { __pararPuesto?: () => void }).__pararPuesto?.(), []);

  // En el celular: lo escaneado se agrega acá y, si hay computadora vinculada, se le manda.
  const alDetectar = useCallback((codigo: string) => {
    const conocido = manejarCodigo.current(codigo);
    setUltimoEscaneo(conocido ? `${codigo}: agregado` : `${codigo}: no está en el catálogo`);
  }, []);

  function teclasBusqueda(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const p = resultados[elegido];
      if (p) elegirSugerencia(p);
      else if (consulta.trim() && /^[0-9A-Za-z\-]{6,32}$/.test(consulta.trim()) && !resultados.length) agregarPorCodigo(consulta.trim()); // lector USB
      else if (consulta.trim()) agregar(null, consulta.trim()); // ítem libre (#17)
    }
    else if (e.key === "Escape") { if (consulta) setConsulta(""); else noLlevo(); }
  }
  useEffect(() => {
    const global = (e: globalThis.KeyboardEvent) => {
      const medioTecla = MEDIOS.find((m) => m.tecla === e.key);
      if (medioTecla) { e.preventDefault(); elegirMedio(medioTecla.valor); }
      else if (e.key === "F2") { e.preventDefault(); void cobrar(); }
    };
    window.addEventListener("keydown", global);
    return () => window.removeEventListener("keydown", global);
  });
  useTeclasGlobales(useCallback((e: globalThis.KeyboardEvent) => {
    if (document.activeElement === caja.current) return;
    if (e.key === "ArrowDown" && resultados.length) { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp" && resultados.length) { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Escape") {  }
  }, [resultados.length]), caja.current);

  const vacio = items.length === 0 && !consulta.trim() && !mensaje && !error && !codigoDesconocido;

  return (
    <main className="contenido vender-ancho">
      <div className="encabezado">
        <h1 className="titulo">Vender</h1>
        {pestanas}
        <Buscador valor={consulta} alCambiar={setConsulta} placeholder={catalogo ? "Buscar producto o código" : "Bajando el catálogo…"} disabled={!catalogo} onKeyDown={teclasBusqueda} cajaRef={caja}
          alEscanear={hayCamara() ? () => setEscaneando(true) : undefined} />
        {(!hayCamara() || window.innerWidth > 900) && <div className="solo-escritorio"><VincularCelular vinculado={puestoVinculado} alVincular={alVincular} /></div>}
        {emparejado && (
          <button type="button" className="chip emparejado" onClick={() => irA("lector")} data-testid="celular-vinculado-remoto">
            Usar este celular como lector de la computadora
          </button>
        )}
      </div>

      <div className="columna">
        <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
        <AvisoError texto={error ?? errorCatalogo} />
        {codigoDesconocido && (
          <div className="aviso-suave" data-testid="codigo-desconocido">
            El código <code>{codigoDesconocido}</code> no está en el catálogo. Buscá el producto y tocalo (o Enter) para asociarlo.
            <button type="button" onClick={() => setCodigoDesconocido(null)}>Ignorar</button>
          </div>
        )}
        {escaneando && <Escaner alDetectar={alDetectar} alCerrar={() => setEscaneando(false)} ultimo={ultimoEscaneo} />}

        {resultados.length > 0 && (
          <ul className="sugerencias" role="listbox" data-testid="sugerencias">
            {resultados.map((p, i) => {
              const precio = precioDelProducto(p).valor;
              return (
                <li key={p.id} role="option" aria-selected={i === elegido}>
                  <button type="button" className={`fila con-foto ${i === elegido ? "elegida" : ""}`} onMouseDown={(e) => { e.preventDefault(); if (codigoDesconocido) { actualizarProducto(p.id, { codigo_barras: codigoDesconocido } as never).catch(() => undefined); setCodigoDesconocido(null); agregar({ ...p, codigo_barras: codigoDesconocido }); } else agregar(p); }}>
                    <span className="miniatura">{p.foto_url ? <img src={p.foto_url.startsWith("/") ? `${import.meta.env.VITE_API_URL}${p.foto_url}` : p.foto_url} alt="" /> : null}</span>
                    <span className="nombre">{p.descripcion}</span>
                    <strong className="derecha importe">{precio === null ? <small>sin precio</small> : pesosCortos(precio)}</strong>
                    <span className="detalle">{detalleDe(p)}{stockPorId.has(p.id) ? ` · stock ${num(stockPorId.get(p.id)!)}` : ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {consulta.trim() && resultados.length === 0 && catalogo && (
          <Lista>
            <button type="button" className="fila" onClick={() => agregar(null, consulta.trim())} data-testid="agregar-libre">
              <span className="nombre">Agregar “{consulta.trim()}” como ítem libre</span><span />
              <span className="detalle">No está en ninguna lista. Le ponés el precio a mano.</span>
            </button>
          </Lista>
        )}

        {vacio && (
          <div className="vacio venta-vacia">
            <img className="dibujo" src="/ilustraciones/venta-nueva.png" alt="" />
            <strong>Venta nueva</strong>
            <p>Tocá la búsqueda y escribí el producto, o escaneá el código de barras.</p>
            {/* Solo explican: no se tocan, porque repetirían la búsqueda, el escáner y el menú (003-T003). */}
            <ul className="como-se-agrega" aria-label="Cómo se agrega un producto" data-testid="como-se-agrega">
              <li><Icono nombre="barras" tam={30} grosor={1.9} /><b>Escaneá</b><span>Con la cámara o el lector</span></li>
              <li><Icono nombre="buscar" tam={30} grosor={1.9} /><b>Buscá</b><span>Por nombre o código</span></li>
              <li><Icono nombre="catalogo" tam={30} grosor={1.9} /><b>Explorá</b><span>En Catálogo, en el menú</span></li>
            </ul>
          </div>
        )}

        {items.length > 0 && (
          <div className="en-venta" data-testid="titulo-venta">
            <h2>Productos en esta venta</h2>
            <button type="button" className="vaciar" onClick={() => { if (window.confirm("¿Vaciar la venta? Se sacan todos los productos.")) venta.vaciar(); }} data-testid="vaciar-venta">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>Vaciar
            </button>
            <span>{items.length} {items.length === 1 ? "producto" : "productos"}</span>
          </div>
        )}
        {items.map((it) => (
          <ItemDeVenta key={it.clave} item={it} stock={it.producto ? stockPorId.get(it.producto.id) : undefined}
            alCambiar={(c) => cambiarItem(it.clave, c)} alQuitar={() => quitar(it.clave)} alElegirMargen={(m) => elegirMargen(it, m)} alCambiarUnidad={(u) => cambiarUnidad(it, u)}
            alVerFicha={it.producto ? () => setFicha(it.producto!.id) : undefined}
            alSubirFoto={it.producto ? async (archivo) => { const foto_url = await subirFoto(it.producto!.id, archivo); actualizarProducto(it.producto!.id, { foto_url } as never).catch(() => undefined); cambiarItem(it.clave, { producto: { ...it.producto!, foto_url } }); } : undefined} />
        ))}
      </div>

      {items.length > 0 && (
        <div className="cobro" data-testid="cobro">
          <div className="medios" role="radiogroup" aria-label="Cómo paga">
            {MEDIOS.map((m) => (
              <button key={m.valor} type="button" role="radio" aria-checked={medio === m.valor} className={medio === m.valor ? "activo" : ""} onClick={() => elegirMedio(m.valor)} data-testid={`medio-${m.valor}`}>
                {m.valor === "mercado_pago"
                  ? <svg className="isotipo-mp" width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={ISOTIPO_DE_MERCADO_PAGO} /></svg>
                  : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={DIBUJO_DE_MEDIO[m.valor]} /></svg>}
                <span>{m.corto}</span>
              </button>
            ))}
          </div>
          {medio === "cuenta_corriente" && (
            <button type="button" className={`cliente ${cliente ? "" : "falta"}`} onClick={() => setHoja("clientes")} data-testid="cliente">
              <span>{cliente ? cliente.nombre : "Elegí el cliente"}</span><Icono nombre="derecha" tam={16} grosor={2.5} />
            </button>
          )}
          <div className="acciones">
            <button type="button" className="no-llevo" onClick={noLlevo} data-testid="no-llevo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.700 5.700l12.600 12.600" /></svg>
              <span>No llevó</span>
            </button>
            <div className="cobro-total"><span>Total</span><strong className="importe" data-testid="total">{pesosCortos(total)}</strong></div>
            <button type="button" className="boton coral principal centrado" onClick={cobrar} disabled={ocupado} data-testid="cobrar">{ocupado ? "Cobrando…" : "Cobrar"}</button>
          </div>
        </div>
      )}

      {hoja === "clientes" && (
        <Hoja titulo={TEXTOS.vender.quienLleva.corto} alCerrar={() => setHoja(null)} testId="hoja-clientes">
          <Lista>
            {clientes.length === 0 && <div className="fila"><span className="nombre">Todavía no hay clientes con cuenta corriente.</span></div>}
            {clientes.map((c) => (
              <button key={c.id} type="button" className={`fila ${clienteId === c.id ? "elegida" : ""}`} onClick={() => { setClienteId(c.id); setMedio("cuenta_corriente"); setHoja(null); }}>
                <span className="nombre">{c.nombre}</span>
                <small style={{ color: Number(c.deuda) > 0 ? "var(--coral-texto)" : undefined }}>{Number(c.deuda) > 0 ? `debe ${pesos(c.deuda)}` : "al día"}</small>
              </button>
            ))}
          </Lista>
        </Hoja>
      )}
      {productoDeLaFicha && (
        <FichaProducto producto={productoDeLaFicha as Producto} alCerrar={() => setFicha(null)}
          quienLoTiene={(codigo) => (catalogo ?? []).find((x) => x.id !== productoDeLaFicha.id && x.codigo_barras === codigo) as Producto | undefined}
          alCambiar={(c) => { actualizarProducto(productoDeLaFicha.id, c as never).catch((e: Error) => setError(`No se pudo guardar: ${e.message}`)); }} />
      )}
      {exito && (
        <Exito que={exito.detalle.startsWith("Sin conexión") ? "Guardada en este dispositivo" : "Venta registrada"} importe={pesosCortos(exito.total)} medio={exito.medio} detalle={exito.detalle} boton="Nueva venta"
          alCerrar={() => { venta.cerrarCobro(); setMensaje(null);  }} />
      )}
    </main>
  );
}

// Un renglón de la venta (003-T001, maqueta celular-venta-renglones.png): arriba la foto, el nombre y
// el precio por unidad en una pastilla, con un menú «⋮»; abajo el tacho, la cantidad, el margen y el
// total del renglón. La unidad se cambia desde el menú, porque se cambia poco.
const POR_UNIDAD: Record<Unidad, string> = { unidad: "cada uno", kg: "el kg", m: "el m", l: "el L" };

function ItemDeVenta({ item: it, stock, alCambiar, alQuitar, alElegirMargen, alCambiarUnidad, alSubirFoto, alVerFicha }: {
  item: Item; stock: number | undefined; alCambiar: (c: Partial<Item>) => void; alQuitar: () => void; alElegirMargen: (m: number) => void; alCambiarUnidad: (u: Unidad) => void; alSubirFoto?: (archivo: File) => Promise<void>; alVerFicha?: () => void;
}) {
  const p = precioDe(it);
  const producto = it.producto;
  const renglon = subtotalDe(it);
  const subtotal = renglon?.valor ?? null;
  const [menu, setMenu] = useState(false);
  const [viendoUnidad, setViendoUnidad] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const margenTexto = it.precioManual !== null ? "a mano" : p.margen === null ? "elegí margen" : `${p.margen} %${esMargenBoton(p.margen) ? "" : " a mano"}`;
  const precioAMano = (e: React.ChangeEvent<HTMLInputElement>) => alCambiar({ precioManual: e.target.value === "" ? null : Number(e.target.value.replace(/[^\d]/g, "")) });
  const elegir = (accion: () => void) => () => { setMenu(false); accion(); };
  return (
    <div className="item" data-testid="item" ref={raiz}>
      <div className="cabeza">
        {producto ? <FotoProducto id={producto.id} url={producto.foto_url ?? null} descripcion={producto.descripcion} alSubir={alSubirFoto} /> : <span className="miniatura foto-chica" />}
        {producto ? <span className="nombre">{it.descripcion}</span>
          : <input className="linea-editable" value={it.descripcion} placeholder="¿Qué se lleva?" onChange={(e) => alCambiar({ descripcion: e.target.value })} data-testid="descripcion-libre" />}
        {p.unitario !== null ? (
          <span className="unitario"><Explicacion conCosto valor={pesosCortos(p.unitario)} pasos={p.pasos} /><small>{POR_UNIDAD[it.unidad]}</small></span>
        ) : producto ? (
          <button type="button" className="unitario falta" onClick={() => alCambiar({ abierto: true })} data-testid="sin-precio">sin precio</button>
        ) : (
          <label className="campo falta importe-campo"><span>$</span><input inputMode="numeric" placeholder="precio" autoFocus value={it.precioManual ?? ""} onChange={precioAMano} data-testid="precio-manual" /></label>
        )}
        <button type="button" className="mas-del-renglon" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu" aria-label={`Más opciones de ${it.descripcion || "este renglón"}`} data-testid="mas-del-renglon">⋮</button>
        <small className="detalle">{producto ? `${detalleDe(producto)}${stock !== undefined ? ` · stock ${num(stock)}${stock - it.cantidad < 0 ? ` (${TEXTOS.vender.stockNoAlcanza.corto})` : ""}` : ""}` : "Ítem libre"}</small>
      </div>
      {menu && (
        <div className="menu-del-renglon" role="menu" data-testid="menu-del-renglon">
          {producto && p.costo !== null && <button type="button" role="menuitem" onClick={elegir(() => alCambiar({ abierto: true }))}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6" /></svg>Precio a mano</button>}
          <button type="button" role="menuitem" onClick={elegir(() => setViendoUnidad(true))}><Icono nombre="lista" tam={20} />Vender por metro, kilo o unidad</button>
          {alVerFicha && <button type="button" role="menuitem" onClick={elegir(alVerFicha)}><Icono nombre="archivo" tam={20} />Ver la ficha del producto</button>}
          {producto && alSubirFoto && <button type="button" role="menuitem" onClick={elegir(() => raiz.current?.querySelector<HTMLButtonElement>("[data-testid=foto-chica]")?.click())}><Icono nombre="camara" tam={20} />Sacar foto</button>}
        </div>
      )}
      <div className="pie">
        <button type="button" className="quitar" onClick={alQuitar} aria-label={`Quitar ${it.descripcion} de la venta`} title="Quitar de la venta" data-testid="quitar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
        </button>
        <Contador valor={it.cantidad} entera={enteras(it.unidad)} alCambiar={(v) => alCambiar({ cantidad: v })} />
        {producto && p.costo !== null && (
          <button type="button" className={`chip-margen ${p.margen === null && it.precioManual === null ? "falta" : ""}`} onClick={() => alCambiar({ abierto: !it.abierto })} aria-expanded={it.abierto} aria-label={`Margen: ${margenTexto}`} data-testid="margen">
            {margenTexto}<Icono nombre={it.abierto ? "arriba" : "abajo"} tam={14} grosor={2.5} />
          </button>
        )}
        <span className="total-del-renglon" data-testid="subtotal">{subtotal !== null && <Explicacion conCosto className="subtotal" valor={pesosCortos(subtotal)} pasos={[...p.pasos, ...(renglon?.pasos ?? [])]} />}</span>
      </div>
      {viendoUnidad && (
        <div className="abierto unidad-del-renglon">
          <div className="cabecera"><span>Se vende por</span><button type="button" className="enlace" onClick={() => setViendoUnidad(false)}>Listo</button></div>
          <select className="selector-nativo unidad" value={it.unidad} onChange={(e) => alCambiarUnidad(e.target.value as Unidad)} aria-label="Unidad" data-testid="unidad">
            {UNIDADES.map((u) => <option key={u.valor} value={u.valor}>{u.nombre}</option>)}
          </select>
        </div>
      )}
      {it.abierto && producto && p.costo !== null && (
        <div className="abierto">
          <div className="cabecera">
            <SiVeCostos><Explicacion className="enlace punteado" valor={`Costo ${pesos(p.costo)} · ${producto.proveedor ?? "sin proveedor"}`} pasos={producto.explicacion_costo?.length ? producto.explicacion_costo : [`Costo ${pesos(p.costo)} según la lista`]} /></SiVeCostos>
            {p.unitario !== null && <span>{pesos(p.unitario)} c/u</span>}
          </div>
          <div className="cuadricula-5">
            {MARGENES.map((m) => <button key={m} type="button" className={`boton ${p.margen === m ? "activo" : ""}`} onClick={() => alElegirMargen(m)}>{m} %</button>)}
          </div>
          <div className="fila-otro">
            <span>Otro precio solo para esta venta</span>
            <label className="campo"><span>$</span><input inputMode="numeric" placeholder="a mano" value={it.precioManual ?? ""} onChange={precioAMano} data-testid="precio-manual" /></label>
          </div>
        </div>
      )}
    </div>
  );
}
