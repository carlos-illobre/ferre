import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { margenReal, MARGENES, precioDeVenta, type Margen } from "@ferre/calculo-de-precios";
import { api, ErrorApi } from "../api";
import { useCatalogo } from "../catalogo";
import { Explicacion } from "../componentes/Explicacion";
import { fecha, pesos } from "../formato";
import { encolar, enviarPendientes, leerPendientes } from "../ventas-pendientes";
import { describirDispositivo } from "./Login";
import type { Producto } from "./Productos";

// La venta (issue #15): el orden es el del mostrador (docs/proceso-actual.md). Buscar →
// costo, margen y precio → cantidad → cobro. Enter agrega; Esc descarta ("no llevó");
// F2 cobra. Nada obligatorio que el cuaderno no tenga.
type Item = {
  clave: string; producto: Producto | null; descripcion: string; cantidad: number;
  precioManual: number | null; // precio tipeado en esta venta (o del producto), pisa al margen
};
const MEDIOS: { valor: "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente"; nombre: string; tecla: string }[] = [
  { valor: "efectivo", nombre: "Efectivo", tecla: "F5" },
  { valor: "mercado_pago", nombre: "Mercado Pago", tecla: "F6" },
  { valor: "tarjeta", nombre: "Tarjeta", tecla: "F7" },
  { valor: "cuenta_corriente", nombre: "Cuenta corriente", tecla: "F8" },
];
type Cliente = { id: string; nombre: string; deuda: string };

function precioDe(item: Item): { unitario: number | null; pasos: string[]; margen: Margen | null; costo: number | null; iva: number } {
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
  const { catalogo, error: errorCatalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [medio, setMedio] = useState<(typeof MEDIOS)[number]["valor"] | null>(null);
  const [clienteId, setClienteId] = useState<string>("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState(leerPendientes().length);
  const [ocupado, setOcupado] = useState(false);
  const caja = useRef<HTMLInputElement>(null);

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 8) : []), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);
  useEffect(() => { caja.current?.focus(); }, [catalogo]);
  useEffect(() => { api<Cliente[]>("/clientes").then(setClientes).catch(() => undefined); }, []);
  useEffect(() => {
    const reintentar = () => { enviarPendientes().then(setPendientes).catch(() => undefined); };
    reintentar();
    window.addEventListener("online", reintentar);
    return () => window.removeEventListener("online", reintentar);
  }, []);

  const total = items.reduce((s, it) => s + (precioDe(it).unitario ?? 0) * it.cantidad, 0);
  const sinPrecio = items.some((it) => precioDe(it).unitario === null);

  const agregar = useCallback((p: Producto | null, descripcionLibre?: string) => {
    setItems((lista) => {
      if (p) {
        const ya = lista.find((it) => it.producto?.id === p.id);
        if (ya) return lista.map((it) => (it === ya ? { ...it, cantidad: it.cantidad + 1 } : it));
        return [...lista, { clave: crypto.randomUUID(), producto: p, descripcion: p.descripcion, cantidad: 1, precioManual: p.precio_manual !== null ? Number(p.precio_manual) : null }];
      }
      return [...lista, { clave: crypto.randomUUID(), producto: null, descripcion: descripcionLibre ?? "", cantidad: 1, precioManual: null }];
    });
    setConsulta("");
    setMensaje(null);
  }, []);

  function cambiarItem(clave: string, cambios: Partial<Item>) {
    setItems((lista) => lista.map((it) => (it.clave === clave ? { ...it, ...cambios } : it)));
  }
  function quitar(clave: string) {
    setItems((lista) => lista.filter((it) => it.clave !== clave));
    caja.current?.focus();
  }
  function elegirMargen(item: Item, margen: Margen) {
    if (!item.producto) return;
    // Queda guardado en el producto: la próxima vez ya viene con ese margen (#13).
    actualizarProducto(item.producto.id, { margen_elegido: margen, precio_manual: null }).catch(() => undefined);
    cambiarItem(item.clave, { precioManual: null, producto: { ...item.producto, margen_elegido: margen, precio_manual: null } });
  }

  function teclasBusqueda(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (resultados[elegido]) agregar(resultados[elegido]);
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
      await api("/ventas", { method: "POST", body: JSON.stringify(cuerpo) });
      setMensaje(`Venta registrada: ${pesos(total)} en ${MEDIOS.find((m) => m.valor === medio)!.nombre.toLowerCase()}.`);
    } catch (e) {
      if (e instanceof ErrorApi) { setError(e.message); setOcupado(false); return; }
      // Sin conexión: la venta queda guardada acá y se envía sola al reconectar.
      encolar({ id, fecha: cuerpo.fecha, cuerpo, total });
      setPendientes(leerPendientes().length);
      setMensaje(`Venta guardada en este dispositivo (${pesos(total)}). Sin conexión: se envía sola cuando vuelva.`);
    }
    setItems([]); setMedio(null); setClienteId(""); setOcupado(false);
    caja.current?.focus();
  }

  async function noLlevo() {
    if (items.length === 0) return;
    const consultaItems = items.map((it) => ({ producto_id: it.producto?.id ?? null, descripcion: it.descripcion, precio_ofrecido: precioDe(it).unitario }));
    api("/consultas", { method: "POST", body: JSON.stringify({ items: consultaItems, dispositivo_id: describirDispositivo() }) }).catch(() => undefined);
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
              const precio = p.precio_manual !== null ? Number(p.precio_manual) : p.costo_neto !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: Number(p.costo_neto), margen: p.margen_elegido, iva: Number(p.iva ?? 0.21) }).valor : null;
              return (
                <li key={p.id} role="option" aria-selected={i === elegido} className={i === elegido ? "elegido" : ""} onMouseDown={() => agregar(p)}>
                  <span>{p.descripcion}</span> <small>{[p.marca, p.proveedor].filter(Boolean).join(" · ")}</small>
                  <strong>{precio === null ? "sin precio" : pesos(precio)}</strong>
                </li>
              );
            })}
          </ul>
        )}
        {consulta.trim() && resultados.length === 0 && catalogo && <p className="ayuda">Nada con "{consulta}". Enter lo agrega como ítem libre y le ponés el precio.</p>}
      </div>
      <p className="ayuda">Enter agrega · Esc descarta · F5 efectivo · F6 Mercado Pago · F7 tarjeta · F8 cuenta corriente · F2 cobrar{pendientes > 0 ? ` · ${pendientes} venta(s) guardadas sin enviar` : ""}</p>
      {(error ?? errorCatalogo) && <p className="error" role="alert">{error ?? errorCatalogo}</p>}
      {mensaje && <p className="exito" role="status" data-testid="mensaje">{mensaje}</p>}

      <table className="venta" data-testid="venta">
        <thead>{items.length > 0 && <tr><th>Producto</th><th>Costo</th><th>Margen</th><th>Precio</th><th>Cant.</th><th>Subtotal</th><th /></tr>}</thead>
        <tbody>
          {items.map((it) => {
            const p = precioDe(it);
            return (
              <tr key={it.clave} data-testid="item" className={p.unitario === null ? "sin-precio-fila" : ""}>
                <td>
                  {it.producto ? <strong>{it.descripcion}</strong> : <input className="libre" value={it.descripcion} placeholder="Descripción" onChange={(e) => cambiarItem(it.clave, { descripcion: e.target.value })} />}
                  {it.producto && <><br /><small>{[it.producto.marca, it.producto.proveedor].filter(Boolean).join(" · ")}</small></>}
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
                    type="number" min="0" step="10" className="precio-manual" placeholder="a mano"
                    value={it.precioManual ?? ""}
                    onChange={(e) => cambiarItem(it.clave, { precioManual: e.target.value === "" ? null : Number(e.target.value) })}
                    data-testid="precio-manual"
                  />
                </td>
                <td><input type="number" min="0.001" step="1" className="cantidad" value={it.cantidad} onChange={(e) => cambiarItem(it.clave, { cantidad: Number(e.target.value) })} data-testid="cantidad" /></td>
                <td className="precio">{p.unitario === null ? "" : pesos(p.unitario * it.cantidad)}</td>
                <td><button className="enlace chico" onClick={() => quitar(it.clave)} title="Quitar">✕</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>

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
    <details className="tarjeta" data-testid="ventas-de-hoy">
      <summary>Ventas de hoy: <strong>{pesos(datos.total)}</strong> {Object.entries(datos.totales).map(([m, t]) => `· ${nombre(m)} ${pesos(t)}`).join(" ")} ({datos.ventas.filter((v) => v.estado === "confirmada").length})</summary>
      <table>
        <thead><tr><th>Hora</th><th>Productos</th><th>Pago</th><th>Total</th><th /></tr></thead>
        <tbody>
          {datos.ventas.map((v) => (
            <tr key={v.id} className={v.estado === "anulada" ? "anulada" : ""}>
              <td>{new Date(v.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
              <td>{v.items.map((i) => `${Number(i.cantidad)} × ${i.descripcion}`).join(", ")}</td>
              <td>{nombre(v.medio_pago)}{v.cliente ? ` · ${v.cliente}` : ""}</td>
              <td>{pesos(v.total)}</td>
              <td>{v.estado === "anulada" ? <em>anulada</em> : <button className="enlace chico" onClick={() => anular(v)}>Anular</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <small>{fecha(new Date().toISOString().slice(0, 10))}</small>
    </details>
  );
}
