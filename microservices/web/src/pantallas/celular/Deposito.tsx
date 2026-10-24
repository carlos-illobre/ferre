import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { contarAlEspejo, useEspejar } from "../../espejo";
import { detalleDelRegistro, diferenciaConLaLista, useIngreso } from "../../negocio/deposito/ingreso";
import { cantidadContada } from "../../negocio/deposito/inventario";
import { abrirConteo, crearSector as crearSectorNuevo, ordenarSectores, useConteo, useSectores, type Conteo } from "../../negocio/deposito/conteo";
import { AvisoDePedido, Pedidos, usePedidoAIngresar } from "../Pedidos";
import { usePuede, type Permiso } from "../permisos";
import { SinPermiso } from "../SinPermiso";
import { COMPROBANTES } from "../textos";
import { FotoDeProducto } from "./FotoDeProducto";
import { FotoDeFactura, VerComprobante } from "../FotoDeFactura";
import { ErrorApi } from "../../api";
import { busquedaAlDia, esperarBusqueda, productoEnMemoria, traerPorCodigo, traerPorIds, useCatalogo } from "../../catalogo";
import { fecha, pesos, pesosCortos, porcentaje } from "../../formato";
import { irA } from "../../rutas";
import { cantidadValida, conUnidad, enteras, unidadDe } from "../../unidades";
import { AvisoError, Buscador, Contador, Exito, Hoja, Icono, Segmentos, Lista } from "./componentes/base";
import { Pestanas } from "./Pestanas";
import { Stock } from "./Stock";
import { ComprasRecientes } from "./ComprasRecientes";
import { IconoDeDeposito } from "../IconoDeDeposito";
import { TEXTOS } from "../textos";
import "./contar.css";
import { Escaner, hayCamara } from "../../plataforma/camara/Escaner";
import type { Producto } from "./pantallas/Productos";

// Depósito: inventario (cantidades, sin dinero), ingreso de mercadería y conteo por sector. Tres
// sub-pantallas con un segmento arriba (rediseño en mockups/Ferre iOS.html).
// Como la v2 (decisión 148): Stock · Compras · Contar. Compras abre el Ingreso y los Pedidos, que no
// tienen pestaña: se ven con «Compras» marcada.
const SUB = [{ valor: "stock", nombre: "Stock" }, { valor: "compras", nombre: "Compras" }, { valor: "contar", nombre: "Contar" }] as const;
type Sub = (typeof SUB)[number]["valor"] | "ingreso" | "pedidos";
// Lo que pide cada pantalla (RF-72). El stock lo ve cualquiera con sesión.
const PIDE: Partial<Record<Sub, Permiso[]>> = { compras: ["negocio.gastos", "deposito.compras", "deposito.ingresos", "deposito.pedidos"], pedidos: ["deposito.pedidos", "deposito.ingresos"], ingreso: ["deposito.ingresos"], contar: ["deposito.stock"] };
const TODAS: Sub[] = ["stock", "compras", "contar", "ingreso", "pedidos"];
const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");

export function Deposito({ sub }: { sub: string | null }) {
  const puedeEsto = usePuede();
  const permitida = (s: Sub) => puedeEsto(...(PIDE[s] ?? []));
  // Al entrar a Depósito desde el menú se abre siempre la primera pestaña que la persona puede
  // usar (decisión 56); las demás se eligen arriba.
  const actual: Sub = TODAS.find((s) => s === sub) ?? SUB.find((s) => permitida(s.valor))?.valor ?? "stock";
  const pestana = actual === "ingreso" || actual === "pedidos" ? "compras" : actual;
  if (!permitida(actual)) return <SinPermiso falta={PIDE[actual]!} />;
  return (
    <main className="contenido">
      <div className="encabezado">
        <h1 className="titulo">Depósito</h1>
        <Pestanas opciones={SUB.filter((s) => permitida(s.valor)).map((s) => ({ valor: s.valor, nombre: s.nombre, icono: s.valor }))} actual={pestana} alElegir={(v) => irA(`deposito/${v}`)} />
      </div>
      {actual === "pedidos" ? <Pedidos celular alIngresar={(id) => irA(`deposito/ingreso?pedido=${id}`)} /> : actual === "stock" ? <Stock /> : actual === "ingreso" ? <Ingreso />
        : actual === "compras" ? (puedeEsto("negocio.gastos", "deposito.compras") ? <ComprasRecientes /> : <Ingreso />) : <Contar />}
    </main>
  );
}

// ---------- Ingreso de mercadería ----------
// Ingreso de mercadería (issue #30): proveedor y comprobante → renglones con la búsqueda
// de siempre → registrar. Suma stock y, si la factura trae otro costo, ese pasa a ser el
// vigente. Reemplaza el papel semanal de gastos.
function Ingreso() {
  // Si se viene de un pedido (RF-55), el ingreso arranca con su proveedor y con lo que falta llegar.
  const { pedido, error: errorPedido } = usePedidoAIngresar();
  const ingreso = useIngreso({ lado: "celular", costoATexto: String, pedido, textoSinConexion: "Sin conexión con el servidor. Registrar una compra necesita internet." });
  const { catalogo, errorCatalogo, proveedor, proveedorId, setProveedorId, comprobante, setComprobante, foto, setFoto, fechaCompra, setFechaCompra, consulta, setConsulta, resultados, renglones, agregar, cambiar, cambiarCosto, cambiarFoto, quitar, total, ocupado } = ingreso;
  const proveedores = ingreso.proveedores ?? [];
  const { buscandoEnElServidor } = useCatalogo();
  const [elegido, setElegido] = useState(0);
  // Lo que falta para registrar se dice al intentarlo y se va al corregir lo cargado.
  const [aviso, setAviso] = useState<string | null>(null);
  const error = aviso ?? ingreso.error;
  const setError = (texto: string | null) => { setAviso(texto); if (texto === null) ingreso.setError(null); };
  const [hoja, setHoja] = useState<"proveedores" | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [exito, setExito] = useState<{ total: number; proveedor: string; detalle: string } | null>(null);
  const caja = useRef<HTMLInputElement>(null);

  useEffect(() => { setElegido(0); }, [consulta]);
  useEffect(() => { setAviso(null); }, [proveedorId, renglones]);

  const alDetectar = useCallback((codigo: string) => {
    ingreso.agregarPorCodigo(codigo).then((agregado) => {
      if (agregado) setEscaneando(false); else setAviso(`El código ${codigo} no está en el catálogo: buscalo por nombre.`);
    }).catch((e: Error) => setAviso(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingreso.agregarPorCodigo]);

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const texto = consulta.trim(); if (!busquedaAlDia(texto, proveedor?.id)) { void esperarBusqueda(texto, 16, proveedor?.id).then((r) => (r[0] ? agregar(r[0]) : agregar(null, texto))); return; } if (resultados[elegido]) agregar(resultados[elegido]); else if (texto) agregar(null, texto); }
    else if (e.key === "Escape") setConsulta("");
  }

  async function confirmar() {
    if (ocupado) return;
    if (ingreso.falta === "proveedor") { setAviso("Elegí el proveedor."); setHoja("proveedores"); return; }
    if (ingreso.falta === "productos") { setAviso("La compra no tiene productos."); return; }
    if (ingreso.falta === "renglones") { setAviso("Hay renglones sin costo o sin descripción."); return; }
    const registro = await ingreso.registrar();
    if (!registro) return;
    setExito({ total: registro.total, proveedor: registro.proveedor, detalle: detalleDelRegistro(registro) });
    if (registro.dePedido) irA("deposito/ingreso");
  }

  return (
    <>
      <AvisoError texto={error ?? errorCatalogo} alCerrar={() => setError(null)} />
      <AvisoDePedido pedido={pedido} error={errorPedido} />
      <div className="lateral">
      <div className="columna al-costado">
      <div className="formulario">
        <button type="button" className="renglon" onClick={() => setHoja("proveedores")} data-testid="proveedor">
          <span>Proveedor</span><span className={`valor ${proveedor ? "" : "falta"}`}>{proveedor ? proveedor.nombre : "Elegir"}<Icono nombre="derecha" tam={14} grosor={2.5} /></span>
        </button>
        <div className="renglon"><span>Comprobante</span><div style={{ width: 220 }}><Segmentos chico opciones={COMPROBANTES.map((c) => ({ valor: c.valor, nombre: c.corto }))} actual={comprobante} alElegir={setComprobante} /></div></div>
        {comprobante !== "sin_comprobante" && <div style={{ padding: "10px 16px" }}><FotoDeFactura foto={foto} alCambiar={setFoto} nombre={comprobante === "remito" ? "remito" : "factura"} /></div>}
        <label className="renglon"><span>Fecha</span><input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} /></label>
      </div>
      </div>
      <div className="columna">
      <Buscador chico valor={consulta} alCambiar={setConsulta} placeholder={"Producto que llegó"} onKeyDown={teclas} cajaRef={caja} alEscanear={hayCamara() ? () => setEscaneando(true) : undefined} />
      {escaneando && <Escaner alDetectar={alDetectar} alCerrar={() => setEscaneando(false)} />}
      {consulta.trim() && (
        <Lista data-testid="sugerencias">
          {resultados.map((p, i) => (
            <button key={p.id} type="button" className={`fila ${i === elegido ? "elegida" : ""}`} onMouseDown={(e) => { e.preventDefault(); agregar(p); }}>
              <span className="nombre">{p.descripcion}</span>
              <strong className="derecha importe" style={{ fontSize: 20 }}>{p.costo_neto ? pesos(p.costo_neto) : "—"}</strong>
              <span className="detalle">{detalleDe(p)}</span>
            </button>
          ))}
          {resultados.length === 0 && !buscandoEnElServidor && (
            <button type="button" className="fila" onClick={() => agregar(null, consulta.trim())} data-testid="agregar-nuevo">
              <span className="nombre">Agregar “{consulta.trim()}” como producto nuevo</span><span /><span className="detalle">Le ponés el costo de la factura.</span>
            </button>
          )}
        </Lista>
      )}
      {renglones.map((r) => {
        const dif = diferenciaConLaLista(r);
        const unidad = unidadDe(r.producto);
        return (
          <div key={r.clave} className="tarjeta" data-testid="renglon">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              {r.producto && <FotoDeProducto producto={r.producto} alCambiar={(f) => cambiarFoto(r, f)} />}
              {r.producto ? <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontWeight: 600, lineHeight: 1.25 }}>{r.descripcion}</span><small>{detalleDe(r.producto)}</small></span>
                : <input className="linea-editable" value={r.descripcion} placeholder="Descripción del producto nuevo" onChange={(e) => cambiar(r.clave, { descripcion: e.target.value })} data-testid="descripcion-nueva" />}
              <button type="button" className="quitar tacho" onClick={() => quitar(r.clave)} aria-label={`Quitar ${r.descripcion || "el producto"} del ingreso`} title="Quitar del ingreso" data-testid="quitar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Contador valor={r.cantidad} entera={enteras(unidad)} alCambiar={(v) => cambiar(r.clave, { cantidad: enteras(unidad) ? Math.floor(v) : cantidadValida(String(v), unidad) })}>{!enteras(unidad) && <span className="unidad" style={{ padding: "0 10px 0 4px", fontSize: 14, color: "var(--gris)" }}>{unidad === "l" ? "L" : unidad}</span>}</Contador>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <label className={`campo importe-campo ${r.costo === null ? "falta" : ""}`}><span>costo $</span><input inputMode="decimal" placeholder="0" value={r.costoTexto} onChange={(e) => cambiarCosto(r.clave, e.target.value)} data-testid="costo" /></label>
                <small style={{ fontWeight: 600, color: dif !== null && dif > 0.05 ? "var(--coral-texto)" : undefined }}>{r.costoLista === null ? "sin lista previa" : dif === null ? `según lista ${pesos(r.costoLista)}` : Math.abs(dif) < 0.05 ? `igual que la lista (${pesos(r.costoLista)})` : `${porcentaje(dif)} vs. lista ${pesos(r.costoLista)}`}</small>
              </div>
            </div>
          </div>
        );
      })}
      {renglones.length > 0 && (
        <button type="button" className="boton coral principal" onClick={confirmar} disabled={ocupado} data-testid="registrar">
          <span>Registrar ingreso</span><span className="importe" data-testid="total">{pesosCortos(total)}</span>
        </button>
      )}
      </div>
      </div>
      {hoja === "proveedores" && (
        <Hoja titulo="¿De qué proveedor llegó?" alCerrar={() => setHoja(null)} testId="hoja-proveedores">
          <Lista>
            {proveedores.map((p) => <button key={p.id} type="button" className={`fila ${proveedorId === p.id ? "elegida" : ""}`} onClick={() => { setProveedorId(p.id); setHoja(null); }} data-testid="opcion-proveedor"><span className="nombre">{p.nombre}</span></button>)}
          </Lista>
        </Hoja>
      )}
      {exito && <Exito que="Ingreso registrado" importe={pesosCortos(exito.total)} medio={exito.proveedor} detalle={exito.detalle} boton="Listo" alCerrar={() => setExito(null)} />}
    </>
  );
}

// ---------- Contar ----------

// Conteo cíclico con el celular (issue #31), con una mano: elegir sector → buscar o
// escanear → cuántas hay → siguiente. El sector queda abierto hasta cerrarlo; al cerrar,
// las diferencias contra el stock teórico se aplican como ajustes explicados.
function Contar() {
  const { sectores: traidos, error: fallo, recargar: cargarSectores } = useSectores();
  const sectores = traidos ?? [];
  const [conteo, setConteo] = useState<Conteo | null>(null);
  // El aviso se puede cerrar; vuelve si el próximo pedido falla de nuevo.
  const [cerrado, setCerrado] = useState<unknown>(null);
  const [aviso, setError] = useState<string | null>(null);
  const error = aviso ?? (!fallo || fallo === cerrado ? null : fallo instanceof ErrorApi ? fallo.message : "Sin conexión con el servidor.");
  const [nuevo, setNuevo] = useState(false);
  // El conteo a medias, para mostrar cuánto falta: retomarlo solo lo trae, no cambia nada.
  const enCurso = ordenarSectores(sectores).find((s) => s.conteo_abierto) ?? null;
  const [retomable, setRetomable] = useState<Conteo | null>(null);
  useEffect(() => { if (enCurso && retomable?.sector_id !== enCurso.id) abrirConteo(enCurso.id).then(setRetomable).catch(() => undefined); }, [enCurso, retomable?.sector_id]);

  async function abrir(sectorId: string) {
    try {
      setConteo(await abrirConteo(sectorId));
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }
  async function crearSector(nombre: string) {
    try {
      const id = await crearSectorNuevo(nombre);
      setNuevo(false);
      await abrir(id);
    } catch (err) { setError((err as Error).message); }
  }

  if (conteo) return <ConteoDeSector conteo={conteo} alActualizar={setConteo} alSalir={() => { setConteo(null); setRetomable(null); void cargarSectores(); }} />;

  // Como la v2 (decisión 148): primero el conteo a medias, con su avance y «Seguir contando» al
  // pulgar; después lo que toca hoy y los sectores con su estado.
  const ordenados = ordenarSectores(sectores);
  const contados = ordenados.filter((s) => s.ultimo_conteo !== null).length;
  const avance = retomable ? retomable.renglones.length / Math.max(1, retomable.renglones.length + retomable.sin_contar.length) : 0;
  const tc = TEXTOS.contar;
  return (
    <div className="ctc">
      <AvisoError texto={error} alCerrar={() => { setError(null); setCerrado(fallo); }} />
      {enCurso && (
        <button type="button" className="ctc-seguir" onClick={() => void abrir(enCurso.id)} data-testid="segui-donde-quedaste">
          <span className="ctc-anillo" style={{ background: `conic-gradient(var(--p-naranja) ${avance * 360}deg, var(--p-relleno) 0)` }}><span>{retomable ? `${Math.round(avance * 100)}%` : "—"}</span></span>
          <span className="ctc-seguir-texto"><em><IconoDeDeposito nombre="pause" tam={16} />{tc.seguiDondeQuedaste.corto}</em><b>{enCurso.nombre}</b>
            <span>{retomable ? `Faltan ${retomable.sin_contar.length}${retomable.abierto_en ? ` · abierto el ${fecha(retomable.abierto_en).slice(0, 5)}` : ""}` : `${enCurso.productos} productos`}</span></span>
        </button>
      )}
      <div className="ctc-hoy" data-testid="hoy-toca">
        <div className="ctc-hoy-cab"><IconoDeDeposito nombre="calendar-check" /><b>{tc.hoyTocaContar.corto} —</b></div>
        <span className="ctc-riel" />
      </div>
      <div className="ctc-cab"><h2>{tc.sectores.corto}</h2><span>{contados} de {ordenados.length} contados</span>
        <button type="button" className="ctc-mas" onClick={() => setNuevo(true)} aria-label="Sector nuevo" data-testid="sector-nuevo"><IconoDeDeposito nombre="plus" /></button></div>
      <ul className="ctc-lista" data-testid="sectores">
        {ordenados.filter((s) => s.id !== enCurso?.id).map((s) => {
          const clase = s.conteo_abierto ? "en-curso" : s.ultimo_conteo === null ? "nunca" : "contado";
          return (
            <li key={s.id}>
              <button type="button" className="ctc-sector" onClick={() => void abrir(s.id)} data-testid="sector">
                <span className={`ctc-ico ${clase}`}><IconoDeDeposito nombre={s.conteo_abierto ? "pause" : s.ultimo_conteo === null ? "circle-dashed" : "check"} /></span>
                <span className="ctc-texto"><b>{s.nombre}</b><span><em className={clase}>{s.conteo_abierto ? tc.enCurso.corto : s.ultimo_conteo === null ? tc.nuncaContado.corto : `Contado el ${fecha(s.ultimo_conteo).slice(0, 5)}`}</em> · {s.productos}</span></span>
                <IconoDeDeposito nombre="chevron-right" className="ctc-flecha" />
              </button>
            </li>
          );
        })}
      </ul>
      {enCurso && (
        <div className="ctc-pie">
          <button type="button" className="ctc-escanear" onClick={() => void abrir(enCurso.id)} aria-label={`Escanear en ${enCurso.nombre}`}><IconoDeDeposito nombre="scan-barcode" tam={26} /></button>
          <button type="button" className="ctc-seguir-boton" onClick={() => void abrir(enCurso.id)} data-testid="seguir-contando">{tc.seguirContando.corto}<IconoDeDeposito nombre="arrow-right" /></button>
        </div>
      )}
      {nuevo && (
        <Hoja titulo="Sector nuevo" alCerrar={() => setNuevo(false)}>
          <form className="formulario" onSubmit={(e) => { e.preventDefault(); const n = String(new FormData(e.currentTarget).get("nombre") ?? "").trim(); if (n) void crearSector(n); }}>
            <label className="renglon"><span>Nombre</span><input name="nombre" placeholder="Sector nuevo (Estantería 1, Pared herramientas…)" required autoFocus /></label>
            <div className="acciones" style={{ padding: "12px 0" }}><button type="submit" className="boton tinta">Agregar sector</button></div>
          </form>
        </Hoja>
      )}
    </div>
  );
}

function ConteoDeSector({ conteo, alActualizar, alSalir }: { conteo: Conteo; alActualizar: (c: Conteo) => void; alSalir: () => void }) {
  const { catalogo, buscarProductos } = useCatalogo();
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [resultado, setResultado] = useState<{ ajustados: number; puestos_en_cero: number; contados: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const cajaCantidad = useRef<HTMLInputElement>(null);

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 6) : []), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);
  // La búsqueda no toma el foco sola (abriría el teclado y taparía el menú); la cantidad sí, porque se acaba de elegir el producto.
  useEffect(() => { if (producto) cajaCantidad.current?.focus(); }, [producto]);

  const { contadoPorId, contar, cerrar: cerrarConteo } = useConteo(conteo, alActualizar);

  function elegirProducto(p: Producto) {
    setProducto(p);
    const previo = contadoPorId.get(p.id);
    setCantidad(previo ? String(Number(previo.cantidad_contada)) : "");
    setConsulta("");
  }
  const alDetectar = useCallback((codigo: string) => {
    void traerPorCodigo(codigo).then((p) => {
      if (p) { setEscaneando(false); elegirProducto(p); } else setError(`El código ${codigo} no está en el catálogo: buscalo por nombre.`);
    }).catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo]);
  function teclasBusqueda(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && !busquedaAlDia(consulta)) { e.preventDefault(); void esperarBusqueda(consulta).then((r) => { if (r[0]) elegirProducto(r[0]); }); }
    else if (e.key === "Enter" && resultados[elegido]) { e.preventDefault(); elegirProducto(resultados[elegido]!); }
    else if (e.key === "Escape") setConsulta("");
  }
  async function guardar() {
    if (!producto) return;
    const n = cantidadContada(cantidad, producto);
    if (Number.isNaN(n)) { setError("Escribí cuántas hay."); return; }
    try {
      await contar(producto, n);
      setError(null); setProducto(null); setCantidad("");
    } catch (e) { setError((e as Error).message); }
  }
  async function cerrar(faltantesEnCero: boolean) {
    try {
      setResultado(await cerrarConteo(faltantesEnCero)); setCerrando(false);
    } catch (e) { setError((e as Error).message); }
  }

  const cabecera = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <button type="button" className="enlace" style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={alSalir} title="El sector queda abierto para seguir después"><Icono nombre="izquierda" tam={18} grosor={2.5} />Sectores</button>
      <strong role="heading" aria-level={2}>{conteo.sector}</strong>
    </div>
  );

  if (resultado) {
    return (
      <>
        {cabecera}
        <div className="tarjeta tarjeta-resultado">
          <div className="tilde"><Icono nombre="tilde" tam={30} grosor={3} className="" /></div>
          <strong>{conteo.sector} cerrado</strong>
          <p className="subtitulo" role="status" data-testid="resultado-conteo">{resultado.contados} productos contados, {resultado.ajustados} con diferencia ajustada{resultado.puestos_en_cero ? `, ${resultado.puestos_en_cero} puestos en cero` : ""}.</p>
          <button type="button" className="boton tinta" onClick={alSalir}>Contar otro sector</button>
        </div>
      </>
    );
  }

  return (
    <>
      {cabecera}
      <AvisoError texto={error} alCerrar={() => setError(null)} />
      <div className="lateral">
      <div className="columna al-costado">
      {producto ? (
        <div className="contando" data-testid="contando">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 18, fontWeight: 600 }}>{producto.descripcion}</span><small>{[producto.marca, producto.codigo_proveedor].filter(Boolean).join(" · ")}{contadoPorId.get(producto.id) ? ` · teórico ${conUnidad(contadoPorId.get(producto.id)!.stock_teorico, producto.unidad)}` : ""}</small></div>
          <label className="cuantas">¿Cuántas hay?
            <input ref={cajaCantidad} inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value.replace(/[^\d]/g, ""))} placeholder="0"
              onKeyDown={(e) => { if (e.key === "Enter") void guardar(); if (e.key === "Escape") setProducto(null); }} data-testid="cantidad" />
          </label>
          <div className="acciones auto-1fr">
            <button type="button" className="boton gris-oscuro" onClick={() => setProducto(null)}>Cancelar</button>
            <button type="button" className="boton coral" style={{ height: 50 }} onClick={guardar} data-testid="siguiente">Siguiente</button>
          </div>
        </div>
      ) : (
        <>
          <Buscador valor={consulta} alCambiar={setConsulta} placeholder={"Buscá o escaneá el producto"} onKeyDown={teclasBusqueda} cajaRef={caja} alEscanear={hayCamara() ? () => setEscaneando(true) : undefined} />
          {escaneando && <Escaner alDetectar={alDetectar} alCerrar={() => setEscaneando(false)} />}
          {resultados.length > 0 && (
            <Lista data-testid="sugerencias">
              {resultados.map((p, i) => (
                <button key={p.id} type="button" className={`fila ${i === elegido ? "elegida" : ""}`} onMouseDown={(e) => { e.preventDefault(); elegirProducto(p); }}>
                  <span className="nombre">{p.descripcion}</span>
                  <small className="derecha" style={{ color: "var(--coral-texto)", fontWeight: 600 }}>{contadoPorId.has(p.id) ? `ya: ${conUnidad(contadoPorId.get(p.id)!.cantidad_contada, p.unidad)}` : ""}</small>
                  <span className="detalle">{detalleDe(p)}</span>
                </button>
              ))}
            </Lista>
          )}
        </>
      )}
      </div>
      <div className="columna">
      <h2 className="seccion"><span>Contados · {conteo.renglones.length}</span><span className="suave">{conteo.sin_contar.length} sin contar</span></h2>
      {conteo.renglones.length === 0 ? <div className="aviso-suave">Todavía nada. Buscá el primer producto de la estantería.</div> : (
        <Lista data-testid="contados">
          {conteo.renglones.map((r) => {
            const dif = Number(r.cantidad_contada) - Number(r.stock_teorico);
            return (
              <button key={r.producto_id} type="button" className="fila" role="row" aria-label={r.descripcion} onClick={() => { void traerPorIds([r.producto_id]).then(() => { const p = productoEnMemoria(r.producto_id); if (p) elegirProducto(p); }); }}>
                <span className="nombre">{r.descripcion}</span>
                <span className="derecha" style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}><strong className="importe" style={{ fontSize: 22 }}>{conUnidad(r.cantidad_contada, r.unidad)}</strong><small style={{ fontWeight: 700, color: dif === 0 ? undefined : "var(--coral-texto)", minWidth: 24, textAlign: "right" }}>{dif === 0 ? "=" : dif > 0 ? `+${dif}` : dif}</small></span>
                <span className="detalle">{r.marca ?? ""}{r.marca ? " · " : ""}teórico {conUnidad(r.stock_teorico, r.unidad)}</span>
              </button>
            );
          })}
        </Lista>
      )}
      {conteo.sin_contar.length > 0 && (
        <>
          <h2 className="seccion">Del sector, sin contar todavía</h2>
          <Lista>{conteo.sin_contar.map((p) => <div key={p.producto_id} className="fila"><span className="nombre">{p.descripcion}</span><small className="derecha">teórico {conUnidad(p.stock_teorico, p.unidad)}</small></div>)}</Lista>
        </>
      )}
      {conteo.renglones.length > 0 && !cerrando && <button type="button" className="boton tinta principal centrado" onClick={() => setCerrando(true)} data-testid="cerrar">Cerrar {conteo.sector}</button>}
      {cerrando && (
        <div className="tarjeta" data-testid="confirmar-cierre">
          <p>Cada diferencia se aplica al stock como ajuste explicado.{conteo.sin_contar.length > 0 ? ` Hay ${conteo.sin_contar.length} ${conteo.sin_contar.length === 1 ? "producto" : "productos"} del sector que no contaste.` : ""}</p>
          {conteo.sin_contar.length > 0 && <button type="button" className="boton coral" onClick={() => cerrar(true)}>Cerrar y poner en cero los no contados</button>}
          <button type="button" className="boton tinta" onClick={() => cerrar(false)} data-testid="cerrar-confirmar">{conteo.sin_contar.length > 0 ? "Cerrar y dejar los no contados como están" : "Sí, cerrar"}</button>
          <button type="button" className="boton texto gris" onClick={() => setCerrando(false)}>Volver</button>
        </div>
      )}
      </div>
      </div>
    </>
  );
}

