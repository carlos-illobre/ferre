import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ErrorApi } from "../api";
import { enviarOEncolar } from "../cola";
import { useCatalogo } from "../catalogo";
import { fecha, pesos } from "../formato";
import type { Producto } from "./Productos";

// Stock actual y valorización (issue #33). Cada número se explica: el stock, con sus
// movimientos; el valor, como stock × costo vigente.
type StockFila = { id: string; stock: string; costo_neto: string | null; proveedor: string | null; valor: string; ultimo_movimiento: string | null };
type Datos = { productos: StockFila[]; valor_total: number; por_proveedor: Record<string, { unidades: number; valor: number; productos: number }> };
type Movimiento = { id: string; tipo: string; cantidad: string; referencia_tipo: string | null; fecha: string; nota: string | null };

export function Stock() {
  const { catalogo, buscarProductos } = useCatalogo();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);

  const cargar = useCallback(() => api<Datos>("/stock").then((d) => { setDatos(d); setError(null); }).catch((e) => setError(e instanceof ErrorApi ? e.message : "Sin conexión con el servidor.")), []);
  useEffect(() => { void cargar(); }, [cargar]);

  const porId = useMemo(() => new Map((datos?.productos ?? []).map((s) => [s.id, s])), [datos]);
  const filas = useMemo(() => {
    if (!catalogo) return [];
    const base: Producto[] = consulta.trim() ? buscarProductos(consulta, 100) : catalogo.filter((p) => porId.has(p.id)).sort((a, b) => Number(porId.get(b.id)!.valor) - Number(porId.get(a.id)!.valor)).slice(0, 100);
    return base;
  }, [catalogo, consulta, buscarProductos, porId]);

  return (
    <section className="stock">
      <h1>Stock</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {datos && (
        <div className="numeros" data-testid="valorizacion">
          <div><dt>Valor del inventario</dt><dd>{pesos(datos.valor_total)}</dd><small>al costo vigente, sin IVA</small></div>
          {Object.entries(datos.por_proveedor).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5).map(([nombre, v]) => (
            <div key={nombre}><dt>{nombre}</dt><dd>{pesos(v.valor)}</dd><small>{v.productos} productos · {v.unidades.toLocaleString("es-AR")} unidades</small></div>
          ))}
        </div>
      )}
      <p className="ayuda">El stock es la suma de compras, ventas y ajustes desde que se usa el sistema. Hasta el conteo, lo que no se cargó no está.</p>
      <input className="busqueda" type="search" value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Buscar un producto para ver su stock, o corregirlo" data-testid="busqueda" autoComplete="off" />
      <div className="tabla-scroll">
        <table data-testid="tabla-stock">
          <thead><tr><th>Producto</th><th>Proveedor</th><th>Stock</th><th>Costo</th><th>Valor</th><th>Último movimiento</th><th /></tr></thead>
          <tbody>
            {filas.map((p) => {
              const s = porId.get(p.id);
              const cantidad = s ? Number(s.stock) : 0;
              return (
                <FilaStock key={p.id} producto={p} cantidad={cantidad} fila={s ?? null} abierto={abierto === p.id} alAbrir={() => setAbierto(abierto === p.id ? null : p.id)} alAjustar={cargar} />
              );
            })}
          </tbody>
        </table>
      </div>
      {consulta.trim() && filas.length === 0 && catalogo && <p>Nada con "{consulta}".</p>}
    </section>
  );
}

function FilaStock({ producto: p, cantidad, fila, abierto, alAbrir, alAjustar }: { producto: Producto; cantidad: number; fila: StockFila | null; abierto: boolean; alAbrir: () => void; alAjustar: () => Promise<void> }) {
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);
  const [ajustando, setAjustando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (abierto) api<Movimiento[]>(`/stock/${p.id}/movimientos`).then(setMovimientos).catch(() => setMovimientos([])); }, [abierto, p.id]);

  async function ajustar(real: number, motivo: string) {
    try {
      await enviarOEncolar("stock.ajuste", "POST", `/stock/${p.id}/ajustes`, { cantidad_real: real, motivo });
      setAjustando(false); setMovimientos(null); setError(null);
      await alAjustar();
      if (abierto) api<Movimiento[]>(`/stock/${p.id}/movimientos`).then(setMovimientos).catch(() => undefined);
    } catch (e) { setError((e as Error).message); }
  }
  const nombreTipo = (m: Movimiento) => m.tipo === "venta" ? "Venta" : m.tipo === "compra" ? "Compra" : m.referencia_tipo === "conteo" ? "Conteo" : "Ajuste";

  return (
    <>
      <tr data-testid="fila-stock" className={cantidad < 0 ? "vieja" : ""}>
        <td><strong>{p.descripcion}</strong><br /><small>{[p.marca, p.codigo_proveedor].filter(Boolean).join(" · ")}</small></td>
        <td>{fila?.proveedor ?? p.proveedor ?? ""}</td>
        <td className="precio"><button className="enlace" onClick={alAbrir} data-testid="stock" title="Ver los movimientos">{cantidad.toLocaleString("es-AR")} {p.unidad === "unidad" ? "u." : p.unidad}</button></td>
        <td>{fila?.costo_neto ? pesos(fila.costo_neto) : <em>—</em>}</td>
        <td className="precio">{fila ? pesos(fila.valor) : "—"}</td>
        <td>{fila?.ultimo_movimiento ? new Date(fila.ultimo_movimiento).toLocaleDateString("es-AR") : "—"}</td>
        <td>{ajustando ? null : <button className="enlace chico" onClick={() => setAjustando(true)}>Corregir</button>}</td>
      </tr>
      {(abierto || ajustando) && (
        <tr className="detalle-stock">
          <td colSpan={7}>
           <div className="detalle-animado"><div>
            {ajustando && (
              <form className="en-linea" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); ajustar(Number(d.get("real")), String(d.get("motivo") ?? "")); }}>
                <label>Hay <input name="real" type="number" min="0" step="1" defaultValue={cantidad} autoFocus data-testid="cantidad-real" style={{ width: "6rem" }} /></label>
                <input name="motivo" placeholder="Motivo (opcional): conté la estantería, rotura…" style={{ minWidth: "18rem" }} />
                <button type="submit" className="boton primario" data-testid="guardar-ajuste">Guardar</button>
                <button type="button" className="secundario" onClick={() => setAjustando(false)}>Cancelar</button>
                {error && <span className="error">{error}</span>}
              </form>
            )}
            {abierto && (
              <>
                <p><small>Stock {cantidad.toLocaleString("es-AR")} = suma de estos movimientos{fila?.costo_neto ? ` · Valor ${pesos(fila.valor)} = ${cantidad.toLocaleString("es-AR")} × ${pesos(fila.costo_neto)}` : ""}</small></p>
                {movimientos === null ? <small>Cargando…</small> : movimientos.length === 0 ? <small>Sin movimientos.</small> : (
                  <table className="movimientos" data-testid="movimientos">
                    <tbody>
                      {movimientos.map((m) => (
                        <tr key={m.id}><td>{fecha(m.fecha.slice(0, 10))}</td><td>{nombreTipo(m)}</td><td className={Number(m.cantidad) < 0 ? "sube" : "baja"}>{Number(m.cantidad) > 0 ? "+" : ""}{Number(m.cantidad).toLocaleString("es-AR")}</td><td><small>{m.nota ?? ""}</small></td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
           </div></div>
          </td>
        </tr>
      )}
    </>
  );
}
