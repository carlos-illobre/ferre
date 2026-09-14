import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { esMargenBoton, margenReal, MARGENES, precioDeVenta } from "@ferre/calculo-de-precios";
import { FotoProducto } from "../componentes/Foto";
import { AvisoError, Buscador, Contador, Exito, Hoja, Icono, Toast } from "../componentes/base";
import { Explicacion } from "../componentes/Explicacion";
import { cantidadValida, enteras, UNIDADES, unidadDe, type Unidad } from "../unidades";
import { api, ErrorApi, subirFoto } from "../api";
import { guardar, borrarAnterioresA } from "../almacen";
import { alCambiarLaCola, enviarOEncolar, enviarPendientes, pendientes as pendientesEnCola } from "../cola";
import { useCatalogo } from "../catalogo";
import { useTeclasGlobales } from "../teclas";
import { pesos } from "../formato";
import { describirDispositivo } from "./Login";
import { Escaner, hayCamara } from "../componentes/Escaner";
import { VincularCelular } from "../componentes/VincularCelular";
import { EstadoDeConexion } from "../componentes/EstadoDeConexion";
import { enviarCodigoAlPuesto, escucharPuesto, puestoRemoto } from "../puesto";
import { ListaDeVentas, NOMBRE_MEDIO, pesosCortos, useVentasDeHoy } from "./VentasDeHoy";
import type { Producto } from "./Productos";

// La venta (issue #15): el orden es el del mostrador (docs/proceso-actual.md). Buscar →
// precio → cantidad → cobro. Enter agrega; Esc descarta ("no llevó"); F2 cobra. Cada
// renglón es una tarjeta; el margen se cambia ahí mismo y queda guardado en el producto.
type Item = {
  clave: string; producto: Producto | null; descripcion: string; cantidad: number;
  unidad: Unidad; // por unidades enteras o por kilo/metro/litro (con un decimal)
  precioManual: number | null; // precio tipeado en esta venta, pisa al margen
  abierto: boolean; // el detalle del margen desplegado
};
const MEDIOS: { valor: "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente"; nombre: string; corto: string; tecla: string }[] = [
  { valor: "efectivo", nombre: "Efectivo", corto: "Efectivo", tecla: "F5" },
  { valor: "mercado_pago", nombre: "Mercado Pago", corto: "Mercado Pago", tecla: "F6" },
  { valor: "tarjeta", nombre: "Tarjeta", corto: "Tarjeta", tecla: "F7" },
  { valor: "cuenta_corriente", nombre: "Cuenta corriente", corto: "Cta. cte.", tecla: "F8" },
];

function precioDe(item: Item): { unitario: number | null; pasos: string[]; margen: number | null; costo: number | null; iva: number } {
  const p = item.producto;
  const costo = p?.costo_neto != null ? Number(p.costo_neto) : null;
  const iva = p?.iva != null ? Number(p.iva) : 0.21;
  if (item.precioManual !== null) {
    const real = costo !== null ? margenReal({ costoNeto: costo, iva, precio: item.precioManual }) : null;
    return { unitario: item.precioManual, pasos: real ? real.pasos : [`Precio tipeado a mano ${pesos(item.precioManual)}`], margen: null, costo, iva };
  }
  if (p && costo !== null && p.margen_elegido !== null) {
    const r = precioDeVenta({ costoNeto: costo, margen: p.margen_elegido, iva });
    return { unitario: r.valor, pasos: r.pasos, margen: p.margen_elegido, costo, iva };
  }
  return { unitario: null, pasos: [], margen: null, costo, iva };
}
const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");
const num = (n: number) => n.toLocaleString("es-AR");

export function Vender({ esDueno }: { esDueno: boolean }) {
  const { catalogo, stock: stockPorId, clientes, error: errorCatalogo, buscarProductos, actualizarProducto, ajustarStockLocal } = useCatalogo();
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [medio, setMedio] = useState<(typeof MEDIOS)[number]["valor"] | null>(null);
  const [clienteId, setClienteId] = useState<string>("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState(0);
  const [escaneando, setEscaneando] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState<string | null>(null);
  const [puestoVinculado, setPuestoVinculado] = useState(false);
  const [codigoDesconocido, setCodigoDesconocido] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [hoja, setHoja] = useState<"clientes" | "hoy" | null>(null);
  const [exito, setExito] = useState<{ total: number; medio: string; detalle: string } | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const { datos: hoy, anular } = useVentasDeHoy(mensaje ?? exito);

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 8) : []), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);
  // Un aviso ("elegí el cliente", "elegí cómo paga") se va solo apenas se corrige la causa.
  useEffect(() => { setError(null); }, [items, medio, clienteId]);
  useEffect(() => { caja.current?.focus(); }, [catalogo]);
  useEffect(() => {
    const contar = () => pendientesEnCola().then((l) => setPendientes(l.length)).catch(() => undefined);
    void contar();
    const quitar = alCambiarLaCola(contar);
    const reintentar = () => { enviarPendientes().then(setPendientes).catch(() => undefined); };
    window.addEventListener("online", reintentar);
    // Las ventas confirmadas se conservan 7 días en el dispositivo (ADR-002).
    borrarAnterioresA("ventas", "fecha", new Date(Date.now() - 7 * 86400000).toISOString()).catch(() => undefined);
    return () => { quitar(); window.removeEventListener("online", reintentar); };
  }, []);

  const total = items.reduce((s, it) => s + (precioDe(it).unitario ?? 0) * it.cantidad, 0);
  const sinPrecio = items.some((it) => precioDe(it).unitario === null);

  const agregar = useCallback((p: Producto | null, descripcionLibre?: string) => {
    setItems((lista) => {
      if (p) {
        const ya = lista.find((it) => it.producto?.id === p.id);
        if (ya) return lista.map((it) => (it === ya ? { ...it, cantidad: it.cantidad + 1 } : it));
        return [...lista, { clave: crypto.randomUUID(), producto: p, descripcion: p.descripcion, cantidad: 1, unidad: unidadDe(p), precioManual: null, abierto: p.margen_elegido === null }];
      }
      return [...lista, { clave: crypto.randomUUID(), producto: null, descripcion: descripcionLibre ?? "", cantidad: 1, unidad: "unidad", precioManual: null, abierto: false }];
    });
    setConsulta("");
    setMensaje(null);
  }, []);

  // Un código de barras, venga de la cámara del celular o del lector USB (que tipea y
  // manda Enter): si es de un producto, se agrega; si no, se ofrece asociarlo.
  const agregarPorCodigo = useCallback((codigo: string): boolean => {
    const c = codigo.trim();
    const exacto = (catalogo ?? []).find((p) => p.codigo_barras === c || p.codigo_proveedor === c);
    if (exacto) { agregar(exacto); setCodigoDesconocido(null); return true; }
    setCodigoDesconocido(c);
    setConsulta("");
    return false;
  }, [catalogo, agregar]);
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
    if (puestoRemoto()) enviarCodigoAlPuesto(codigo).then((ok) => { if (ok) setUltimoEscaneo((u) => `${u ?? codigo} · enviado a la computadora ✓`); });
  }, []);

  function cambiarItem(clave: string, cambios: Partial<Item>) {
    setItems((lista) => lista.map((it) => (it.clave === clave ? { ...it, ...cambios } : it)));
  }
  function quitar(clave: string) {
    setItems((lista) => lista.filter((it) => it.clave !== clave));
    caja.current?.focus();
  }
  function elegirMargen(item: Item, margen: number) {
    if (!item.producto) return;
    // Queda guardado en el producto: la próxima vez ya viene con ese margen (#13).
    actualizarProducto(item.producto.id, { margen_elegido: margen }).catch(() => undefined);
    cambiarItem(item.clave, { precioManual: null, producto: { ...item.producto, margen_elegido: margen } });
  }
  function cambiarUnidad(item: Item, unidad: Unidad) {
    cambiarItem(item.clave, { unidad, cantidad: cantidadValida(String(item.cantidad), unidad) || 1 });
    if (item.producto) actualizarProducto(item.producto.id, { unidad } as never).catch(() => undefined);
  }

  function teclasBusqueda(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const p = resultados[elegido];
      if (codigoDesconocido && p) {
        // Asociar el código escaneado al producto elegido: la próxima vez se encuentra directo.
        actualizarProducto(p.id, { codigo_barras: codigoDesconocido } as never).catch(() => undefined);
        setCodigoDesconocido(null);
        agregar({ ...p, codigo_barras: codigoDesconocido });
      } else if (p) agregar(p);
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
    else if (e.key === "Escape") { caja.current?.focus(); }
  }, [resultados.length]), caja.current);

  function elegirMedio(valor: (typeof MEDIOS)[number]["valor"]) {
    setMedio(valor);
    if (valor === "cuenta_corriente" && !clienteId) setHoja("clientes");
  }

  async function cobrar() {
    if (items.length === 0 || ocupado) return;
    if (sinPrecio) { setError("Hay productos sin precio: elegí un margen o tipeá el precio."); return; }
    if (!medio) { setError("Elegí cómo paga: efectivo, Mercado Pago, tarjeta o cuenta corriente."); return; }
    if (medio === "cuenta_corriente" && !clienteId) { setError("Cuenta corriente: elegí el cliente."); setHoja("clientes"); return; }
    setOcupado(true);
    setError(null);
    const id = crypto.randomUUID();
    const cuerpo = {
      id,
      fecha: new Date().toISOString(),
      medio_pago: medio,
      cliente_id: medio === "cuenta_corriente" ? clienteId : null,
      dispositivo_id: describirDispositivo(),
      items: items.map((it) => {
        const p = precioDe(it);
        return {
          producto_id: it.producto?.id ?? null, descripcion: it.descripcion, cantidad: it.cantidad, precio_unitario: p.unitario ?? 0,
          costo_neto: p.costo, margen_aplicado: p.margen, explicacion: { pasos: p.pasos, costo: it.producto?.explicacion_costo ?? [] },
        };
      }),
    };
    const nombreCliente = clientes.find((c) => c.id === clienteId)?.nombre;
    try {
      const { encolado } = await enviarOEncolar("venta", "POST", "/ventas", cuerpo);
      guardar("ventas", { id, fecha: cuerpo.fecha, total, medio_pago: medio, items: cuerpo.items, enviada: !encolado }).catch(() => undefined);
      for (const it of items) if (it.producto) ajustarStockLocal(it.producto.id, -it.cantidad);
      const n = items.length;
      setExito({
        total,
        medio: (NOMBRE_MEDIO[medio] ?? medio) + (nombreCliente ? ` · ${nombreCliente}` : ""),
        detalle: encolado ? "Sin conexión: se envía sola cuando vuelva internet." : `${n} ${n === 1 ? "producto" : "productos"} · ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} · el stock ya se descontó.`,
      });
      setMensaje(encolado ? `Venta guardada en este dispositivo (${pesos(total)}). Sin conexión: se envía sola cuando vuelva.` : `Venta registrada: ${pesos(total)} en ${(NOMBRE_MEDIO[medio] ?? medio).toLowerCase()}.`);
    } catch (e) {
      if (e instanceof ErrorApi) { setError(e.message); setOcupado(false); return; }
      throw e;
    }
    setItems([]); setMedio(null); setClienteId(""); setOcupado(false);
  }

  async function noLlevo() {
    if (items.length === 0) return;
    const consultaItems = items.map((it) => ({ producto_id: it.producto?.id ?? null, descripcion: it.descripcion, precio_ofrecido: precioDe(it).unitario }));
    enviarOEncolar("consulta", "POST", "/consultas", { items: consultaItems, dispositivo_id: describirDispositivo() }).catch(() => undefined);
    setItems([]); setMedio(null); setClienteId("");
    setMensaje("Anotado como consulta: qué pidió y a cuánto se ofreció.");
    caja.current?.focus();
  }

  const cliente = clientes.find((c) => c.id === clienteId);
  const vacio = items.length === 0 && !consulta.trim() && !mensaje && !error && !codigoDesconocido;

  return (
    <main className="contenido vender-ancho">
      <div className="encabezado">
        <div className="fila-titulo">
          <span className="solo-celular"><EstadoDeConexion testId="conexion-celular" /></span>
          <span className="solo-escritorio"><small>{pendientes > 0 ? `${pendientes} cambio(s) guardados sin enviar · ` : ""}Enter agrega · Esc descarta · F5 a F8 medio de pago · F2 cobrar</small></span>
          {esDueno && hoy && <button type="button" className="chip" onClick={() => setHoja("hoy")} data-testid="hoy"><span className="suave">Hoy</span>{pesosCortos(hoy.total)}</button>}
        </div>
        <h1 className="titulo">Vender</h1>
        <Buscador valor={consulta} alCambiar={setConsulta} placeholder={catalogo ? "Buscar producto o código" : "Bajando el catálogo…"} disabled={!catalogo} autoFoco onKeyDown={teclasBusqueda} cajaRef={caja}
          alEscanear={hayCamara() ? () => setEscaneando(true) : undefined} />
        {(!hayCamara() || window.innerWidth > 900) && <div className="solo-escritorio"><VincularCelular vinculado={puestoVinculado} alVincular={alVincular} /></div>}
        {puestoRemoto() && <small data-testid="celular-vinculado-remoto">📱 Vinculado a la computadora</small>}
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
              const precio = p.costo_neto !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: Number(p.costo_neto), margen: p.margen_elegido, iva: Number(p.iva ?? 0.21) }).valor : null;
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
          <div className="lista">
            <button type="button" className="fila" onClick={() => agregar(null, consulta.trim())} data-testid="agregar-libre">
              <span className="nombre">Agregar “{consulta.trim()}” como ítem libre</span><span />
              <span className="detalle">No está en ninguna lista. Le ponés el precio a mano.</span>
            </button>
          </div>
        )}

        {vacio && (
          <div className="vacio">
            <div className="icono"><Icono nombre="vender" tam={30} grosor={1.8} /></div>
            <strong>Venta nueva</strong>
            <p>Escribí el nombre del producto o escaneá el código de barras.</p>
          </div>
        )}

        {items.map((it) => (
          <ItemDeVenta key={it.clave} item={it} stock={it.producto ? stockPorId.get(it.producto.id) : undefined}
            alCambiar={(c) => cambiarItem(it.clave, c)} alQuitar={() => quitar(it.clave)} alElegirMargen={(m) => elegirMargen(it, m)} alCambiarUnidad={(u) => cambiarUnidad(it, u)}
            alSubirFoto={it.producto ? async (archivo) => { const foto_url = await subirFoto(it.producto!.id, archivo); actualizarProducto(it.producto!.id, { foto_url } as never).catch(() => undefined); cambiarItem(it.clave, { producto: { ...it.producto!, foto_url } }); } : undefined} />
        ))}
      </div>

      {items.length > 0 && (
        <div className="cobro" data-testid="cobro">
          <div className="medios" role="radiogroup" aria-label="medio de pago">
            {MEDIOS.map((m) => (
              <button key={m.valor} type="button" className={medio === m.valor ? "activo" : ""} onClick={() => elegirMedio(m.valor)} title={m.tecla}>{m.corto}</button>
            ))}
          </div>
          {medio === "cuenta_corriente" && (
            <button type="button" className={`cliente ${cliente ? "" : "falta"}`} onClick={() => setHoja("clientes")} data-testid="cliente">
              <span>{cliente ? cliente.nombre : "Elegí el cliente"}</span><Icono nombre="derecha" tam={16} grosor={2.5} />
            </button>
          )}
          <div className="acciones auto-1fr">
            <button type="button" className="no-llevo" onClick={noLlevo}>No llevó</button>
            <button type="button" className="boton coral principal" onClick={cobrar} disabled={ocupado} data-testid="cobrar">
              <span>Cobrar</span><span className="importe" data-testid="total">{pesosCortos(total)}</span>
            </button>
          </div>
        </div>
      )}

      {hoja === "clientes" && (
        <Hoja titulo="¿Quién lleva a cuenta?" alCerrar={() => setHoja(null)} testId="hoja-clientes">
          <div className="lista">
            {clientes.length === 0 && <div className="fila"><span className="nombre">Todavía no hay clientes con cuenta corriente.</span></div>}
            {clientes.map((c) => (
              <button key={c.id} type="button" className={`fila ${clienteId === c.id ? "elegida" : ""}`} onClick={() => { setClienteId(c.id); setMedio("cuenta_corriente"); setHoja(null); }}>
                <span className="nombre">{c.nombre}</span>
                <small style={{ color: Number(c.deuda) > 0 ? "var(--coral-texto)" : undefined }}>{Number(c.deuda) > 0 ? `debe ${pesos(c.deuda)}` : "al día"}</small>
              </button>
            ))}
          </div>
        </Hoja>
      )}
      {hoja === "hoy" && hoy && (
        <Hoja titulo="Ventas de hoy" extra={<span className="importe" style={{ fontSize: 26 }}>{pesosCortos(hoy.total)}</span>} alCerrar={() => setHoja(null)} testId="hoja-hoy">
          <ListaDeVentas ventas={hoy.ventas} alAnular={anular} />
        </Hoja>
      )}
      {exito && (
        <Exito que={exito.detalle.startsWith("Sin conexión") ? "Guardada en este dispositivo" : "Venta registrada"} importe={pesosCortos(exito.total)} medio={exito.medio} detalle={exito.detalle} boton="Nueva venta"
          alCerrar={() => { setExito(null); setMensaje(null); caja.current?.focus(); }} />
      )}
    </main>
  );
}

function ItemDeVenta({ item: it, stock, alCambiar, alQuitar, alElegirMargen, alCambiarUnidad, alSubirFoto }: {
  item: Item; stock: number | undefined; alCambiar: (c: Partial<Item>) => void; alQuitar: () => void; alElegirMargen: (m: number) => void; alCambiarUnidad: (u: Unidad) => void; alSubirFoto?: (archivo: File) => Promise<void>;
}) {
  const p = precioDe(it);
  const producto = it.producto;
  const subtotal = p.unitario === null ? null : p.unitario * it.cantidad;
  const margenTexto = it.precioManual !== null ? "a mano" : p.margen === null ? "elegí margen" : `${p.margen} %${esMargenBoton(p.margen) ? "" : " a mano"}`;
  return (
    <div className="item" data-testid="item">
      <div className="cabeza">
        {producto ? <FotoProducto id={producto.id} url={producto.foto_url ?? null} descripcion={producto.descripcion} alSubir={alSubirFoto} /> : <span className="miniatura foto-chica" />}
        {producto ? <span className="nombre" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}>{it.descripcion}</span>
          : <input className="linea-editable" value={it.descripcion} placeholder="¿Qué se lleva?" onChange={(e) => alCambiar({ descripcion: e.target.value })} data-testid="descripcion-libre" />}
        {subtotal !== null ? (
          <Explicacion className="subtotal" valor={pesosCortos(subtotal)} pasos={[...p.pasos, ...(it.cantidad !== 1 ? [`× ${num(it.cantidad)} ${it.unidad === "unidad" ? "unidades" : it.unidad} = ${pesos(subtotal)}`] : [])]} />
        ) : (
          <label className="campo falta importe-campo"><span>$</span><input inputMode="numeric" placeholder="precio" autoFocus={!producto} value={it.precioManual ?? ""} onChange={(e) => alCambiar({ precioManual: e.target.value === "" ? null : Number(e.target.value.replace(/[^\d]/g, "")) })} data-testid="precio-manual" /></label>
        )}
        <small className="detalle">{producto ? `${detalleDe(producto)}${stock !== undefined ? ` · stock ${num(stock)}${stock - it.cantidad < 0 ? " (queda negativo)" : ""}` : ""}` : "Ítem libre"}</small>
      </div>
      <div className="pie">
        <Contador valor={it.cantidad} entera={enteras(it.unidad)} alCambiar={(v) => alCambiar({ cantidad: v })}>
          <select className="selector-nativo unidad" value={it.unidad} onChange={(e) => alCambiarUnidad(e.target.value as Unidad)} aria-label="Unidad" data-testid="unidad">
            {UNIDADES.map((u) => <option key={u.valor} value={u.valor}>{u.nombre}</option>)}
          </select>
        </Contador>
        {producto && p.costo !== null && (
          <button type="button" className={`chip-margen ${p.margen === null && it.precioManual === null ? "falta" : ""}`} onClick={() => alCambiar({ abierto: !it.abierto })} aria-expanded={it.abierto} aria-label={`Margen: ${margenTexto}`} data-testid="margen">
            {margenTexto}<Icono nombre={it.abierto ? "arriba" : "abajo"} tam={14} grosor={2.5} />
          </button>
        )}
        <button type="button" className="quitar" onClick={alQuitar} aria-label="Quitar"><Icono nombre="cerrar" tam={18} grosor={2.2} /></button>
      </div>
      {it.abierto && producto && p.costo !== null && (
        <div className="abierto">
          <div className="cabecera">
            <Explicacion className="enlace punteado" valor={`Costo ${pesos(p.costo)} · ${producto.proveedor ?? "sin proveedor"}`} pasos={producto.explicacion_costo?.length ? producto.explicacion_costo : [`Costo ${pesos(p.costo)} según la lista`]} />
            {p.unitario !== null && <span>{pesos(p.unitario)} c/u</span>}
          </div>
          <div className="cuadricula-5">
            {MARGENES.map((m) => <button key={m} type="button" className={`boton ${p.margen === m ? "activo" : ""}`} onClick={() => alElegirMargen(m)}>{m} %</button>)}
          </div>
          <div className="fila-otro">
            <span>Otro precio solo para esta venta</span>
            <label className="campo"><span>$</span><input inputMode="numeric" placeholder="a mano" value={it.precioManual ?? ""} onChange={(e) => alCambiar({ precioManual: e.target.value === "" ? null : Number(e.target.value.replace(/[^\d]/g, "")) })} data-testid="precio-manual" /></label>
          </div>
        </div>
      )}
    </div>
  );
}
