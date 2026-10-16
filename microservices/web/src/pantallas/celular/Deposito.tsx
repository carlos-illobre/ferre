import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { contarAlEspejo, useEspejar } from "../../espejo";
import { detalleDelRegistro, diferenciaConLaLista, useIngreso } from "../../negocio/deposito/ingreso";
import { cantidadContada, nombreDeMovimiento, productosConStock, useCorregirStock, useMovimientos, useStock, type StockFila } from "../../negocio/deposito/inventario";
import { abrirConteo, crearSector as crearSectorNuevo, useConteo, useSectores, type Conteo } from "../../negocio/deposito/conteo";
import { AvisoDePedido, Pedidos, usePedidoAIngresar } from "../Pedidos";
import { usePuede, type Permiso } from "../permisos";
import { SinPermiso } from "../SinPermiso";
import { COMPROBANTES, MOTIVOS_DE_AJUSTE, TEXTOS } from "../textos";
import { FotoDeProducto } from "./FotoDeProducto";
import { FotoDeFactura, VerComprobante } from "../FotoDeFactura";
import { ErrorApi } from "../../api";
import { traerPorCodigo, traerPorIds, useCatalogo } from "../../catalogo";
import { fecha, pesos, pesosCortos, porcentaje } from "../../formato";
import { irA } from "../../rutas";
import { cantidadValida, enteras, unidadDe } from "../../unidades";
import { AvisoError, Buscador, Contador, Exito, Hoja, Icono, Segmentos, Toast, Lista } from "./componentes/base";
import { Pestanas } from "./Pestanas";
import { Escaner, hayCamara } from "../../plataforma/camara/Escaner";
import type { Producto } from "./pantallas/Productos";

// Depósito: inventario (cantidades, sin dinero), ingreso de mercadería y conteo por sector. Tres
// sub-pantallas con un segmento arriba (rediseño en mockups/Ferre iOS.html).
// Primero lo que más se hace: recibir mercadería; después mirar el stock y, cada tanto, contar.
// El orden lo eligió Carlos (decisión 68).
const SUB = [{ valor: "stock", nombre: "Inventario" }, { valor: "ingreso", nombre: "Ingreso" }, { valor: "contar", nombre: "Estanterías" }, { valor: "pedidos", nombre: "Pedidos" }] as const;
type Sub = (typeof SUB)[number]["valor"];
// Lo que pide cada pestaña (RF-72). El inventario lo ve cualquiera con sesión.
const PIDE: Partial<Record<Sub, Permiso[]>> = { pedidos: ["deposito.pedidos", "deposito.ingresos"], ingreso: ["deposito.ingresos"], contar: ["deposito.stock"] };
const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");
const num = (n: number) => n.toLocaleString("es-AR");

export function Deposito({ sub }: { sub: string | null }) {
  const puedeEsto = usePuede();
  const permitida = (s: Sub) => puedeEsto(...(PIDE[s] ?? []));
  // Al entrar a Depósito desde el menú se abre siempre la primera pestaña que la persona puede
  // usar (decisión 56); las demás se eligen arriba.
  const actual: Sub = SUB.find((s) => s.valor === sub)?.valor ?? SUB.find((s) => permitida(s.valor))?.valor ?? "stock";
  if (!permitida(actual)) return <SinPermiso falta={PIDE[actual]!} />;
  return (
    <main className="contenido">
      <div className="encabezado">
        <h1 className="titulo">Depósito</h1>
        <Pestanas opciones={SUB.filter((s) => permitida(s.valor)).map((s) => ({ valor: s.valor, nombre: s.nombre, icono: s.valor === "ingreso" ? "compras" : s.valor === "pedidos" ? "listas" : s.valor }))} actual={actual} alElegir={(v) => irA(`deposito/${v}`)} />
      </div>
      {actual === "pedidos" ? <Pedidos celular alIngresar={(id) => irA(`deposito/ingreso?pedido=${id}`)} /> : actual === "stock" ? <Stock /> : actual === "ingreso" ? <Ingreso /> : <Contar />}
    </main>
  );
}

// ---------- Stock ----------
// Inventario: cuánto hay de cada producto, explicado con sus movimientos. El dinero invertido,
// en total y por producto, solo con «Ver el dinero invertido» (decisión 90).
function Stock() {
  const { catalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const { datos, porId, error: fallo } = useStock();
  const veInvertido = usePuede()("negocio.invertido");
  // El aviso se puede cerrar; vuelve si el próximo pedido falla de nuevo.
  const [cerrado, setCerrado] = useState<unknown>(null);
  const error = !fallo || fallo === cerrado ? null : fallo instanceof ErrorApi ? fallo.message : "Sin conexión con el servidor.";
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState(false);

  const filas = useMemo(() => {
    if (!catalogo) return [];
    return consulta.trim() ? buscarProductos(consulta, 100) : productosConStock(catalogo, porId).slice(0, 100);
  }, [catalogo, consulta, buscarProductos, porId]);

  return (
    <>
      <AvisoError texto={error} alCerrar={() => setCerrado(fallo)} />
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      <div className="lateral">
      <div className="columna al-costado">
      </div>
      <div className="columna">
      <Buscador chico valor={consulta} alCambiar={(v) => { setConsulta(v); setAbierto(null); }} placeholder="Buscar para ver o corregir el stock" alEscanear={hayCamara() ? () => setEscaneando(true) : undefined} />
      {escaneando && <Escaner alDetectar={(codigo) => { setEscaneando(false); setConsulta(codigo); setAbierto(null); }} alCerrar={() => setEscaneando(false)} />}
      <p className="subtitulo">El stock es la suma de compras, ventas y ajustes desde que se usa el sistema. Hasta el conteo, lo que no se cargó no está.</p>
      {veInvertido && datos && (
        <div className="tarjeta dinero-invertido-stock" data-testid="dinero-invertido-stock">
          <small>Dinero invertido</small>
          <strong className="importe">{pesosEnteros(datos.valor_total)}</strong>
        </div>
      )}
      <Lista data-testid="tabla-stock">
        {filas.map((p) => <FilaStock key={p.id} veInvertido={veInvertido} alFoto={(f) => { actualizarProducto(p.id, { foto_url: f }).catch(() => undefined); }} producto={p} fila={porId.get(p.id) ?? null} abierto={abierto === p.id} alAbrir={() => setAbierto(abierto === p.id ? null : p.id)} alAjustar={setMensaje} />)}
      </Lista>
      {consulta.trim() && filas.length === 0 && catalogo && <div className="aviso-suave">Nada con "{consulta}".</div>}
      </div>
      </div>
    </>
  );
}

function FilaStock({ producto: p, fila, abierto, alAbrir, alAjustar, alFoto, veInvertido }: { veInvertido: boolean; alFoto: (foto_url: string) => void; producto: Producto; fila: StockFila | null; abierto: boolean; alAbrir: () => void; alAjustar: (mensaje: string) => void }) {
  const corrige = usePuede()("deposito.stock");
  const cantidad = fila ? Number(fila.stock) : 0;
  const { movimientos: traidos, error: sinMovimientos } = useMovimientos(p.id, abierto);
  const movimientos = traidos ?? (sinMovimientos ? [] : null);
  const { faltaEn, corregir } = useCorregirStock(p);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [real, setReal] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!abierto) setCorrigiendo(false); }, [abierto]);

  async function guardar() {
    const falta = faltaEn(real, motivo);
    if (falta?.real) { setError(TEXTOS.inventario.faltaCuantasHay.corto); return; }
    // El motivo es obligatorio, igual que en la computadora (RF-53).
    if (falta?.motivo) { setError(TEXTOS.inventario.faltaElMotivo.corto); return; }
    try {
      const { hay } = await corregir(real, motivo);
      setCorrigiendo(false); setError(null);
      const dif = hay - cantidad;
      alAjustar(dif === 0 ? "Sin diferencia: el stock ya decía eso." : `Stock corregido a ${num(hay)} (${dif > 0 ? "+" : ""}${num(dif)}).`);
    } catch (e) { setError((e as Error).message); }
  }
  const nombreTipo = nombreDeMovimiento;
  const unidad = p.unidad === "unidad" ? "u." : p.unidad === "l" ? "L" : p.unidad;

  return (
    <div className={`fila-stock ${abierto ? "abierta" : ""}`} data-testid="fila-stock">
      <div className="con-foto-de-producto">
      <FotoDeProducto producto={p} alCambiar={alFoto} />
      <button type="button" className="fila" onClick={alAbrir} data-testid="stock" aria-expanded={abierto}>
        <span className="nombre">{p.descripcion}</span>
        <span className="derecha">
          <strong className="importe" style={{ fontSize: 24, color: cantidad < 0 ? "var(--coral-texto)" : undefined }}>{num(cantidad)} {unidad}</strong>
          {veInvertido && <small className="valor-stock" data-testid="valor-stock">{fila?.costo_neto == null || Number(fila.valor) <= 0 ? "—" : pesosEnteros(Number(fila.valor))}</small>}
        </span>
        <span className="detalle">{detalleDe(p)}{fila?.ultimo_movimiento ? ` · último ${fecha(fila.ultimo_movimiento.slice(0, 10))}` : ""}</span>
      </button>
      </div>
      {abierto && (
        <div className="detalle-stock" style={{ display: "flex", flexDirection: "column", gap: 10, animation: "aparecer .2s" }} data-testid="detalle-stock">
          <small>Stock {num(cantidad)} = suma de estos movimientos</small>
          {movimientos === null ? <small>Cargando…</small> : movimientos.length === 0 ? <small>Sin movimientos.</small> : (
            <div className="movimientos" data-testid="movimientos">
              {movimientos.map((m) => (
                <div key={m.id}><span style={{ color: "var(--gris)" }}>{fecha(m.fecha.slice(0, 10))}</span><span>{nombreTipo(m)}{m.nota ? ` · ${m.nota}` : ""}</span><strong className="importe" style={{ fontSize: 16, color: Number(m.cantidad) < 0 ? "var(--coral-texto)" : undefined }}>{Number(m.cantidad) > 0 ? "+" : ""}{num(Number(m.cantidad))}</strong></div>
              ))}
            </div>
          )}
          <AvisoError texto={error} />
          {corrigiendo ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 600 }}>Hay</span>
                <input className="campo importe-campo" style={{ width: 90, height: 44, textAlign: "center" }} inputMode="decimal" autoFocus value={real} onChange={(e) => setReal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void guardar(); }} data-testid="cantidad-real" />
                <input className="campo" style={{ flex: 1, height: 44, minWidth: 0 }} placeholder="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} data-testid="motivo" />
              </div>
              <div className="motivos-de-ajuste" role="group" aria-label="Motivos frecuentes">
                {MOTIVOS_DE_AJUSTE.map((m) => <button key={m} type="button" className={`boton chico ${motivo === m ? "tinta" : ""}`} aria-pressed={motivo === m} onClick={() => setMotivo(m)}>{m}</button>)}
              </div>
              <div className="cuadricula-2">
                <button type="button" className="boton tinta" onClick={guardar} data-testid="guardar-ajuste">Guardar</button>
                <button type="button" className="boton" onClick={() => setCorrigiendo(false)}>Cancelar</button>
              </div>
            </>
          ) : corrige && <button type="button" className="boton corregir-stock" onClick={() => { setCorrigiendo(true); setReal(String(cantidad)); setMotivo(""); }} data-testid="corregir">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.500 6.500l4 4" /></svg>Corregir el stock
          </button>}
        </div>
      )}
    </div>
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
    else if (e.key === "Enter") { e.preventDefault(); if (resultados[elegido]) agregar(resultados[elegido]); else if (consulta.trim()) agregar(null, consulta.trim()); }
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
      <Buscador chico valor={consulta} alCambiar={setConsulta} placeholder={catalogo ? "Producto que llegó" : "Bajando el catálogo…"} disabled={!catalogo} onKeyDown={teclas} cajaRef={caja} alEscanear={hayCamara() ? () => setEscaneando(true) : undefined} />
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
          {resultados.length === 0 && catalogo && (
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

  if (conteo) return <ConteoDeSector conteo={conteo} alActualizar={setConteo} alSalir={() => { setConteo(null); void cargarSectores(); }} />;

  return (
    <>
      <p className="subtitulo">Se cuenta de a un sector. Al cerrarlo, las diferencias contra el stock teórico se ajustan solas.</p>
      <AvisoError texto={error} alCerrar={() => { setError(null); setCerrado(fallo); }} />
      <div className="sectores" data-testid="sectores">
        {sectores.map((s) => {
          const dias = s.ultimo_conteo ? Math.floor((Date.now() - new Date(s.ultimo_conteo).getTime()) / 86400000) : null;
          return (
            <button key={s.id} type="button" className={`sector ${s.conteo_abierto ? "abierto" : dias === null ? "nunca" : ""}`} onClick={() => abrir(s.id)}>
              <strong>{s.nombre}</strong>
              <span className="pie"><span>{s.productos} productos</span><span>{s.conteo_abierto ? "conteo en curso" : dias === null ? "nunca contado" : dias === 0 ? "contado hoy" : `contado hace ${dias} días`}</span></span>
            </button>
          );
        })}
        <button type="button" className="sector nuevo" onClick={() => setNuevo(true)} data-testid="sector-nuevo">+ Sector nuevo</button>
      </div>
      {nuevo && (
        <Hoja titulo="Sector nuevo" alCerrar={() => setNuevo(false)}>
          <form className="formulario" onSubmit={(e) => { e.preventDefault(); const n = String(new FormData(e.currentTarget).get("nombre") ?? "").trim(); if (n) void crearSector(n); }}>
            <label className="renglon"><span>Nombre</span><input name="nombre" placeholder="Sector nuevo (Estantería 1, Pared herramientas…)" required autoFocus /></label>
            <div className="acciones" style={{ padding: "12px 0" }}><button type="submit" className="boton tinta">Agregar sector</button></div>
          </form>
        </Hoja>
      )}
    </>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 18, fontWeight: 600 }}>{producto.descripcion}</span><small>{[producto.marca, producto.codigo_proveedor].filter(Boolean).join(" · ")}{contadoPorId.get(producto.id) ? ` · teórico ${Number(contadoPorId.get(producto.id)!.stock_teorico)}` : ""}</small></div>
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
          <Buscador valor={consulta} alCambiar={setConsulta} placeholder={catalogo ? "Buscá o escaneá el producto" : "Bajando el catálogo…"} disabled={!catalogo} onKeyDown={teclasBusqueda} cajaRef={caja} alEscanear={hayCamara() ? () => setEscaneando(true) : undefined} />
          {escaneando && <Escaner alDetectar={alDetectar} alCerrar={() => setEscaneando(false)} />}
          {resultados.length > 0 && (
            <Lista data-testid="sugerencias">
              {resultados.map((p, i) => (
                <button key={p.id} type="button" className={`fila ${i === elegido ? "elegida" : ""}`} onMouseDown={(e) => { e.preventDefault(); elegirProducto(p); }}>
                  <span className="nombre">{p.descripcion}</span>
                  <small className="derecha" style={{ color: "var(--coral-texto)", fontWeight: 600 }}>{contadoPorId.has(p.id) ? `ya: ${Number(contadoPorId.get(p.id)!.cantidad_contada)}` : ""}</small>
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
              <button key={r.producto_id} type="button" className="fila" role="row" aria-label={r.descripcion} onClick={() => { const p = catalogo?.find((x) => x.id === r.producto_id); if (p) elegirProducto(p); }}>
                <span className="nombre">{r.descripcion}</span>
                <span className="derecha" style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}><strong className="importe" style={{ fontSize: 22 }}>{Number(r.cantidad_contada)}</strong><small style={{ fontWeight: 700, color: dif === 0 ? undefined : "var(--coral-texto)", minWidth: 24, textAlign: "right" }}>{dif === 0 ? "=" : dif > 0 ? `+${dif}` : dif}</small></span>
                <span className="detalle">{r.marca ?? ""}{r.marca ? " · " : ""}teórico {Number(r.stock_teorico)}</span>
              </button>
            );
          })}
        </Lista>
      )}
      {conteo.sin_contar.length > 0 && (
        <>
          <h2 className="seccion">Del sector, sin contar todavía</h2>
          <Lista>{conteo.sin_contar.map((p) => <div key={p.producto_id} className="fila"><span className="nombre">{p.descripcion}</span><small className="derecha">teórico {Number(p.stock_teorico)}</small></div>)}</Lista>
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

const pesosEnteros = (n: number) => pesos(Math.round(n)).replace(/,00$/, "");
