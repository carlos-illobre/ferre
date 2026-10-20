import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as EventoDePuntero, type ReactNode } from "react";
import { irA } from "../../rutas";
import { NOMBRE_DE_MEDIO, precioDe, subtotalDe, useVenta, type Cobro, type Item, type Medio, type MotivoDeCambio } from "../../negocio/ventas/venta";
import { useVeCostos } from "../Costos";
import { usePuede, type Permiso } from "../permisos";
import { MEDIOS, TEXTOS } from "../textos";
import { IconoDeMedio } from "../IconoDeMedio";
import { MARGENES, precioDeVenta } from "../../negocio/precios/vista-previa";
import { precioDelProducto } from "../../negocio/catalogo/precio";
import { FotoProducto } from "./componentes/Foto";
import { AvisoError, Buscador, Contador, Hoja, Icono, Pasos, Toast, Lista } from "./componentes/base";
import { abreviarUnidad, enteras, UNIDADES, type Unidad } from "../../unidades";
import { subirFoto } from "../../api";
import { alCambiarLaCola, enviarPendientes, pendientes as pendientesEnCola } from "../../cola";
import { busquedaAlDia, esperarBusqueda, traerPorCodigo, useCatalogo } from "../../catalogo";
import { useTeclasGlobales } from "../../plataforma/teclado/teclas";
import { nombreDeProducto, pesos, pesosCortos } from "../../formato";
import { describirDispositivo } from "./pantallas/Login";
import { useSugeridos } from "../sugeridos";
import { Escaner, hayCamara } from "../../plataforma/camara/Escaner";
import { VincularCelular } from "./componentes/VincularCelular";
import { escucharPuesto, EVENTO_EMPAREJAMIENTO, puestoRemoto } from "../../puesto";
import { VentasDeHoy } from "./pantallas/VentasDeHoy";
import { Pestanas } from "./Pestanas";
import { SinPermiso } from "../SinPermiso";
import type { Producto } from "./pantallas/Productos";
import { EstadoDeConexion } from "./componentes/EstadoDeConexion";
import "./vender.css";

// La venta en el celular (decisión 119, maqueta specs/003-ventas/maquetas/celular-vender-v2-con-v3.png):
// la v2 del director de arte («Mostrador») con, de la v3, el medio de pago en una pastilla que abre
// la lista, cobrar deslizando y la cámara arriba, que empuja la venta hacia abajo. El orden es el
// del mostrador (specs/003-ventas/research.md): buscar → precio → cantidad → cobro. Enter agrega;
// Esc descarta ("no llevó"); F2 cobra.

const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");
const num = (n: number) => n.toLocaleString("es-AR");
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

// Vender tiene dos pestañas en el celular (decisión 120): armar la venta, y las ventas del día,
// desde donde también se anula.
const SUB = [{ valor: "vender", nombre: "Vender", icono: "vender" }, { valor: "hoy", nombre: "Ventas del día", icono: "ventas" }] as const;
type Sub = (typeof SUB)[number]["valor"];
const PIDE: Record<Sub, Permiso[]> = { vender: ["ventas.registrar"], hoy: ["ventas.ver", "ventas.anular", "ventas.anular_cualquiera"] };

export function ParteVender({ sub }: { sub: string | null }) {
  const puedeEsto = usePuede();
  const permitidas = SUB.filter((s) => puedeEsto(...PIDE[s.valor]));
  // «vender/anular» era la pestaña de anular, que ahora está en «Ventas de hoy».
  const pedida = sub === "anular" ? "hoy" : sub;
  const actual: Sub = SUB.find((s) => s.valor === pedida)?.valor ?? permitidas[0]?.valor ?? "vender";
  // Con una sola pestaña a la vista no se dibujan.
  const pestanas = permitidas.length > 1 ? <Pestanas opciones={permitidas.map((s) => ({ valor: s.valor, nombre: s.nombre, icono: s.icono }))} actual={actual} alElegir={(v) => irA(v === "vender" ? "vender" : `vender/${v}`)} /> : null;
  if (!puedeEsto(...PIDE[actual])) return <SinPermiso falta={PIDE[actual]} />;
  if (actual === "vender") return <Vender pestanas={pestanas} />;
  return (
    <main className="contenido vm-hoy">
      <div className="encabezado"><h1 className="titulo">Vender</h1><EstadoDeConexion testId="conexion-vender" />{pestanas}</div>
      <VentasDeHoy anulaHoy={puedeEsto("ventas.anular", "ventas.anular_cualquiera")} anulaCualquierDia={puedeEsto("ventas.anular_cualquiera")} />
    </main>
  );
}

type Aviso = { texto: string; deshacer?: () => void };

export function Vender({ pestanas = null }: { pestanas?: ReactNode }) {
  const puedeEsto = usePuede();
  const fijaMargen = puedeEsto("catalogo.margenes");
  const { catalogo, buscandoEnElServidor, stock: stockPorId, clientes, error: errorCatalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const [, setPendientes] = useState(0);
  const [escaneando, setEscaneando] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState<string | null>(null);
  const [recien, setRecien] = useState<string | null>(null);
  const [puestoVinculado, setPuestoVinculado] = useState(false);
  // El celular emparejado con una computadora (decisión 58): Vender es su propia venta; para
  // leerle códigos a la computadora está el lector, que es un modo aparte (decisión 59).
  const [emparejado, setEmparejado] = useState(() => Boolean(puestoRemoto()));
  useEffect(() => {
    const mirar = () => setEmparejado(Boolean(puestoRemoto()));
    window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar);
    return () => window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar);
  }, []);
  const [hoja, setHoja] = useState<"clientes" | "espejo" | null>(null);
  const [renglonAbierto, setRenglonAbierto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  // La búsqueda, en una hoja como la de la v2 (decisión 140): tocar la caja la abre.
  const [buscando, setBuscando] = useState(false);
  const cerrarBusqueda = useCallback(() => { setBuscando(false); setConsulta(""); }, []);
  const caja = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 5000); return () => clearTimeout(t); }, [aviso]);

  // La venta en sí (renglones, precios, cobrar, «no llevó») está una sola vez, en el negocio:
  // acá va solo lo de esta interfaz: sus textos cortos y sus hojas.
  const venta = useVenta({
    lado: "celular", dispositivo: describirDispositivo, fijaMargen,
    textoDe: (motivo) => TEXTOS.vender[motivo === "sin-precio" ? "sinPrecio" : motivo === "sin-medio" ? "elegiComoPaga" : "faltaElCliente"].corto,
    textoDeRechazo: (m) => m,
    alCambiar: useCallback((motivo: MotivoDeCambio) => { if (motivo === "agregar") { setConsulta(""); setBuscando(false); } }, []),
    alFaltarCliente: () => setHoja("clientes"),
  });
  const { items, medio, clienteId, cliente, total, mensaje, setMensaje, error, ocupado, codigoDesconocido, setCodigoDesconocido, cobro, agregar, cambiarItem, cambiarUnidad, elegirMargen, elegirSugerencia, elegirMedio, elegirCliente, cobrar } = venta;
  const renglon = items.find((i) => i.clave === renglonAbierto) ?? null;
  // Un código que no es de ningún producto deja la búsqueda limpia, para elegir a cuál asociarlo.
  const agregarPorCodigo = useCallback((codigo: string) => { const conocido = venta.agregarPorCodigo(codigo); setConsulta(""); setBuscando(false); return conocido; }, [venta.agregarPorCodigo]);
  const noLlevo = () => { if (items.length) { setAviso(null); venta.noLlevo(TEXTOS.vender.noLlevo.corto); } };
  // Vaciar no pregunta: avisa y deja deshacer (003, historia 1, escenario 20).
  const vaciar = () => {
    if (!items.length) return;
    const copia = items;
    venta.vaciar();
    setAviso({ texto: TEXTOS.vender.vaciaste.corto, deshacer: () => venta.devolver(copia) });
  };
  const quitar = (it: Item) => {
    const copia = items;
    venta.quitar(it.clave);
    setAviso({ texto: `${TEXTOS.vender.quitaste.corto} ${nombreDeProducto(it.descripcion)}`, deshacer: () => venta.devolver(copia) });
  };
  // En el celular la búsqueda no toma el foco sola: abriría el teclado y taparía media pantalla.

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 8) : []), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);
  useEffect(() => {
    const contar = () => pendientesEnCola().then((l) => setPendientes(l.length)).catch(() => undefined);
    void contar();
    const quitarOyente = alCambiarLaCola(contar);
    const reintentar = () => { enviarPendientes().then(setPendientes).catch(() => undefined); };
    window.addEventListener("online", reintentar);
    return () => { quitarOyente(); window.removeEventListener("online", reintentar); };
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

  // La cámara sigue abierta arriba: cada código suma su producto, que se marca en la lista.
  const catalogoRef = useRef(catalogo);
  useEffect(() => { catalogoRef.current = catalogo; }, [catalogo]);
  const alDetectar = useCallback((codigo: string) => {
    const conocido = manejarCodigo.current(codigo);
    const p = catalogoRef.current.find((x) => x.codigo_barras === codigo || x.codigo_proveedor === codigo);
    const mostrar = (q: Producto | null | undefined) => { setRecien(q?.id ?? null); setUltimoEscaneo(conocido && q !== null ? `${q?.descripcion ?? codigo} · ${TEXTOS.vender.sumado.corto}` : null); };
    // Un código que este dispositivo todavía no vio se le pregunta al servidor (specs/018).
    if (p) mostrar(p); else void traerPorCodigo(codigo).then(mostrar, () => mostrar(undefined));
  }, []);
  useEffect(() => {
    if (!recien) return;
    document.querySelector(`[data-producto="${recien}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [recien, items]);
  const cerrarCamara = useCallback(() => { setEscaneando(false); setUltimoEscaneo(null); setRecien(null); }, []);
  // «Asociar»: se cierra la cámara y se busca el producto; al elegirlo, el código queda en él.
  const asociar = () => { cerrarCamara(); setBuscando(true); };

  function teclasBusqueda(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const texto = consulta.trim();
      const alEnter = (lista: Producto[], i: number) => {
        const p = lista[i];
        if (p) elegirSugerencia(p);
        else if (texto && /^[0-9A-Za-z\-]{6,32}$/.test(texto) && !lista.length) agregarPorCodigo(texto); // lector USB
        else if (texto) agregar(null, texto); // ítem libre (#17)
      };
      // Si el servidor todavía no contestó lo escrito, Enter espera esa respuesta (specs/018).
      if (busquedaAlDia(texto)) alEnter(resultados, elegido); else void esperarBusqueda(texto).then((r) => alEnter(r, 0));
    }
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
  }, [resultados.length]), caja.current);

  const faltan = items.filter((it) => precioDe(it).unitario === null);
  const { ultimos } = useSugeridos(catalogo, items.length === 0);
  const veHoy = puedeEsto(...PIDE.hoy);

  return (
    <main className="contenido vender-ancho vm">
      <div className="encabezado">
        <div className="vm-titulo">
          <h1 className="titulo">Vender</h1>
          {emparejado && <button type="button" className="vm-espejo" onClick={() => setHoja("espejo")} data-testid="en-espejo"><Icono nombre="dispositivos" tam={18} />{TEXTOS.vender.enEspejo.corto}</button>}
        </div>
        {/* El estado de la conexión, debajo del título, como en la v2 (decisión 140). */}
        <EstadoDeConexion testId="conexion-vender" />
        {pestanas}
        {escaneando
          ? <Escaner className="vm-camara" seguido alDetectar={alDetectar} alCerrar={cerrarCamara} ultimo={ultimoEscaneo} />
          : (
            <div className="buscador">
              <button type="button" className="caja vm-abrir-busqueda" onClick={() => setBuscando(true)} data-testid="abrir-busqueda">
                <Icono nombre="buscar" tam={20} grosor={2.2} className="lupa" /><span>Producto, código o marca</span>
              </button>
              {hayCamara() && <button type="button" className="escanear" aria-label="Escanear" onClick={() => setEscaneando(true)} data-testid="escanear"><Icono nombre="escanear" tam={22} /></button>}
            </div>
          )}
        {(!hayCamara() || window.innerWidth > 900) && <div className="solo-escritorio"><VincularCelular vinculado={puestoVinculado} alVincular={alVincular} /></div>}
      </div>

      <div className="columna">
        {/* Con la hoja de buscar abierta, el aviso va en la hoja. */}
        <AvisoError texto={buscando ? null : errorCatalogo} />
        {codigoDesconocido && (
          <div className="vm-desconocido" data-testid="codigo-desconocido">
            <Icono nombre="alerta" tam={20} />
            <span><b>Código {codigoDesconocido}</b><small>{TEXTOS.vender.noEstaEnElCatalogo.corto}</small></span>
            {escaneando ? <button type="button" onClick={asociar} data-testid="asociar-codigo">Asociar</button>
              : <button type="button" className="fantasma" onClick={() => setCodigoDesconocido(null)}>Ignorar</button>}
          </div>
        )}

        <div className="vm-cab-lista" data-testid="titulo-venta">
          <h2>Esta venta</h2><span className="vm-cuenta" data-testid="cuantos-en-venta">{items.length}</span>
          {/* Con la venta vacía no se muestran (decisión 126). */}
          {items.length > 0 && <>
            <button type="button" onClick={noLlevo} data-testid="no-llevo"><Icono nombre="prohibido" tam={18} />No llevó</button>
            <button type="button" onClick={vaciar} data-testid="vaciar-venta"><Icono nombre="tacho" tam={18} />Vaciar</button>
          </>}
        </div>

        {items.length === 0 ? (
          <div className="vm-vacia" data-testid="venta-vacia">
            <span className="vm-vacia-icono"><Icono nombre="carrito" tam={26} /></span>
            <b>{TEXTOS.vender.ventaVacia.corto}</b>
            <span>{TEXTOS.vender.comoEmpezar.corto}</span>
          </div>
        ) : items.map((it) => (
          <Renglon key={it.clave} item={it} stock={it.producto ? stockPorId.get(it.producto.id) : undefined} recien={escaneando && Boolean(recien) && it.producto?.id === recien}
            alCambiar={(c) => cambiarItem(it.clave, c)} alQuitar={() => quitar(it)} alElegirMargen={(m) => elegirMargen(it, m)} alCambiarUnidad={(u) => cambiarUnidad(it, u)}
            alAbrir={() => setRenglonAbierto(it.clave)}
            alSubirFoto={it.producto ? async (archivo) => { const foto_url = await subirFoto(it.producto!.id, archivo); actualizarProducto(it.producto!.id, { foto_url } as never).catch(() => undefined); cambiarItem(it.clave, { producto: { ...it.producto!, foto_url } }); } : undefined} />
        ))}
      </div>

      <div className="vm-cobro" data-testid="cobro">
        {/* Los avisos salen abajo, sobre el cobro, como en la v2; se van solos. */}
        <div className="vm-tostada">
          <Toast texto={aviso?.texto ?? mensaje} alCerrar={() => { setAviso(null); setMensaje(null); }} accion={aviso?.deshacer ? { texto: "Deshacer", alTocar: () => { aviso.deshacer!(); setAviso(null); } } : undefined} />
        </div>
        {faltan.length > 0 && <div className="vm-falta"><Icono nombre="alerta" tam={18} />{faltan.length === 1 ? `Falta el precio de ${faltan[0]!.descripcion}` : `Faltan ${faltan.length} precios`}</div>}
        <AvisoError texto={error} />
        <div className="vm-pago">
          <MedioDePago medio={medio} alElegir={elegirMedio} />
          {/* El cliente, al final de la fila: la persona, o sus iniciales si se eligió (decisión 142). */}
          <button type="button" className={`vm-cliente ${cliente ? "elegido" : medio === "cuenta_corriente" ? "falta" : ""}`} onClick={() => setHoja("clientes")} data-testid="cliente"
            aria-label={cliente ? `Cliente: ${cliente.nombre}` : medio === "cuenta_corriente" ? TEXTOS.vender.elegiElCliente.corto : TEXTOS.vender.clienteOpcional.corto} title={cliente?.nombre}>
            {cliente ? <b>{iniciales(cliente.nombre)}</b> : <Icono nombre="persona" tam={20} />}
          </button>
        </div>
        <Deslizar apagado={!items.length || ocupado} ocupado={ocupado} alCobrar={cobrar} alTocar={() => setAviso({ texto: TEXTOS.vender.comoSeCobra.corto })}>
          {ocupado ? <span>Cobrando…</span> : <><span>{TEXTOS.vender.cobrar.corto}</span><span className="importe" data-testid="total">{pesosCortos(total)}</span></>}
        </Deslizar>
      </div>

      {buscando && (
        <BuscarProducto consulta={consulta} alCambiar={setConsulta} onKeyDown={teclasBusqueda} cajaRef={caja} resultados={resultados} elegido={elegido} ultimos={ultimos}
          stock={stockPorId} buscandoEnElServidor={buscandoEnElServidor} error={errorCatalogo} alElegir={elegirSugerencia} alLibre={(t) => agregar(null, t)} alCerrar={cerrarBusqueda} />
      )}
      {hoja === "clientes" && (
        <Hoja titulo={medio === "cuenta_corriente" ? TEXTOS.vender.quienLleva.corto : "Cliente"} alCerrar={() => setHoja(null)} testId="hoja-clientes">
          <ElegirCliente clientes={clientes} elegido={clienteId} alElegir={(id) => { elegirCliente(id); setHoja(null); }} />
        </Hoja>
      )}
      {hoja === "espejo" && (
        <Hoja titulo={TEXTOS.vender.enEspejoConLaCompu.corto} alCerrar={() => setHoja(null)} testId="hoja-espejo">
          <p className="vm-hoja-detalle">{TEXTOS.vender.queEsElEspejo.corto}</p>
          <button type="button" className="boton tinta vm-ancho" onClick={() => { setHoja(null); irA("lector"); }} data-testid="celular-vinculado-remoto"><Icono nombre="escanear" tam={20} />{TEXTOS.vender.usarComoLector.corto}</button>
          <p className="vm-hoja-detalle">{TEXTOS.vender.queHaceElLector.corto}</p>
        </Hoja>
      )}
      {renglon && <HojaDelRenglon item={renglon} alCerrar={() => setRenglonAbierto(null)} alCambiar={(c) => cambiarItem(renglon.clave, c)} alElegirMargen={(m) => elegirMargen(renglon, m)}
        alQuitar={() => { setRenglonAbierto(null); quitar(renglon); }} />}
      {cobro && <VentaRegistrada cobro={cobro} veHoy={veHoy} alCerrar={() => { venta.cerrarCobro(); setMensaje(null); }} alVerHoy={() => { venta.cerrarCobro(); setMensaje(null); irA("vender/hoy"); }} />}
    </main>
  );
}

// La búsqueda, como la hoja de la v2 (decisión 140): la caja con «Cancelar»; vacía, lo último que se
// vendió; escribiendo, cuántos y cada producto en una tarjeta con su foto, marca, stock y precio, y al
// final «Agregar «…»» como ítem libre. Tocar uno lo suma y cierra la hoja.
function BuscarProducto({ consulta, alCambiar, onKeyDown, cajaRef, resultados, elegido, ultimos, stock, buscandoEnElServidor, error, alElegir, alLibre, alCerrar }: {
  consulta: string; alCambiar: (v: string) => void; onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void; cajaRef: React.RefObject<HTMLInputElement>; resultados: Producto[]; elegido: number;
  ultimos: Producto[]; stock: Map<string, number>; buscandoEnElServidor: boolean; error: string | null; alElegir: (p: Producto) => void; alLibre: (texto: string) => void; alCerrar: () => void;
}) {
  const texto = consulta.trim();
  const lista = texto ? resultados : ultimos;
  const rotulo = texto ? (resultados.length ? `${resultados.length} ${resultados.length === 1 ? "producto" : "productos"}` : buscandoEnElServidor ? "Buscando…" : "No está en el catálogo") : ultimos.length ? "Lo último que se vendió" : "";
  return (
    <Hoja alCerrar={alCerrar} testId="hoja-buscar" clase="vm-busca">
      <div className="vm-busca-cab">
        <Buscador valor={consulta} alCambiar={alCambiar} placeholder="Producto, código o marca" onKeyDown={onKeyDown} cajaRef={cajaRef} autoFoco />
        <button type="button" className="vm-cancelar" onClick={alCerrar} data-testid="cancelar-busqueda">Cancelar</button>
      </div>
      <AvisoError texto={error} />
      {rotulo && <p className="vm-busca-rotulo" data-testid="busqueda-rotulo">{rotulo}</p>}
      <ul className="vm-busca-lista" role="listbox" aria-label="Productos" data-testid="sugerencias">
        {lista.map((p, i) => {
          const precio = precioDelProducto(p).valor;
          const hay = stock.get(p.id);
          return (
            <li key={p.id} role="option" aria-selected={Boolean(texto) && i === elegido}>
              <button type="button" className={`vm-r ${texto && i === elegido ? "elegida" : ""}`} onClick={() => alElegir(p)}>
                <span className="miniatura">{p.foto_url ? <img src={p.foto_url.startsWith("/") ? `${import.meta.env.VITE_API_URL}${p.foto_url}` : p.foto_url} alt="" /> : <Icono nombre="caja" tam={22} />}</span>
                <span className="vm-r-texto">
                  <b>{nombreDeProducto(p.descripcion)}</b>
                  <small>{p.marca}{p.marca && hay !== undefined ? " · " : ""}{hay !== undefined && <span className={hay > 0 ? "hay" : "no-hay"}>{hay > 0 ? `${num(hay)} ${abreviarUnidad(p.unidad as Unidad)}` : "sin stock"}</span>}</small>
                </span>
                <strong className={`importe ${precio === null ? "sin" : ""}`}>{precio === null ? "Sin precio" : pesosCortos(precio)}</strong>
              </button>
            </li>
          );
        })}
        {texto && !buscandoEnElServidor && (
          <li>
            <button type="button" className="vm-r" onClick={() => alLibre(texto)} data-testid="agregar-libre">
              <span className="miniatura"><Icono nombre="caja" tam={22} /></span>
              <span className="vm-r-texto"><b>Agregar «{texto}»</b><small>Como ítem libre, con precio a mano</small></span>
              <Icono nombre="mas" tam={20} />
            </button>
          </li>
        )}
      </ul>
    </Hoja>
  );
}

// El medio de pago, como la v4 de «Ventas de hoy» (decisión 142): los cuatro en una fila de
// pastillas; el elegido con su color, el ícono en un círculo lleno y su nombre; los demás, solo el
// ícono. Arranca en Efectivo y vuelve a Efectivo después de cada venta (decisión 37).
function MedioDePago({ medio, alElegir }: { medio: Medio | null; alElegir: (m: Medio) => void }) {
  return (
    <div className="vm-medios-fila" role="radiogroup" aria-label="Cómo paga" data-testid="medio">
      {MEDIOS.map((m) => (
        <button key={m.valor} type="button" role="radio" aria-checked={medio === m.valor} aria-label={m.nombre} title={m.nombre}
          className={`vm-mp medio-${m.valor} ${medio === m.valor ? "elegido" : ""}`} onClick={() => alElegir(m.valor)} data-testid={`medio-${m.valor}`}>
          <IconoDeMedio medio={m.valor} tam={18} />{medio === m.valor && <span>{m.corto}</span>}
        </button>
      ))}
    </div>
  );
}

// Cobrar deslizando (decisión 119): el botón de la v2, «Cobrar» y el total (decisión 140), con un
// círculo que se arrastra hasta el final; soltarlo antes lo devuelve y un toque solo explica cómo
// se cobra. Con el teclado, Enter sobre el círculo cobra.
function Deslizar({ apagado, ocupado, alCobrar, alTocar, children }: { apagado: boolean; ocupado: boolean; alCobrar: () => Promise<void> | void; alTocar: () => void; children: ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const pulgar = useRef<HTMLButtonElement>(null);
  const [x, setX] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inicio = useRef<{ x0: number; movio: boolean } | null>(null);
  const xRef = useRef(0);
  const max = () => Math.max(1, (caja.current?.clientWidth ?? 0) - (pulgar.current?.offsetWidth ?? 0) - 10);
  const mover = (v: number) => { xRef.current = v; setX(v); };
  // Cuando se termina de cobrar (o no se pudo), el círculo vuelve al principio.
  useEffect(() => { if (!ocupado) mover(0); }, [ocupado]);
  const cobrarYVolver = async () => { mover(max()); try { await alCobrar(); } finally { mover(0); } };
  const bajar = (e: EventoDePuntero<HTMLButtonElement>) => {
    if (apagado) return;
    inicio.current = { x0: e.clientX, movio: false };
    setArrastrando(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sin captura, igual sigue */ }
  };
  const moverDedo = (e: EventoDePuntero<HTMLButtonElement>) => {
    const i = inicio.current; if (!i) return;
    const dx = e.clientX - i.x0;
    if (Math.abs(dx) > 6) i.movio = true;
    mover(Math.max(0, Math.min(max(), dx)));
  };
  const soltar = () => {
    const i = inicio.current; inicio.current = null; setArrastrando(false);
    if (!i) return;
    if (xRef.current >= max() * 0.85) void cobrarYVolver();
    else mover(0);
  };
  return (
    <div ref={caja} className={`vm-deslizar ${apagado ? "apagado" : ""}`} data-testid="cobrar">
      <button ref={pulgar} type="button" className="vm-pulgar" style={{ transform: `translateX(${x}px)`, transition: arrastrando ? "none" : undefined }} disabled={apagado}
        aria-label="Cobrar: deslizá hasta el final" data-testid="cobrar-pulgar"
        onPointerDown={bajar} onPointerMove={moverDedo} onPointerUp={soltar} onPointerCancel={soltar}
        onClick={(e) => { if (e.detail > 0 && xRef.current === 0) alTocar(); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void cobrarYVolver(); } }}>
        <Icono nombre={ocupado ? "tilde" : "flecha"} tam={22} grosor={2.4} />
      </button>
      <span className="vm-deslizar-texto" style={{ opacity: 1 - x / max() }}>{children}</span>
    </div>
  );
}

// Un renglón de la venta (decisión 119): la foto, el nombre con su marca y stock y el precio por
// unidad en una pastilla que explica cómo se calculó; abajo la cantidad, la unidad, el margen y el
// total del renglón. Sin precio, los márgenes para elegir ahí mismo.
const POR_UNIDAD: Record<Unidad, string> = { unidad: "cada uno", kg: "el kg", m: "el metro", l: "el litro" };

function Renglon({ item: it, stock, recien, alCambiar, alQuitar, alElegirMargen, alCambiarUnidad, alSubirFoto, alAbrir }: {
  item: Item; stock: number | undefined; recien: boolean; alCambiar: (c: Partial<Item>) => void; alQuitar: () => void; alElegirMargen: (m: number) => void; alCambiarUnidad: (u: Unidad) => void; alSubirFoto?: (archivo: File) => Promise<void>; alAbrir: () => void;
}) {
  const p = precioDe(it);
  const producto = it.producto;
  const renglon = subtotalDe(it);
  const veCostos = useVeCostos();
  const [calculo, setCalculo] = useState(false);
  const sinPrecio = p.unitario === null;
  const noAlcanza = producto && stock !== undefined && it.cantidad > stock;
  const precioAMano = (e: React.ChangeEvent<HTMLInputElement>) => alCambiar({ precioManual: e.target.value === "" ? null : Number(e.target.value.replace(/[^\d]/g, "")) });
  const pasos = [...p.pasos, ...(renglon?.pasos ?? []), ...(renglon ? [`Total del renglón: ${pesos(renglon.valor)}`] : [])];
  return (
    <div className={`vm-renglon ${sinPrecio ? "falta" : ""} ${recien ? "recien" : ""}`} data-testid="item" data-producto={producto?.id}>
      <div className="vm-arriba">
        {producto ? <FotoProducto id={producto.id} url={producto.foto_url ?? null} descripcion={producto.descripcion} alSubir={alSubirFoto} /> : <span className="miniatura foto-chica vm-libre"><Icono nombre="caja" tam={22} /></span>}
        {producto ? (
          <button type="button" className="vm-nombre" onClick={alAbrir} data-testid="abrir-renglon">
            <b>{nombreDeProducto(it.descripcion)}</b>
            <small>{[producto.marca, stock !== undefined ? `${num(stock)} ${abreviarUnidad(it.unidad)}` : null].filter(Boolean).join(" · ")}</small>
          </button>
        ) : (
          <span className="vm-nombre">
            <input className="linea-editable" value={it.descripcion} placeholder="¿Qué se lleva?" onChange={(e) => alCambiar({ descripcion: e.target.value })} data-testid="descripcion-libre" />
            <small>Ítem libre</small>
          </span>
        )}
        {!sinPrecio ? (
          veCostos || it.precioManual !== null
            ? <button type="button" className="vm-precio" onClick={() => setCalculo(true)} aria-label={`Cómo se calculó ${pesosCortos(p.unitario!)}`} data-testid="precio">
                <b>{pesosCortos(p.unitario!)}</b><small>{it.precioManual !== null ? "a mano" : POR_UNIDAD[it.unidad]}</small>
              </button>
            : <span className="vm-precio"><b>{pesosCortos(p.unitario!)}</b><small>{POR_UNIDAD[it.unidad]}</small></span>
        ) : producto ? (
          <span className="vm-precio falta" data-testid="sin-precio"><b>Sin precio</b><small>{veCostos && p.costo !== null ? `costo ${pesosCortos(p.costo)}` : "elegí margen"}</small></span>
        ) : (
          <label className="vm-precio-mano"><span>$</span><input inputMode="numeric" placeholder="precio" autoFocus value={it.precioManual ?? ""} onChange={precioAMano} data-testid="precio-manual" /></label>
        )}
      </div>
      {sinPrecio && producto ? (
        <div className="vm-margenes">
          {p.costo !== null && MARGENES.map((m) => <button key={m} type="button" onClick={() => alElegirMargen(m)} aria-label={`${m} %`}>{m}</button>)}
          <button type="button" onClick={alAbrir} aria-label="Precio a mano">$</button>
        </div>
      ) : (
        <div className="vm-abajo">
          <button type="button" className="vm-tacho" onClick={alQuitar} aria-label={`Quitar ${it.descripcion || "este renglón"} de la venta`} data-testid="quitar-renglon"><Icono nombre="tacho" tam={20} /></button>
          {/* La unidad adentro de la cantidad, como en la v2, y siempre a la vista: se toca para cambiarla (decisión 140). */}
          <Contador valor={it.cantidad} entera={enteras(it.unidad)} alCambiar={(v) => alCambiar({ cantidad: v })} alQuitar={alQuitar}>
            <label className="vm-u">
              <span aria-hidden="true" data-testid="unidad-renglon">{abreviarUnidad(it.unidad)}</span>
              <select value={it.unidad} onChange={(e) => alCambiarUnidad(e.target.value as Unidad)} aria-label="Unidad" data-testid="unidad">
                {UNIDADES.map((u) => <option key={u.valor} value={u.valor}>{u.nombre}</option>)}
              </select>
            </label>
          </Contador>
          {producto && p.costo !== null && (
            <button type="button" className="vm-margen" onClick={alAbrir} aria-label={`Margen: ${it.precioManual !== null ? "a mano" : `${p.margen} %`}`} data-testid="margen">
              {it.precioManual !== null ? "a mano" : `${p.margen} %`}<Icono nombre="abajo" tam={14} grosor={2.6} />
            </button>
          )}
          <span className="vm-subtotal importe" data-testid="subtotal">{renglon ? pesosCortos(renglon.valor) : ""}</span>
        </div>
      )}
      {noAlcanza && (
        <div className="vm-stock" data-testid="stock-no-alcanza"><Icono nombre="alerta" tam={16} />
          {stock! <= 0 ? TEXTOS.vender.sinStock.corto : `Hay ${num(stock!)} ${abreviarUnidad(it.unidad)}: no alcanza para ${num(it.cantidad)}`}
        </div>
      )}
      {calculo && (
        <Hoja titulo="Cómo se calculó" alCerrar={() => setCalculo(false)} testId="hoja-explicacion">
          <p className="vm-hoja-detalle">{nombreDeProducto(it.descripcion)}{producto?.proveedor ? ` · ${producto.proveedor}` : ""}</p>
          <Pasos pasos={pasos} />
          <p className="vm-hoja-detalle">{TEXTOS.vender.redondeo.corto}</p>
          <button type="button" className="boton tinta" onClick={() => setCalculo(false)}>Listo</button>
        </Hoja>
      )}
    </div>
  );
}

// La hoja de un renglón: el margen (cada uno con su precio), el precio a mano, la cantidad y
// «Quitar de la venta».
function HojaDelRenglon({ item: it, alCerrar, alCambiar, alElegirMargen, alQuitar }: { item: Item; alCerrar: () => void; alCambiar: (c: Partial<Item>) => void; alElegirMargen: (m: number) => void; alQuitar: () => void }) {
  const p = precioDe(it);
  const renglon = subtotalDe(it);
  const precioAMano = (e: React.ChangeEvent<HTMLInputElement>) => alCambiar({ precioManual: e.target.value === "" ? null : Number(e.target.value.replace(/[^\d]/g, "")) });
  return (
    <Hoja titulo={nombreDeProducto(it.descripcion)} alCerrar={alCerrar} testId="hoja-renglon">
      <p className="vm-hoja-detalle">{p.unitario === null ? "Sin precio: elegí el margen o ponelo a mano" : `${pesos(p.unitario)} ${POR_UNIDAD[it.unidad]}`}</p>
      {p.costo !== null && (
        <div className="vm-opciones">
          {MARGENES.map((m) => (
            <button key={m} type="button" className={it.precioManual === null && p.margen === m ? "elegido" : ""} onClick={() => alElegirMargen(m)} aria-label={`${m} %`}>
              {m} %<small>{pesosCortos(precioDeVenta({ costoNeto: p.costo!, margen: m, iva: p.iva }).valor)}</small>
            </button>
          ))}
        </div>
      )}
      <label className="vm-fila-mano"><span>Otro precio solo para esta venta</span>
        <span className="vm-precio-mano"><span>$</span><input inputMode="numeric" placeholder="a mano" value={it.precioManual ?? ""} onChange={precioAMano} data-testid="precio-manual" /></span>
      </label>
      <div className="vm-fila-cantidad"><span>Cantidad</span>
        <Contador valor={it.cantidad} entera={enteras(it.unidad)} alCambiar={(v) => alCambiar({ cantidad: v })} testId="cantidad-hoja" />
        <b className="importe">{renglon ? pesosCortos(renglon.valor) : ""}</b>
      </div>
      <button type="button" className="boton vm-quitar vm-ancho" onClick={alQuitar} data-testid="quitar"><Icono nombre="tacho" tam={20} />Quitar de la venta</button>
      <button type="button" className="boton tinta vm-ancho" onClick={alCerrar}>Listo</button>
    </Hoja>
  );
}

// Elegir el cliente: con cualquier medio es opcional; con cuenta corriente, obligatorio.
function ElegirCliente({ clientes, elegido, alElegir }: { clientes: { id: string; nombre: string; deuda: string | number }[]; elegido: string; alElegir: (id: string) => void }) {
  const [texto, setTexto] = useState("");
  const buscado = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const lista = clientes.filter((c) => c.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(buscado));
  return (
    <>
      <Buscador valor={texto} alCambiar={setTexto} placeholder="Buscá por nombre" chico testId="buscar-cliente" />
      <Lista>
        {clientes.length === 0 && <div className="fila"><span className="nombre">Todavía no hay clientes.</span></div>}
        {lista.map((c) => (
          <button key={c.id} type="button" className={`fila ${elegido === c.id ? "elegida" : ""}`} onClick={() => alElegir(c.id)}>
            <span className="nombre">{c.nombre}</span>
            <small style={{ color: Number(c.deuda) > 0 ? "var(--coral-texto)" : undefined }}>{Number(c.deuda) > 0 ? `debe ${pesos(c.deuda)}` : "al día"}</small>
          </button>
        ))}
      </Lista>
      {elegido && <button type="button" className="boton vm-ancho" onClick={() => alElegir("")} data-testid="sin-cliente">Sin cliente</button>}
    </>
  );
}

// La venta registrada (decisión 119): una ventana con el tilde, el total, el medio, el cliente,
// cuántos productos y la hora, «Ver en Ventas del día» y «Seguir vendiendo». Sin conexión dice que
// quedó guardada en el celular y que se envía sola.
function VentaRegistrada({ cobro, veHoy, alCerrar, alVerHoy }: { cobro: Cobro; veHoy: boolean; alCerrar: () => void; alVerHoy: () => void }) {
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => { boton.current?.focus(); }, []);
  const que = cobro.encolado ? TEXTOS.vender.guardadaEnElCelular.corto : TEXTOS.vender.ventaRegistrada.corto;
  return (
    <div className="hoja-fondo vm-listo-fondo" role="presentation">
      <div className="vm-listo" role="dialog" aria-label={que} data-testid="exito">
        <span className={`vm-listo-tilde ${cobro.encolado ? "pendiente" : ""}`}><Icono nombre={cobro.encolado ? "subir" : "tilde"} tam={38} grosor={3} /></span>
        <h2>{que}</h2>
        <div className="vm-listo-total importe" data-testid="exito-total">{pesosCortos(cobro.total)}</div>
        {cobro.encolado && <div className="vm-sin-red"><Icono nombre="alerta" tam={18} />{TEXTOS.vender.seEnviaSola.corto}</div>}
        <p className="vm-listo-detalle">
          <IconoDeMedio medio={cobro.medio} tam={18} />{NOMBRE_DE_MEDIO[cobro.medio]}{cobro.cliente ? ` · ${cobro.cliente}` : ""} · <span data-testid="exito-cuantos">{cobro.productos} {cobro.productos === 1 ? "producto" : "productos"}</span> · {hora(cobro.fecha)}
        </p>
        <div className="vm-listo-botones">
          {veHoy && <button type="button" className="boton" onClick={alVerHoy} data-testid="ver-en-hoy"><Icono nombre="lista" tam={18} />Ver en Ventas del día</button>}
          <button ref={boton} type="button" className="boton tinta" onClick={alCerrar} data-testid="cerrar-exito">Seguir vendiendo</button>
        </div>
      </div>
    </div>
  );
}
