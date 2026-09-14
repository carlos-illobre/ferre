import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { margenReal, MARGENES, precioDeVenta } from "@ferre/calculo-de-precios";
import { FotoProducto } from "../componentes/Foto";
import { Desplegable } from "../componentes/Desplegable";
import { cantidadValida, enteras, UNIDADES, unidadDe, type Unidad } from "../unidades";
import { api, ErrorApi } from "../api";
import { guardar, borrarAnterioresA } from "../almacen";
import { alCambiarLaCola, enviarOEncolar, enviarPendientes, pendientes as pendientesEnCola } from "../cola";
import { useCatalogo } from "../catalogo";
import { useTeclasGlobales } from "../teclas";
import { Explicacion } from "../componentes/Explicacion";
import { fecha, pesos } from "../formato";
import { describirDispositivo } from "./Login";
import { Escaner, hayCamara } from "../componentes/Escaner";
import { VincularCelular } from "../componentes/VincularCelular";
import { enviarCodigoAlPuesto, escucharPuesto, puestoRemoto } from "../puesto";
import type { Producto } from "./Productos";

// La venta (issue #15): el orden es el del mostrador (docs/proceso-actual.md). Buscar →
// costo, margen y precio → cantidad → cobro. Enter agrega; Esc descarta ("no llevó");
// F2 cobra. Nada obligatorio que el cuaderno no tenga.
type Item = {
  clave: string; producto: Producto | null; descripcion: string; cantidad: number;
  unidad: Unidad; // por unidades enteras o por kilo/metro/litro (con un decimal)
  precioManual: number | null; // precio tipeado en esta venta, pisa al margen
};

const MEDIOS: { valor: "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente"; nombre: string; tecla: string }[] = [
  { valor: "efectivo", nombre: "Efectivo", tecla: "F5" },
  { valor: "mercado_pago", nombre: "Mercado Pago", tecla: "F6" },
  { valor: "tarjeta", nombre: "Tarjeta", tecla: "F7" },
  { valor: "cuenta_corriente", nombre: "Cuenta corriente", tecla: "F8" },
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

export function Vender() {
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
  const caja = useRef<HTMLInputElement>(null);

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
        return [...lista, { clave: crypto.randomUUID(), producto: p, descripcion: p.descripcion, cantidad: 1, unidad: unidadDe(p), precioManual: null }];
      }
      return [...lista, { clave: crypto.randomUUID(), producto: null, descripcion: descripcionLibre ?? "", cantidad: 1, unidad: unidadDe(p), precioManual: null }];
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

  // El oyente del flujo de eventos se crea una sola vez: siempre tiene que ver la versión
  // más nueva de agregarPorCodigo (con el catálogo actualizado, por ejemplo tras asociar
  // un código), por eso pasa por una referencia.
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

  // En el celular: lo escaneado se agrega acá y, si hay laptop vinculada, se le manda.
  const alDetectar = useCallback((codigo: string) => {
    const conocido = manejarCodigo.current(codigo);
    setUltimoEscaneo(conocido ? `${codigo}: agregado` : `${codigo}: no está en el catálogo`);
    if (puestoRemoto()) enviarCodigoAlPuesto(codigo).then((ok) => { if (ok) setUltimoEscaneo((u) => `${u ?? codigo} · enviado a la computadora ✓`); });
  }, []);

  function cambiarItem(clave: string, cambios: Partial<Item>) {
    setItems((lista) => lista.map((it) => (it.clave === clave ? { ...it, ...cambios } : it)));
  }
  function cambiarUnidad(item: Item, unidad: Unidad) {
    cambiarItem(item.clave, { unidad, cantidad: cantidadValida(String(item.cantidad), unidad) || 1 });
    // Queda guardado en el producto: la próxima vez ya se vende así.
    if (item.producto) actualizarProducto(item.producto.id, { unidad } as never).catch(() => undefined);
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
      if (medioTecla) { e.preventDefault(); setMedio(medioTecla.valor); }
      else if (e.key === "F2") { e.preventDefault(); void cobrar(); }
    };
    window.addEventListener("keydown", global);
    return () => window.removeEventListener("keydown", global);
  });
  // Flechas y Esc también sin foco en la búsqueda (salvo dentro de otro campo).
  useTeclasGlobales(useCallback((e: globalThis.KeyboardEvent) => {
    if (document.activeElement === caja.current) return; // ya lo maneja la caja
    if (e.key === "ArrowDown" && resultados.length) { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp" && resultados.length) { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Escape") { caja.current?.focus(); }
  }, [resultados.length]), caja.current);

  async function cobrar() {
    if (items.length === 0 || ocupado) return;
    if (sinPrecio) { setError("Hay productos sin precio: elegí un margen o tipeá el precio."); return; }
    if (!medio) { setError("Elegí cómo paga: efectivo, Mercado Pago, tarjeta o cuenta corriente."); return; }
    if (medio === "cuenta_corriente" && !clienteId) { setError("Cuenta corriente: elegí el cliente."); return; }
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
    try {
      const { encolado } = await enviarOEncolar("venta", "POST", "/ventas", cuerpo);
      // Copia local de la venta (7 días) y stock visto por el mostrador.
      guardar("ventas", { id, fecha: cuerpo.fecha, total, medio_pago: medio, items: cuerpo.items, enviada: !encolado }).catch(() => undefined);
      for (const it of items) if (it.producto) ajustarStockLocal(it.producto.id, -it.cantidad);
      setMensaje(encolado
        ? `Venta guardada en este dispositivo (${pesos(total)}). Sin conexión: se envía sola cuando vuelva.`
        : `Venta registrada: ${pesos(total)} en ${MEDIOS.find((m) => m.valor === medio)!.nombre.toLowerCase()}.`);
    } catch (e) {
      if (e instanceof ErrorApi) { setError(e.message); setOcupado(false); return; }
      throw e;
    }
    setItems([]); setMedio(null); setClienteId(""); setOcupado(false);
    caja.current?.focus();
  }

  async function noLlevo() {
    if (items.length === 0) return;
    const consultaItems = items.map((it) => ({ producto_id: it.producto?.id ?? null, descripcion: it.descripcion, precio_ofrecido: precioDe(it).unitario }));
    enviarOEncolar("consulta", "POST", "/consultas", { items: consultaItems, dispositivo_id: describirDispositivo() }).catch(() => undefined);
    setItems([]); setMedio(null); setClienteId("");
    setMensaje("Anotado como consulta: qué pidió y a cuánto se ofreció.");
    caja.current?.focus();
  }

  return (
    <section className="vender">
      <div className="buscador">
        <input
          ref={caja}
          className="busqueda"
          type="search"
          placeholder={catalogo ? "Escribí el producto o escaneá el código, y Enter" : "Bajando el catálogo…"}
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={teclasBusqueda}
          disabled={!catalogo}
          data-testid="busqueda"
          autoComplete="off"
        />
        {resultados.length > 0 && (
          <ul className="sugerencias" role="listbox" data-testid="sugerencias">
            {resultados.map((p, i) => {
              const precio = p.costo_neto !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: Number(p.costo_neto), margen: p.margen_elegido, iva: Number(p.iva ?? 0.21) }).valor : null;
              return (
                <li key={p.id} role="option" aria-selected={i === elegido} className={i === elegido ? "elegido" : ""} onMouseDown={() => agregar(p)}>
                  <span>{p.descripcion}</span> <small>{[p.marca, p.proveedor].filter(Boolean).join(" · ")}{stockPorId.has(p.id) ? ` · stock ${stockPorId.get(p.id)!.toLocaleString("es-AR")}` : ""}</small>
                  <strong>{precio === null ? "sin precio" : pesos(precio)}</strong>
                </li>
              );
            })}
          </ul>
        )}
        {consulta.trim() && resultados.length === 0 && catalogo && <p className="ayuda">Nada con "{consulta}". Enter lo agrega como ítem libre y le ponés el precio.</p>}
      </div>
      <div className="en-linea herramientas">
        {hayCamara() && <button className="secundario" onClick={() => setEscaneando(true)} data-testid="escanear">📷 Escanear</button>}
        {!hayCamara() || window.innerWidth > 900 ? <VincularCelular vinculado={puestoVinculado} alVincular={alVincular} /> : null}
        {puestoRemoto() && <small data-testid="celular-vinculado-remoto">📱 Vinculado a la computadora</small>}
      </div>
      {codigoDesconocido && (
        <p className="aviso" data-testid="codigo-desconocido">
          El código <code>{codigoDesconocido}</code> no está en el catálogo. Buscá el producto y dale Enter para asociarlo.
          <button className="enlace chico" onClick={() => setCodigoDesconocido(null)}>Ignorar</button>
        </p>
      )}
      <p className="ayuda solo-escritorio">Enter agrega · Esc descarta · F5 efectivo · F6 Mercado Pago · F7 tarjeta · F8 cuenta corriente · F2 cobrar{pendientes > 0 ? ` · ${pendientes} cambio(s) guardados sin enviar` : ""}</p>
      {escaneando && <Escaner alDetectar={alDetectar} alCerrar={() => setEscaneando(false)} ultimo={ultimoEscaneo} />}
      {(error ?? errorCatalogo) && <p className="error" role="alert">{error ?? errorCatalogo}</p>}
      {mensaje && <p className="exito" role="status" data-testid="mensaje">{mensaje}</p>}

      <div className="tabla-scroll">
      <table className="venta" data-testid="venta">
        <thead>{items.length > 0 && <tr><th /><th>Producto</th><th>Costo</th><th>Margen</th><th>Precio</th><th>Cant.</th><th>Subtotal</th><th /></tr>}</thead>
        <tbody>
          {items.map((it) => {
            const p = precioDe(it);
            return (
              <tr key={it.clave} data-testid="item" className={p.unitario === null ? "sin-precio-fila" : ""}>
                <td className="celda-foto">{it.producto && <FotoProducto id={it.producto.id} url={it.producto.foto_url ?? null} descripcion={it.descripcion} />}</td>
                <td>
                  {it.producto ? <strong>{it.descripcion}</strong> : <input className="libre" value={it.descripcion} placeholder="Descripción" onChange={(e) => cambiarItem(it.clave, { descripcion: e.target.value })} />}
                  {it.producto && <><br /><small>{[it.producto.marca, it.producto.proveedor].filter(Boolean).join(" · ")}{stockPorId.has(it.producto.id) ? <> · stock {stockPorId.get(it.producto.id)!.toLocaleString("es-AR")}{stockPorId.get(it.producto.id)! - it.cantidad < 0 && <span className="sube" title="La venta deja el stock negativo: seguramente falta cargar una compra o contar"> (queda negativo)</span>}</> : ""}</small></>}
                </td>
                <td>{p.costo === null ? <em>—</em> : <Explicacion valor={pesos(p.costo)} pasos={it.producto?.explicacion_costo?.length ? it.producto.explicacion_costo : [`Costo ${pesos(p.costo)} según la lista`]} />}</td>
                <td>
                  {it.producto && p.costo !== null ? (
                    <div className="margenes">
                      {MARGENES.map((m) => (
                        <button key={m} className={`margen ${p.margen === m ? "activo" : ""}`} onClick={() => elegirMargen(it, m)}>{m} %</button>
                      ))}
                    </div>
                  ) : <em>—</em>}
                </td>
                <td className="precio">
                  {p.unitario === null ? <em className="sin-precio">elegí margen o precio</em> : <Explicacion valor={pesos(p.unitario)} pasos={p.pasos} />}
                  <input
                    type="number" min="0" step="1" className="precio-manual" placeholder="a mano" title="Un precio distinto solo para esta venta"
                    value={it.precioManual ?? ""}
                    onChange={(e) => cambiarItem(it.clave, { precioManual: e.target.value === "" ? null : Number(e.target.value) })}
                    data-testid="precio-manual"
                  />
                </td>
                <td className="celda-cantidad">
                  <input
                    type="number" min={enteras(it.unidad) ? "1" : "0.1"} step={enteras(it.unidad) ? "1" : "0.1"} inputMode="decimal" className="cantidad"
                    value={it.cantidad === 0 ? "" : it.cantidad}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => cambiarItem(it.clave, { cantidad: cantidadValida(e.target.value, it.unidad) })}
                    onBlur={() => { if (it.cantidad === 0) cambiarItem(it.clave, { cantidad: 1 }); }}
                    data-testid="cantidad"
                  />
                  <select className="unidad" value={it.unidad} onChange={(e) => cambiarUnidad(it, e.target.value as Unidad)} title="Por unidad (enteras) o por kilo, metro o litro (con un decimal)" data-testid="unidad">
                    {UNIDADES.map((u) => <option key={u.valor} value={u.valor}>{u.nombre}</option>)}
                  </select>
                </td>
                <td className="precio">{p.unitario === null ? "" : pesos(p.unitario * it.cantidad)}</td>
                <td><button className="enlace chico" onClick={() => quitar(it.clave)} title="Quitar">✕</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {items.length > 0 && (
        <div className="cobro">
          <div className="total" data-testid="total">Total <strong>{pesos(total)}</strong></div>
          <div className="medios" role="radiogroup" aria-label="medio de pago">
            {MEDIOS.map((m) => (
              <button key={m.valor} className={`medio ${medio === m.valor ? "activo" : ""}`} onClick={() => setMedio(m.valor)} title={m.tecla}>{m.nombre}</button>
            ))}
            {medio === "cuenta_corriente" && (
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} data-testid="cliente">
                <option value="">Cliente…</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}{Number(c.deuda) > 0 ? ` (debe ${pesos(c.deuda)})` : ""}</option>)}
              </select>
            )}
          </div>
          <div className="acciones">
            <button className="grande" onClick={cobrar} disabled={ocupado} data-testid="cobrar">Cobrar {pesos(total)}</button>
            <button className="secundario" onClick={noLlevo}>No llevó</button>
          </div>
        </div>
      )}

      <VentasDeHoy clave={mensaje} />
    </section>
  );
}

type VentaDia = { id: string; fecha: string; medio_pago: string; total: string; estado: string; cliente: string | null; items: { descripcion: string; cantidad: string; precio_unitario: string }[] };

function VentasDeHoy({ clave }: { clave: string | null }) {
  const [datos, setDatos] = useState<{ ventas: VentaDia[]; totales: Record<string, number>; total: number } | null>(null);
  // Ventas con más de un producto: cada producto en su fila, y la venta se puede plegar.
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set());
  const plegar = (id: string) => setPlegadas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const cargar = useCallback(() => api<{ ventas: VentaDia[]; totales: Record<string, number>; total: number }>("/ventas").then(setDatos).catch(() => setDatos(null)), []);
  useEffect(() => { void cargar(); }, [cargar, clave]);
  if (!datos) return null;
  const nombre = (m: string) => MEDIOS.find((x) => x.valor === m)?.nombre ?? m;

  async function anular(v: VentaDia) {
    const motivo = window.prompt(`¿Anular la venta de ${pesos(v.total)}? Motivo (opcional):`);
    if (motivo === null) return;
    await api(`/ventas/${v.id}/anular`, { method: "POST", body: JSON.stringify({ motivo }) }).catch(() => undefined);
    await cargar();
  }

  return (
    <Desplegable testId="ventas-de-hoy" titulo={<>Ventas de hoy: <strong>{pesos(datos.total)}</strong> {Object.entries(datos.totales).map(([m, t]) => `· ${nombre(m)} ${pesos(t)}`).join(" ")} ({datos.ventas.filter((v) => v.estado === "confirmada").length})</>}>
      <table>
        <thead><tr><th>Hora</th><th>Productos</th><th>Pago</th><th>Total</th><th /></tr></thead>
        {datos.ventas.map((v) => {
          const varios = v.items.length > 1;
          const plegada = plegadas.has(v.id);
          return (
            <tbody key={v.id} className={`venta-dia ${v.estado === "anulada" ? "anulada" : ""}`} data-testid="venta-dia">
              <tr className={varios ? "plegable" : ""} onClick={varios ? () => plegar(v.id) : undefined} title={varios ? (plegada ? "Ver los productos" : "Plegar") : undefined}>
                <td>{new Date(v.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
                <td>{varios ? <span className="pliegue">{plegada ? "▸" : "▾"} {v.items.length} productos{plegada ? `: ${v.items.map((i) => i.descripcion).join(", ")}` : ""}</span> : `${Number(v.items[0]?.cantidad ?? 0)} × ${v.items[0]?.descripcion ?? ""}`}</td>
                <td>{nombre(v.medio_pago)}{v.cliente ? ` · ${v.cliente}` : ""}</td>
                <td>{pesos(v.total)}</td>
                <td>{v.estado === "anulada" ? <em>anulada</em> : <button className="enlace chico" onClick={(e) => { e.stopPropagation(); anular(v); }}>Anular</button>}</td>
              </tr>
              {varios && !plegada && v.items.map((i, n) => (
                <tr key={n} className="renglon">
                  <td />
                  <td>{Number(i.cantidad)} × {i.descripcion}</td>
                  <td><small>{pesos(Number(i.precio_unitario))} c/u</small></td>
                  <td>{pesos(Number(i.cantidad) * Number(i.precio_unitario))}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
      <small>{fecha(new Date().toISOString().slice(0, 10))}</small>
    </Desplegable>
  );
}
