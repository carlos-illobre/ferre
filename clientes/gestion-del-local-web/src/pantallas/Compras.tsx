import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { api, ErrorApi } from "../api";
import { useCatalogo } from "../catalogo";
import { fecha, pesos, porcentaje } from "../formato";
import type { Producto } from "./Productos";

// Ingreso de mercadería (issue #30): proveedor y comprobante → renglones con la búsqueda
// de siempre → confirmar. Suma stock y, si la factura trae otro costo, ese pasa a ser el
// vigente. Reemplaza el papel semanal de gastos.
type Proveedor = { id: string; nombre: string; activo: boolean };
type Renglon = { clave: string; producto: Producto | null; descripcion: string; cantidad: number; costo: number | null; costoLista: number | null };
type CompraFila = { id: string; fecha: string; comprobante_tipo: string; comprobante_numero: string | null; total: string; estado: string; proveedor: string; renglones: string };
const COMPROBANTES = [{ valor: "factura", nombre: "Factura" }, { valor: "remito", nombre: "Remito" }, { valor: "sin_comprobante", nombre: "Sin comprobante" }] as const;

export function Compras() {
  const { catalogo, error: errorCatalogo, buscarProductos } = useCatalogo();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [comprobante, setComprobante] = useState<(typeof COMPROBANTES)[number]["valor"]>("factura");
  const [numero, setNumero] = useState("");
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().slice(0, 10));
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const [renglones, setRenglones] = useState<Renglon[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [version, setVersion] = useState(0);
  const caja = useRef<HTMLInputElement>(null);

  useEffect(() => { api<Proveedor[]>("/proveedores").then((p) => setProveedores(p.filter((x) => x.activo))).catch(() => undefined); }, []);
  const proveedor = proveedores.find((p) => p.id === proveedorId) ?? null;

  // Primero los productos del proveedor elegido; después el resto.
  const resultados = useMemo(() => {
    if (!consulta.trim()) return [];
    const todos = buscarProductos(consulta, 16);
    return proveedor ? [...todos.filter((p) => p.proveedor === proveedor.nombre), ...todos.filter((p) => p.proveedor !== proveedor.nombre)].slice(0, 8) : todos.slice(0, 8);
  }, [buscarProductos, consulta, proveedor]);
  useEffect(() => { setElegido(0); }, [consulta]);

  const agregar = useCallback((p: Producto | null, libre?: string) => {
    setRenglones((lista) => {
      if (p) {
        const ya = lista.find((r) => r.producto?.id === p.id);
        if (ya) return lista.map((r) => (r === ya ? { ...r, cantidad: r.cantidad + 1 } : r));
        const costoLista = p.costo_neto !== null ? Number(p.costo_neto) : null;
        return [...lista, { clave: crypto.randomUUID(), producto: p, descripcion: p.descripcion, cantidad: 1, costo: costoLista, costoLista }];
      }
      return [...lista, { clave: crypto.randomUUID(), producto: null, descripcion: libre ?? "", cantidad: 1, costo: null, costoLista: null }];
    });
    setConsulta("");
    setMensaje(null);
  }, []);
  const cambiar = (clave: string, c: Partial<Renglon>) => setRenglones((l) => l.map((r) => (r.clave === clave ? { ...r, ...c } : r)));
  const quitar = (clave: string) => { setRenglones((l) => l.filter((r) => r.clave !== clave)); caja.current?.focus(); };

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
    if (!proveedorId) { setError("Elegí el proveedor."); return; }
    if (renglones.length === 0) { setError("La compra no tiene productos."); return; }
    if (sinCosto) { setError("Hay renglones sin costo o sin descripción."); return; }
    setOcupado(true); setError(null);
    try {
      const r = await api<{ total: number; productos_nuevos: number; costos_actualizados: number }>("/compras", {
        method: "POST",
        body: JSON.stringify({
          id: crypto.randomUUID(), proveedor_id: proveedorId, fecha: fechaCompra, comprobante_tipo: comprobante, comprobante_numero: numero || null,
          items: renglones.map((x) => ({ producto_id: x.producto?.id ?? null, descripcion: x.descripcion, cantidad: x.cantidad, costo_unitario: x.costo })),
        }),
      });
      setMensaje(`Compra registrada: ${pesos(r.total)} a ${proveedor?.nombre}. ${r.costos_actualizados} costo(s) actualizado(s) según el comprobante${r.productos_nuevos ? `, ${r.productos_nuevos} producto(s) nuevo(s)` : ""}.`);
      setRenglones([]); setNumero(""); setVersion((v) => v + 1);
      caja.current?.focus();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Sin conexión con el servidor. Registrar una compra necesita internet.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="compras">
      <h1>Ingreso de mercadería</h1>
      <div className="en-linea cabecera-compra">
        <label>Proveedor
          <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} data-testid="proveedor">
            <option value="">Elegir…</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <label>Comprobante
          <select value={comprobante} onChange={(e) => setComprobante(e.target.value as typeof comprobante)} data-testid="comprobante">
            {COMPROBANTES.map((c) => <option key={c.valor} value={c.valor}>{c.nombre}</option>)}
          </select>
        </label>
        {comprobante !== "sin_comprobante" && <label>Número <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="0001-00012345" data-testid="numero" /></label>}
        <label>Fecha <input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} /></label>
      </div>

      <div className="buscador">
        <input ref={caja} className="busqueda" type="search" value={consulta} onChange={(e) => setConsulta(e.target.value)} onKeyDown={teclas} disabled={!catalogo}
          placeholder={catalogo ? "Escribí el producto que llegó, y Enter" : "Bajando el catálogo…"} data-testid="busqueda" autoComplete="off" />
        {resultados.length > 0 && (
          <ul className="sugerencias" role="listbox" data-testid="sugerencias">
            {resultados.map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === elegido} className={i === elegido ? "elegido" : ""} onMouseDown={() => agregar(p)}>
                <span>{p.descripcion}</span> <small>{[p.marca, p.proveedor].filter(Boolean).join(" · ")}</small>
                <strong>{p.costo_neto === null ? "sin costo" : pesos(p.costo_neto)}</strong>
              </li>
            ))}
          </ul>
        )}
        {consulta.trim() && resultados.length === 0 && catalogo && <p className="ayuda">Nada con "{consulta}". Enter lo agrega como producto nuevo y le ponés el costo.</p>}
      </div>
      <p className="ayuda">Enter agrega · el costo viene de la última lista: si la factura dice otra cosa, tipealo y pasa a ser el vigente</p>
      {(error ?? errorCatalogo) && <p className="error" role="alert">{error ?? errorCatalogo}</p>}
      {mensaje && <p className="exito" role="status" data-testid="mensaje">{mensaje}</p>}

      <div className="tabla-scroll">
      <table className="venta" data-testid="renglones">
        <thead>{renglones.length > 0 && <tr><th>Producto</th><th>Cant.</th><th>Costo unitario (sin IVA)</th><th>Según lista</th><th>Subtotal</th><th /></tr>}</thead>
        <tbody>
          {renglones.map((r) => {
            const dif = r.costo !== null && r.costoLista !== null && r.costoLista > 0 ? ((r.costo - r.costoLista) / r.costoLista) * 100 : null;
            return (
              <tr key={r.clave} data-testid="renglon" className={r.costo === null ? "sin-precio-fila" : ""}>
                <td>{r.producto ? <><strong>{r.descripcion}</strong><br /><small>{[r.producto.marca, r.producto.proveedor].filter(Boolean).join(" · ")}</small></> : <input className="libre" value={r.descripcion} placeholder="Descripción del producto nuevo" onChange={(e) => cambiar(r.clave, { descripcion: e.target.value })} />}</td>
                <td><input type="number" min="0.001" step="1" className="cantidad" value={r.cantidad} onChange={(e) => cambiar(r.clave, { cantidad: Number(e.target.value) })} data-testid="cantidad" /></td>
                <td><input type="number" min="0" step="0.01" className="precio-manual" value={r.costo ?? ""} placeholder="costo" onChange={(e) => cambiar(r.clave, { costo: e.target.value === "" ? null : Number(e.target.value) })} data-testid="costo" /></td>
                <td>{r.costoLista === null ? <em>sin lista</em> : <>{pesos(r.costoLista)}{dif !== null && Math.abs(dif) >= 0.05 && <small className={dif > 0 ? "sube" : "baja"}> {porcentaje(dif)}</small>}</>}</td>
                <td className="precio">{r.costo === null ? "" : pesos(r.costo * r.cantidad)}</td>
                <td><button className="enlace chico" onClick={() => quitar(r.clave)} title="Quitar">✕</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {renglones.length > 0 && (
        <div className="cobro">
          <div className="total" data-testid="total">Total <strong>{pesos(total)}</strong> <small>sin IVA</small></div>
          <div className="acciones">
            <button className="grande" onClick={confirmar} disabled={ocupado} data-testid="confirmar">Registrar ingreso</button>
            <button className="secundario" onClick={() => setRenglones([])}>Descartar</button>
          </div>
        </div>
      )}

      <GastosDeLaSemana version={version} />
      <ComprasRecientes version={version} alCambiar={() => setVersion((v) => v + 1)} />
    </section>
  );
}

function GastosDeLaSemana({ version }: { version: number }) {
  const [datos, setDatos] = useState<{ desde: string; por_proveedor: { proveedor: string; total: string; compras: string }[]; total: number } | null>(null);
  useEffect(() => { api<typeof datos>("/compras/semana").then(setDatos).catch(() => setDatos(null)); }, [version]);
  if (!datos || datos.por_proveedor.length === 0) return null;
  return (
    <details className="tarjeta" open data-testid="gastos-semana">
      <summary>Gastos de la semana (desde el {fecha(datos.desde)}): <strong>{pesos(datos.total)}</strong></summary>
      <table>
        <thead><tr><th>Proveedor</th><th>Compras</th><th>Total</th></tr></thead>
        <tbody>{datos.por_proveedor.map((p) => <tr key={p.proveedor}><td>{p.proveedor}</td><td>{p.compras}</td><td>{pesos(p.total)}</td></tr>)}</tbody>
      </table>
    </details>
  );
}

function ComprasRecientes({ version, alCambiar }: { version: number; alCambiar: () => void }) {
  const [filas, setFilas] = useState<CompraFila[]>([]);
  useEffect(() => { api<CompraFila[]>("/compras").then(setFilas).catch(() => setFilas([])); }, [version]);
  if (filas.length === 0) return null;
  const nombreComprobante = (c: CompraFila) => c.comprobante_tipo === "sin_comprobante" ? "sin comprobante" : `${c.comprobante_tipo} ${c.comprobante_numero ?? "s/n"}`;
  async function anular(c: CompraFila) {
    const motivo = window.prompt(`¿Anular la compra de ${pesos(c.total)} a ${c.proveedor}? Motivo (opcional):`);
    if (motivo === null) return;
    await api(`/compras/${c.id}/anular`, { method: "POST", body: JSON.stringify({ motivo }) }).catch(() => undefined);
    alCambiar();
  }
  return (
    <details className="tarjeta" data-testid="compras-recientes">
      <summary>Compras recientes ({filas.length})</summary>
      <table>
        <thead><tr><th>Fecha</th><th>Proveedor</th><th>Comprobante</th><th>Renglones</th><th>Total</th><th /></tr></thead>
        <tbody>
          {filas.map((c) => (
            <tr key={c.id} className={c.estado === "anulada" ? "anulada" : ""}>
              <td>{fecha(c.fecha)}</td><td>{c.proveedor}</td><td>{nombreComprobante(c)}</td><td>{c.renglones}</td><td>{pesos(c.total)}</td>
              <td>{c.estado === "anulada" ? <em>anulada</em> : <button className="enlace chico" onClick={() => anular(c)}>Anular</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
