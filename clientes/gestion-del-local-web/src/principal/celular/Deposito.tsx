import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AvisoDePedido, Pedidos, renglonesDelPedido, usePedidoAIngresar } from "../Pedidos";
import { usePuede, type Permiso } from "../permisos";
import { SinPermiso } from "../SinPermiso";
import { COMPROBANTES, MOTIVOS_DE_AJUSTE, TEXTOS, type Comprobante } from "../textos";
import { FotoDeProducto } from "./FotoDeProducto";
import { FotoDeFactura, VerComprobante } from "../FotoDeFactura";
import { api, ErrorApi } from "../../api";
import { enviarOEncolar } from "../../cola";
import { useCatalogo } from "../../catalogo";
import { fecha, pesos, porcentaje } from "../../formato";
import { irA } from "../../rutas";
import { cantidadValida, enteras, unidadDe } from "../../unidades";
import { AvisoError, Buscador, Contador, Exito, Hoja, Icono, Segmentos, Toast } from "./componentes/base";
import { Pestanas } from "./Pestanas";
import { Escaner, hayCamara } from "./componentes/Escaner";
import { pesosCortos } from "./pantallas/VentasDeHoy";
import type { Producto } from "./pantallas/Productos";

// Depósito: inventario (cantidades, sin dinero), ingreso de mercadería y conteo por sector. Tres
// sub-pantallas con un segmento arriba (rediseño en mockups/Ferre iOS.html).
// Primero lo que más se hace: recibir mercadería; después mirar el stock y, cada tanto, contar.
const SUB = [{ valor: "pedidos", nombre: "Pedidos" }, { valor: "ingreso", nombre: "Ingreso" }, { valor: "stock", nombre: "Inventario" }, { valor: "contar", nombre: "Estanterías" }] as const;
type Sub = (typeof SUB)[number]["valor"];
// Lo que pide cada pestaña (RF-72). El inventario lo ve cualquiera con sesión.
const PIDE: Partial<Record<Sub, Permiso[]>> = { pedidos: ["deposito.pedidos", "deposito.ingresos"], ingreso: ["deposito.ingresos", "deposito.compras"], contar: ["deposito.stock"] };
const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");
const num = (n: number) => n.toLocaleString("es-AR");

export function Deposito({ sub }: { sub: string | null }) {
  const puedeEsto = usePuede();
  const permitida = (s: Sub) => puedeEsto(...(PIDE[s] ?? []));
  // Sin dirección abre en la primera pestaña que la persona puede usar.
  const actual: Sub = sub === "stock" || sub === "contar" || sub === "pedidos" ? sub : sub === "ingreso" || permitida("ingreso") ? "ingreso" : "stock";
  if (!permitida(actual)) return <SinPermiso falta={PIDE[actual]!} />;
  return (
    <main className="contenido">
      <div className="encabezado">
        <h1 className="titulo">Depósito</h1>
        <Pestanas opciones={SUB.filter((s) => permitida(s.valor)).map((s) => ({ valor: s.valor, nombre: s.nombre, icono: s.valor === "ingreso" ? "compras" : s.valor === "pedidos" ? "listas" : s.valor }))} actual={actual} alElegir={(v) => irA(v === "ingreso" ? "deposito" : `deposito/${v}`)} />
      </div>
      {actual === "pedidos" ? <Pedidos celular alIngresar={(id) => irA(`deposito/ingreso?pedido=${id}`)} /> : actual === "stock" ? <Stock /> : actual === "ingreso" ? (puedeEsto("deposito.ingresos") ? <Ingreso /> : <ComprasRecientes version={0} soloVer />) : <Contar />}
    </main>
  );
}

// ---------- Stock ----------
type StockFila = { id: string; stock: string; costo_neto: string | null; proveedor: string | null; valor: string; ultimo_movimiento: string | null };
type Datos = { productos: StockFila[]; valor_total: number; por_proveedor: Record<string, { unidades: number; valor: number; productos: number }> };
type Movimiento = { id: string; tipo: string; cantidad: string; referencia_tipo: string | null; fecha: string; nota: string | null };

// Inventario: cuánto hay de cada producto, explicado con sus movimientos. Sin sumas de
// dinero: el dinero invertido está en Cómo va el negocio (decisión 31).
function Stock() {
  const { catalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState(false);

  const cargar = useCallback(() => api<Datos>("/stock").then((d) => { setDatos(d); setError(null); }).catch((e) => setError(e instanceof ErrorApi ? e.message : "Sin conexión con el servidor.")), []);
  useEffect(() => { void cargar(); }, [cargar]);

  const porId = useMemo(() => new Map((datos?.productos ?? []).map((s) => [s.id, s])), [datos]);
  const filas = useMemo(() => {
    if (!catalogo) return [];
    return consulta.trim() ? buscarProductos(consulta, 100) : catalogo.filter((p) => porId.has(p.id)).sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es")).slice(0, 100);
  }, [catalogo, consulta, buscarProductos, porId]);

  return (
    <>
      <AvisoError texto={error} alCerrar={() => setError(null)} />
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      <div className="lateral">
      <div className="columna al-costado">
      </div>
      <div className="columna">
      <Buscador chico valor={consulta} alCambiar={(v) => { setConsulta(v); setAbierto(null); }} placeholder="Buscar para ver o corregir el stock" alEscanear={hayCamara() ? () => setEscaneando(true) : undefined} />
      {escaneando && <Escaner alDetectar={(codigo) => { setEscaneando(false); setConsulta(codigo); setAbierto(null); }} alCerrar={() => setEscaneando(false)} />}
      <p className="subtitulo">El stock es la suma de compras, ventas y ajustes desde que se usa el sistema. Hasta el conteo, lo que no se cargó no está.</p>
      <div className="lista" data-testid="tabla-stock">
        {filas.map((p) => <FilaStock key={p.id} alFoto={(f) => { actualizarProducto(p.id, { foto_url: f }).catch(() => undefined); }} producto={p} fila={porId.get(p.id) ?? null} abierto={abierto === p.id} alAbrir={() => setAbierto(abierto === p.id ? null : p.id)} alAjustar={async (texto) => { setMensaje(texto); await cargar(); }} />)}
      </div>
      {consulta.trim() && filas.length === 0 && catalogo && <div className="aviso-suave">Nada con "{consulta}".</div>}
      </div>
      </div>
    </>
  );
}

function FilaStock({ producto: p, fila, abierto, alAbrir, alAjustar, alFoto }: { alFoto: (foto_url: string) => void; producto: Producto; fila: StockFila | null; abierto: boolean; alAbrir: () => void; alAjustar: (mensaje: string) => Promise<void> }) {
  const corrige = usePuede()("deposito.stock");
  const cantidad = fila ? Number(fila.stock) : 0;
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [real, setReal] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (abierto) api<Movimiento[]>(`/stock/${p.id}/movimientos`).then(setMovimientos).catch(() => setMovimientos([])); else setCorrigiendo(false); }, [abierto, p.id]);

  async function guardar() {
    const n = Number(real.replace(",", "."));
    if (real === "" || !Number.isFinite(n) || n < 0) { setError(TEXTOS.inventario.faltaCuantasHay.corto); return; }
    // El motivo es obligatorio, igual que en la computadora (RF-53).
    if (!motivo.trim()) { setError(TEXTOS.inventario.faltaElMotivo.corto); return; }
    try {
      await enviarOEncolar("stock.ajuste", "POST", `/stock/${p.id}/ajustes`, { cantidad_real: n, motivo: motivo.trim() });
      setCorrigiendo(false); setError(null);
      const dif = n - cantidad;
      await alAjustar(dif === 0 ? "Sin diferencia: el stock ya decía eso." : `Stock corregido a ${num(n)} (${dif > 0 ? "+" : ""}${num(dif)}).`);
      api<Movimiento[]>(`/stock/${p.id}/movimientos`).then(setMovimientos).catch(() => undefined);
    } catch (e) { setError((e as Error).message); }
  }
  const nombreTipo = (m: Movimiento) => m.tipo === "venta" ? "Venta" : m.tipo === "compra" ? "Compra" : m.referencia_tipo === "conteo" ? "Conteo" : "Ajuste";
  const unidad = p.unidad === "unidad" ? "u." : p.unidad === "l" ? "L" : p.unidad;

  return (
    <div className={`fila-stock ${abierto ? "abierta" : ""}`} data-testid="fila-stock">
      <div className="con-foto-de-producto">
      <FotoDeProducto producto={p} alCambiar={alFoto} />
      <button type="button" className="fila" onClick={alAbrir} data-testid="stock" aria-expanded={abierto}>
        <span className="nombre">{p.descripcion}</span>
        <span className="derecha">
          <strong className="importe" style={{ fontSize: 24, color: cantidad < 0 ? "var(--coral-texto)" : undefined }}>{num(cantidad)} {unidad}</strong>
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
type Proveedor = { id: string; nombre: string; activo: boolean };
type Renglon = { clave: string; producto: Producto | null; descripcion: string; cantidad: number; costo: number | null; costoTexto: string; costoLista: number | null };
type CompraFila = { id: string; fecha: string; comprobante_tipo: string; comprobante_numero: string | null; foto: string | null; total: string; estado: string; proveedor: string; renglones: string; items: { descripcion: string; cantidad: string; costo_unitario: string }[] };

// Ingreso de mercadería (issue #30): proveedor y comprobante → renglones con la búsqueda
// de siempre → registrar. Suma stock y, si la factura trae otro costo, ese pasa a ser el
// vigente. Reemplaza el papel semanal de gastos.
function Ingreso() {
  const { catalogo, error: errorCatalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [comprobante, setComprobante] = useState<Comprobante>("factura");
  const [foto, setFoto] = useState<string | null>(null);
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().slice(0, 10));
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const [renglones, setRenglones] = useState<Renglon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [version, setVersion] = useState(0);
  const [hoja, setHoja] = useState<"proveedores" | null>(null);
  // Si se viene de un pedido (RF-55), el ingreso arranca con su proveedor y con lo que falta llegar.
  const { pedido, error: errorPedido } = usePedidoAIngresar();
  const hayCatalogo = catalogo !== null;
  useEffect(() => {
    if (!pedido || !catalogo) return;
    setProveedorId(pedido.proveedor_id);
    setRenglones(renglonesDelPedido(pedido, catalogo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido, hayCatalogo]);
  const [escaneando, setEscaneando] = useState(false);
  const [exito, setExito] = useState<{ total: number; proveedor: string; detalle: string } | null>(null);
  const caja = useRef<HTMLInputElement>(null);

  useEffect(() => { api<Proveedor[]>("/proveedores").then((p) => setProveedores(p.filter((x) => x.activo))).catch(() => undefined); }, []);
  const proveedor = proveedores.find((p) => p.id === proveedorId) ?? null;

  const resultados = useMemo(() => {
    if (!consulta.trim()) return [];
    const todos = buscarProductos(consulta, 16);
    return proveedor ? [...todos.filter((p) => p.proveedor === proveedor.nombre), ...todos.filter((p) => p.proveedor !== proveedor.nombre)].slice(0, 8) : todos.slice(0, 8);
  }, [buscarProductos, consulta, proveedor]);
  useEffect(() => { setElegido(0); }, [consulta]);
  useEffect(() => { setError(null); }, [proveedorId, renglones]);

  const agregar = useCallback((p: Producto | null, libre?: string) => {
    setRenglones((lista) => {
      if (p) {
        const ya = lista.find((r) => r.producto?.id === p.id);
        if (ya) return lista.map((r) => (r === ya ? { ...r, cantidad: r.cantidad + 1 } : r));
        const costoLista = p.costo_neto !== null ? Number(p.costo_neto) : null;
        return [...lista, { clave: crypto.randomUUID(), producto: p, descripcion: p.descripcion, cantidad: 1, costo: costoLista, costoTexto: costoLista === null ? "" : String(costoLista), costoLista }];
      }
      return [...lista, { clave: crypto.randomUUID(), producto: null, descripcion: libre ?? "", cantidad: 1, costo: null, costoTexto: "", costoLista: null }];
    });
    setConsulta("");
  }, []);
  const cambiar = (clave: string, c: Partial<Renglon>) => setRenglones((l) => l.map((r) => (r.clave === clave ? { ...r, ...c } : r)));
  const quitar = (clave: string) => { setRenglones((l) => l.filter((r) => r.clave !== clave)); };
  const alDetectar = useCallback((codigo: string) => {
    const p = (catalogo ?? []).find((x) => x.codigo_barras === codigo || x.codigo_proveedor === codigo);
    if (p) { setEscaneando(false); agregar(p); } else setError(`El código ${codigo} no está en el catálogo: buscalo por nombre.`);
  }, [catalogo, agregar]);

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (resultados[elegido]) agregar(resultados[elegido]); else if (consulta.trim()) agregar(null, consulta.trim()); }
    else if (e.key === "Escape") setConsulta("");
  }

  const total = renglones.reduce((s, r) => s + (r.costo ?? 0) * r.cantidad, 0);
  const sinCosto = renglones.some((r) => r.costo === null || !r.descripcion.trim());

  async function confirmar() {
    if (ocupado) return;
    if (!proveedorId) { setError("Elegí el proveedor."); setHoja("proveedores"); return; }
    if (renglones.length === 0) { setError("La compra no tiene productos."); return; }
    if (sinCosto) { setError("Hay renglones sin costo o sin descripción."); return; }
    setOcupado(true); setError(null);
    try {
      const r = await api<{ total: number; productos_nuevos: number; costos_actualizados: number }>("/compras", {
        method: "POST",
        body: JSON.stringify({
          id: crypto.randomUUID(), proveedor_id: proveedorId, fecha: fechaCompra, comprobante_tipo: comprobante, foto: comprobante === "sin_comprobante" ? null : foto,
          pedido_id: pedido?.id ?? null,
          items: renglones.map((x) => ({ producto_id: x.producto?.id ?? null, descripcion: x.descripcion, cantidad: x.cantidad, costo_unitario: x.costo })),
        }),
      });
      const n = renglones.length;
      setExito({ total: r.total, proveedor: proveedor?.nombre ?? "", detalle: `${n} ${n === 1 ? "renglón sumado" : "renglones sumados"} al stock · ${r.costos_actualizados} costo${r.costos_actualizados === 1 ? "" : "s"} actualizado${r.costos_actualizados === 1 ? "" : "s"} según el comprobante${r.productos_nuevos ? ` · ${r.productos_nuevos} producto${r.productos_nuevos === 1 ? "" : "s"} nuevo${r.productos_nuevos === 1 ? "" : "s"}` : ""}.` });
      setRenglones([]); setFoto(null); setVersion((v) => v + 1);
      if (pedido) irA("deposito/ingreso");
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Sin conexión con el servidor. Registrar una compra necesita internet.");
    } finally {
      setOcupado(false);
    }
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
        <div className="lista" data-testid="sugerencias">
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
        </div>
      )}
      {renglones.map((r) => {
        const dif = r.costo !== null && r.costoLista !== null && r.costoLista > 0 ? ((r.costo - r.costoLista) / r.costoLista) * 100 : null;
        const unidad = unidadDe(r.producto);
        return (
          <div key={r.clave} className="tarjeta" data-testid="renglon">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              {r.producto && <FotoDeProducto producto={r.producto} alCambiar={(f) => { cambiar(r.clave, { producto: { ...r.producto!, foto_url: f } }); actualizarProducto(r.producto!.id, { foto_url: f }).catch(() => undefined); }} />}
              {r.producto ? <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontWeight: 600, lineHeight: 1.25 }}>{r.descripcion}</span><small>{detalleDe(r.producto)}</small></span>
                : <input className="linea-editable" value={r.descripcion} placeholder="Descripción del producto nuevo" onChange={(e) => cambiar(r.clave, { descripcion: e.target.value })} data-testid="descripcion-nueva" />}
              <button type="button" className="quitar tacho" onClick={() => quitar(r.clave)} aria-label={`Quitar ${r.descripcion || "el producto"} del ingreso`} title="Quitar del ingreso" data-testid="quitar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Contador valor={r.cantidad} entera={enteras(unidad)} alCambiar={(v) => cambiar(r.clave, { cantidad: enteras(unidad) ? Math.floor(v) : cantidadValida(String(v), unidad) })}>{!enteras(unidad) && <span className="unidad" style={{ padding: "0 10px 0 4px", fontSize: 14, color: "var(--gris)" }}>{unidad === "l" ? "L" : unidad}</span>}</Contador>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <label className={`campo importe-campo ${r.costo === null ? "falta" : ""}`}><span>costo $</span><input inputMode="decimal" placeholder="0" value={r.costoTexto} onChange={(e) => { const t = e.target.value.replace(/[^\d,.]/g, ""); const v = Number(t.replace(",", ".")); cambiar(r.clave, { costoTexto: t, costo: t === "" || !Number.isFinite(v) ? null : v }); }} data-testid="costo" /></label>
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
      <ComprasRecientes version={version} />
      {hoja === "proveedores" && (
        <Hoja titulo="¿De qué proveedor llegó?" alCerrar={() => setHoja(null)} testId="hoja-proveedores">
          <div className="lista">
            {proveedores.map((p) => <button key={p.id} type="button" className={`fila ${proveedorId === p.id ? "elegida" : ""}`} onClick={() => { setProveedorId(p.id); setHoja(null); }} data-testid="opcion-proveedor"><span className="nombre">{p.nombre}</span></button>)}
          </div>
        </Hoja>
      )}
      {exito && <Exito que="Ingreso registrado" importe={pesosCortos(exito.total)} medio={exito.proveedor} detalle={exito.detalle} boton="Listo" alCerrar={() => setExito(null)} />}
    </>
  );
}

// Compras recientes: el papel que ya no se tira (los gastos de la semana están en Cómo va el negocio). Cada compra se
// abre para ver sus renglones y se puede anular.
function ComprasRecientes({ version, soloVer = false }: { version: number; soloVer?: boolean }) {
  const anula = usePuede()("deposito.ingresos");
  const [filas, setFilas] = useState<CompraFila[]>([]);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [mensaje, setMensaje] = useState<string | null>(null);
  const cargar = () => api<CompraFila[]>("/compras").then(setFilas).catch(() => setFilas([]));
  useEffect(() => { void cargar(); }, [version]);
  if (filas.length === 0) return soloVer ? <div className="aviso-suave">Todavía no hay compras registradas.</div> : null;
  const nombreComprobante = (c: CompraFila) => c.comprobante_tipo === "sin_comprobante" ? "sin comprobante" : `${c.comprobante_tipo}${c.comprobante_numero ? ` ${c.comprobante_numero}` : c.foto ? " con foto" : " sin foto"}`;
  async function anular(c: CompraFila) {
    const motivo = window.prompt(`¿Anular la compra de ${pesos(c.total)} a ${c.proveedor}? Motivo (opcional):`);
    if (motivo === null) return;
    await api(`/compras/${c.id}/anular`, { method: "POST", body: JSON.stringify({ motivo }) }).catch((e: Error) => setMensaje(e.message));
    await cargar();
  }
  return (
    <>
      <div className="seccion"><span>Compras recientes</span></div>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      <div className="lista" data-testid="compras-recientes">
        {filas.map((c) => {
          const anulada = c.estado === "anulada";
          const abierta = abiertas.has(c.id);
          return (
            <div key={c.id} data-testid="compra-reciente">
              <button type="button" className={`fila ${anulada ? "apagada" : ""}`} onClick={() => setAbiertas((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} aria-expanded={abierta}>
                <span className="nombre">{c.proveedor}</span>
                <strong className="derecha importe" style={{ textDecoration: anulada ? "line-through" : undefined }}>{pesos(c.total)}</strong>
                <span className="detalle">{fecha(c.fecha)} · {nombreComprobante(c)} · {c.renglones} renglones{anulada ? " · anulada" : ""}</span>
              </button>
              {abierta && (
                <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {c.foto && <div style={{ display: "flex", alignItems: "center", gap: 12 }}><VerComprobante ruta={c.foto} /><small>Tocá la foto para leer el número o cualquier otro dato del comprobante.</small></div>}
                  <div className="movimientos">
                    {c.items.map((i, n) => <div key={n}><span>{Number(i.cantidad)} ×</span><span>{i.descripcion}</span><strong className="importe" style={{ fontSize: 16 }}>{pesos(Number(i.cantidad) * Number(i.costo_unitario))}</strong></div>)}
                  </div>
                  {!anulada && anula && <button type="button" className="boton texto" onClick={() => anular(c)}>Anular esta compra</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------- Contar ----------
type Sector = { id: string; nombre: string; productos: string; ultimo_conteo: string | null; conteo_abierto: string | null };
type RenglonConteo = { producto_id: string; cantidad_contada: string; contado_en: string; descripcion: string; marca: string | null; stock_teorico: string };
type Conteo = { id: string; estado: string; sector_id: string; sector: string; renglones: RenglonConteo[]; sin_contar: { producto_id: string; descripcion: string; marca: string | null; stock_teorico: string }[] };

// Conteo cíclico con el celular (issue #31), con una mano: elegir sector → buscar o
// escanear → cuántas hay → siguiente. El sector queda abierto hasta cerrarlo; al cerrar,
// las diferencias contra el stock teórico se aplican como ajustes explicados.
function Contar() {
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [conteo, setConteo] = useState<Conteo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const cargarSectores = useCallback(() => api<Sector[]>("/sectores").then(setSectores).catch((e) => setError(e instanceof ErrorApi ? e.message : "Sin conexión con el servidor.")), []);
  useEffect(() => { void cargarSectores(); }, [cargarSectores]);

  async function abrir(sectorId: string) {
    try {
      const { id } = await api<{ id: string }>("/conteos", { method: "POST", body: JSON.stringify({ sector_id: sectorId }) });
      setConteo(await api<Conteo>(`/conteos/${id}`));
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }
  async function crearSector(nombre: string) {
    try {
      const { id } = await api<{ id: string }>("/sectores", { method: "POST", body: JSON.stringify({ nombre }) });
      setNuevo(false);
      await cargarSectores();
      await abrir(id);
    } catch (err) { setError((err as Error).message); }
  }

  if (conteo) return <ConteoDeSector conteo={conteo} alActualizar={setConteo} alSalir={() => { setConteo(null); void cargarSectores(); }} />;

  return (
    <>
      <p className="subtitulo">Se cuenta de a un sector. Al cerrarlo, las diferencias contra el stock teórico se ajustan solas.</p>
      <AvisoError texto={error} alCerrar={() => setError(null)} />
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

  const recargar = useCallback(() => api<Conteo>(`/conteos/${conteo.id}`).then(alActualizar).catch(() => undefined), [conteo.id, alActualizar]);
  const contadoPorId = new Map(conteo.renglones.map((r) => [r.producto_id, r]));

  function elegirProducto(p: Producto) {
    setProducto(p);
    const previo = contadoPorId.get(p.id);
    setCantidad(previo ? String(Number(previo.cantidad_contada)) : "");
    setConsulta("");
  }
  const alDetectar = useCallback((codigo: string) => {
    const p = (catalogo ?? []).find((x) => x.codigo_barras === codigo || x.codigo_proveedor === codigo);
    if (p) { setEscaneando(false); elegirProducto(p); } else setError(`El código ${codigo} no está en el catálogo: buscalo por nombre.`);
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
    const n = Number(cantidad);
    if (cantidad === "" || !Number.isFinite(n) || n < 0) { setError("Escribí cuántas hay."); return; }
    try {
      const { encolado } = await enviarOEncolar("conteo.renglon", "PUT", `/conteos/${conteo.id}/renglones/${producto.id}`, { cantidad: n });
      setError(null); setProducto(null); setCantidad("");
      if (encolado) {
        alActualizar({ ...conteo, renglones: [{ producto_id: producto.id, cantidad_contada: String(n), contado_en: new Date().toISOString(), descripcion: producto.descripcion, marca: producto.marca, stock_teorico: String(contadoPorId.get(producto.id)?.stock_teorico ?? "0") }, ...conteo.renglones.filter((r) => r.producto_id !== producto.id)] });
      } else {
        await recargar();
      }
    } catch (e) { setError((e as Error).message); }
  }
  async function cerrar(faltantesEnCero: boolean) {
    try {
      const r = await api<{ ajustados: number; puestos_en_cero: number; contados: number }>(`/conteos/${conteo.id}/cerrar`, { method: "POST", body: JSON.stringify({ faltantes_en_cero: faltantesEnCero }) });
      setResultado(r); setCerrando(false);
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
            <div className="lista" data-testid="sugerencias">
              {resultados.map((p, i) => (
                <button key={p.id} type="button" className={`fila ${i === elegido ? "elegida" : ""}`} onMouseDown={(e) => { e.preventDefault(); elegirProducto(p); }}>
                  <span className="nombre">{p.descripcion}</span>
                  <small className="derecha" style={{ color: "var(--coral-texto)", fontWeight: 600 }}>{contadoPorId.has(p.id) ? `ya: ${Number(contadoPorId.get(p.id)!.cantidad_contada)}` : ""}</small>
                  <span className="detalle">{detalleDe(p)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      </div>
      <div className="columna">
      <div className="seccion"><span>Contados · {conteo.renglones.length}</span><span className="suave">{conteo.sin_contar.length} sin contar</span></div>
      {conteo.renglones.length === 0 ? <div className="aviso-suave">Todavía nada. Buscá el primer producto de la estantería.</div> : (
        <div className="lista" data-testid="contados">
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
        </div>
      )}
      {conteo.sin_contar.length > 0 && (
        <>
          <div className="seccion">Del sector, sin contar todavía</div>
          <div className="lista">{conteo.sin_contar.map((p) => <div key={p.producto_id} className="fila"><span className="nombre">{p.descripcion}</span><small className="derecha">teórico {Number(p.stock_teorico)}</small></div>)}</div>
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
