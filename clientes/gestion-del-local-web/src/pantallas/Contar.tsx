import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api, ErrorApi } from "../api";
import { enviarOEncolar } from "../cola";
import { useCatalogo } from "../catalogo";
import { fecha } from "../formato";
import type { Producto } from "./Productos";
import { Escaner, hayCamara } from "../componentes/Escaner";

// Conteo cíclico con el celular (issue #31), con una mano: elegir sector → buscar o
// escanear → cuántas hay → siguiente. El sector queda abierto hasta cerrarlo; al cerrar,
// las diferencias contra el stock teórico se aplican como ajustes explicados.
type Sector = { id: string; nombre: string; productos: string; ultimo_conteo: string | null; conteo_abierto: string | null };
type Renglon = { producto_id: string; cantidad_contada: string; contado_en: string; descripcion: string; marca: string | null; stock_teorico: string };
type Conteo = { id: string; estado: string; sector_id: string; sector: string; renglones: Renglon[]; sin_contar: { producto_id: string; descripcion: string; marca: string | null; stock_teorico: string }[] };

export function Contar() {
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [conteo, setConteo] = useState<Conteo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargarSectores = useCallback(() => api<Sector[]>("/sectores").then(setSectores).catch((e) => setError(e instanceof ErrorApi ? e.message : "Sin conexión con el servidor.")), []);
  useEffect(() => { void cargarSectores(); }, [cargarSectores]);

  async function abrir(sectorId: string) {
    try {
      const { id } = await api<{ id: string }>("/conteos", { method: "POST", body: JSON.stringify({ sector_id: sectorId }) });
      setConteo(await api<Conteo>(`/conteos/${id}`));
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }
  async function crearSector(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget; // después del await, e.currentTarget ya no está
    const nombre = String(new FormData(formulario).get("nombre") ?? "").trim();
    if (!nombre) return;
    try {
      const { id } = await api<{ id: string }>("/sectores", { method: "POST", body: JSON.stringify({ nombre }) });
      formulario.reset();
      await cargarSectores();
      await abrir(id);
    } catch (err) { setError((err as Error).message); }
  }

  if (conteo) return <ConteoDeSector conteo={conteo} alActualizar={setConteo} alSalir={() => { setConteo(null); void cargarSectores(); }} />;

  return (
    <section className="contar">
      <h1>Contar</h1>
      <p className="ayuda">Se cuenta de a un sector. Elegí uno para empezar o seguir; al terminar, cerralo y las diferencias se ajustan solas.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <ul className="sectores" data-testid="sectores">
        {sectores.map((s) => {
          const dias = s.ultimo_conteo ? Math.floor((Date.now() - new Date(s.ultimo_conteo).getTime()) / 86400000) : null;
          return (
            <li key={s.id}>
              <button className="sector" onClick={() => abrir(s.id)}>
                <strong>{s.nombre}</strong>
                <small>{s.productos} productos · {s.conteo_abierto ? "conteo en curso" : dias === null ? "nunca contado" : `contado hace ${dias} días`}</small>
              </button>
            </li>
          );
        })}
      </ul>
      <form onSubmit={crearSector} className="en-linea">
        <input name="nombre" placeholder="Sector nuevo (Góndola 1, Pared herramientas…)" required style={{ flex: 1, minWidth: "14rem" }} />
        <button type="submit" className="secundario">Agregar sector</button>
      </form>
    </section>
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
  const alDetectar = useCallback((codigo: string) => {
    const p = (catalogo ?? []).find((x) => x.codigo_barras === codigo || x.codigo_proveedor === codigo);
    if (p) { setEscaneando(false); elegirProducto(p); } else setError(`El código ${codigo} no está en el catálogo: buscalo por nombre.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo]);
  const [resultado, setResultado] = useState<{ ajustados: number; puestos_en_cero: number; contados: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const cajaCantidad = useRef<HTMLInputElement>(null);

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 6) : []), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);
  useEffect(() => { if (producto) cajaCantidad.current?.focus(); else caja.current?.focus(); }, [producto, catalogo]);

  const recargar = useCallback(() => api<Conteo>(`/conteos/${conteo.id}`).then(alActualizar).catch(() => undefined), [conteo.id, alActualizar]);
  const contadoPorId = new Map(conteo.renglones.map((r) => [r.producto_id, r]));

  function elegirProducto(p: Producto) {
    setProducto(p);
    const previo = contadoPorId.get(p.id);
    setCantidad(previo ? String(Number(previo.cantidad_contada)) : "");
    setConsulta("");
  }
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
        // Sin conexión: se muestra lo contado igual; el servidor lo recibe al reconectar.
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

  if (resultado) {
    return (
      <section className="contar">
        <div className="tarjeta resultado-final">
          <div className="tilde" aria-hidden="true">✓</div>
          <p role="status" data-testid="resultado-conteo">{conteo.sector} cerrado: {resultado.contados} productos contados, {resultado.ajustados} con diferencia ajustada{resultado.puestos_en_cero ? `, ${resultado.puestos_en_cero} puestos en cero` : ""}.</p>
          <button className="grande" onClick={alSalir}>Contar otro sector</button>
        </div>
      </section>
    );
  }

  return (
    <section className="contar">
      <div className="en-linea" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>{conteo.sector}</h1>
        <button className="enlace" onClick={alSalir}>Salir (queda abierto)</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      {producto ? (
        <div className="tarjeta contando" data-testid="contando">
          <strong className="nombre">{producto.descripcion}</strong>
          <small>{[producto.marca, producto.codigo_proveedor].filter(Boolean).join(" · ")}</small>
          <label className="cuantas">¿Cuántas hay?
            <input ref={cajaCantidad} type="number" inputMode="numeric" min="0" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void guardar(); if (e.key === "Escape") setProducto(null); }} data-testid="cantidad" />
          </label>
          <div className="acciones">
            <button className="grande" onClick={guardar} data-testid="siguiente">Siguiente</button>
            <button className="secundario" onClick={() => setProducto(null)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="buscador">
          <input ref={caja} className="busqueda" type="search" value={consulta} onChange={(e) => setConsulta(e.target.value)} onKeyDown={teclasBusqueda} disabled={!catalogo}
            placeholder={catalogo ? "Buscá o escaneá el producto" : "Bajando el catálogo…"} data-testid="busqueda" autoComplete="off" />
          {hayCamara() && <button className="secundario" style={{ marginTop: "0.5rem" }} onClick={() => setEscaneando(true)}>📷 Escanear</button>}
          {escaneando && <Escaner alDetectar={alDetectar} alCerrar={() => setEscaneando(false)} />}
          {resultados.length > 0 && (
            <ul className="sugerencias" role="listbox" data-testid="sugerencias">
              {resultados.map((p, i) => (
                <li key={p.id} role="option" aria-selected={i === elegido} className={i === elegido ? "elegido" : ""} onMouseDown={() => elegirProducto(p)}>
                  <span>{p.descripcion}</span> <small>{[p.marca, p.proveedor].filter(Boolean).join(" · ")}</small>
                  <strong>{contadoPorId.has(p.id) ? `ya: ${Number(contadoPorId.get(p.id)!.cantidad_contada)}` : ""}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <h2>Contados ({conteo.renglones.length})</h2>
      {conteo.renglones.length === 0 ? <p className="ayuda">Todavía nada. Buscá el primer producto de la góndola.</p> : (
        <table data-testid="contados">
          <thead><tr><th>Producto</th><th>Contado</th><th>Teórico</th><th>Dif.</th></tr></thead>
          <tbody>
            {conteo.renglones.map((r) => {
              const dif = Number(r.cantidad_contada) - Number(r.stock_teorico);
              return (
                <tr key={r.producto_id} onClick={() => { const p = catalogo?.find((x) => x.id === r.producto_id); if (p) elegirProducto(p); }} style={{ cursor: "pointer" }}>
                  <td><strong>{r.descripcion}</strong><br /><small>{r.marca ?? ""}</small></td>
                  <td className="precio">{Number(r.cantidad_contada)}</td>
                  <td>{Number(r.stock_teorico)}</td>
                  <td className={dif > 0 ? "baja" : dif < 0 ? "sube" : ""}>{dif === 0 ? "=" : dif > 0 ? `+${dif}` : dif}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {conteo.sin_contar.length > 0 && (
        <details>
          <summary>Del sector, sin contar todavía ({conteo.sin_contar.length})</summary>
          <ul>{conteo.sin_contar.map((p) => <li key={p.producto_id}>{p.descripcion} <small>(teórico {Number(p.stock_teorico)})</small></li>)}</ul>
        </details>
      )}

      {conteo.renglones.length > 0 && !cerrando && (
        <div className="acciones">
          <button className="grande" onClick={() => setCerrando(true)} data-testid="cerrar">Cerrar {conteo.sector}</button>
        </div>
      )}
      {cerrando && (
        <div className="tarjeta" data-testid="confirmar-cierre">
          <p>Al cerrar, cada diferencia de la tabla se aplica al stock como ajuste explicado.</p>
          {conteo.sin_contar.length > 0 && <p>Hay {conteo.sin_contar.length} productos del sector que no contaste. ¿Los damos por inexistentes (stock cero) o los dejamos como están?</p>}
          <div className="acciones">
            {conteo.sin_contar.length > 0 && <button className="grande" onClick={() => cerrar(true)}>Cerrar y poner en cero los no contados</button>}
            <button className={conteo.sin_contar.length > 0 ? "secundario" : "grande"} onClick={() => cerrar(false)} data-testid="cerrar-confirmar">{conteo.sin_contar.length > 0 ? "Cerrar y dejar los no contados como están" : "Sí, cerrar"}</button>
            <button className="enlace" onClick={() => setCerrando(false)}>Volver</button>
          </div>
        </div>
      )}
    </section>
  );
}
