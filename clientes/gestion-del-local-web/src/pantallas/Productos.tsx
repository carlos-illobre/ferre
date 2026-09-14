import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { esMargenBoton, MARGENES, precioDeVenta } from "@ferre/calculo-de-precios";
import { useCatalogo } from "../catalogo";
import { useDebounce } from "../debounce";
import { useTeclasGlobales } from "../teclas";
import { FotoProducto } from "../componentes/Foto";
import { Explicacion } from "../componentes/Explicacion";
import { fecha, pesos } from "../formato";
import { descargar, subirFoto } from "../api";

export type Producto = {
  id: string; descripcion: string; marca: string | null; codigo_barras: string | null; unidad: string;
  margen_elegido: number | null;
  proveedor: string | null; codigo_proveedor: string | null;
  costo_neto: string | null; iva: string | null; fecha_lista: string | null; lista_importada_id?: string | null; explicacion_costo: string[];
  sector_id?: string | null;
  foto_url?: string | null;
  proveedores?: { proveedor_id: string; proveedor: string; costo_neto: string; fecha_lista: string; codigo_proveedor: string }[];
};

// Búsqueda instantánea y selector de margen (issues #13 y #14). El catálogo se baja
// entero y se busca en memoria: respuesta al instante y base del modo sin conexión (#18).
// Teclado: escribir busca; flechas eligen; 1 a 5 fijan el margen del elegido; Esc limpia.
export function Productos() {
  const { catalogo, error: errorCatalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const [error, setError] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const consultaEstable = useDebounce(consulta, 150);
  const [elegido, setElegido] = useState(0);
  // Carga progresiva: de a 30 resultados, y más a medida que se llega al final de la lista.
  const [limite, setLimite] = useState(30);
  const caja = useRef<HTMLInputElement>(null);
  const centinela = useRef<HTMLDivElement>(null);

  useEffect(() => { caja.current?.focus(); }, [catalogo]);
  const resultados = useMemo(() => buscarProductos(consultaEstable, limite), [buscarProductos, consultaEstable, limite]);
  const hayMas = resultados.length === limite;
  useEffect(() => { setElegido(0); setLimite(30); }, [consultaEstable]);
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hayMas) return;
    const obs = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) setLimite((l) => l + 30); }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hayMas, resultados.length]);

  const actualizar = useCallback((id: string, cambios: Partial<Pick<Producto, "margen_elegido" | "foto_url">>) => {
    actualizarProducto(id, cambios).catch((e: Error) => setError(`No se pudo guardar: ${e.message}`));
  }, [actualizarProducto]);

  // Los atajos valen con o sin foco en la búsqueda (salvo dentro de otro campo).
  const teclas = useCallback((e: globalThis.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Escape") { setConsulta(""); caja.current?.focus(); }
    else if (e.shiftKey && /^Digit[1-5]$/.test(e.code)) {
      // Shift+1..5 elige el margen del resultado marcado sin ensuciar la búsqueda (el 1..5
      // solo escribe). Se mira e.code porque con Shift la tecla "3" reporta "#".
      e.preventDefault();
      const p = resultados[elegido];
      if (p) actualizar(p.id, { margen_elegido: MARGENES[Number(e.code.slice(5)) - 1]! });
    }
  }, [resultados, elegido, actualizar]);
  useTeclasGlobales(teclas, caja.current);

  return (
    <section className="productos">
      <input
        ref={caja}
        className="busqueda"
        type="search"
        placeholder={catalogo ? "Escribí el nombre del producto, el código o escaneá el código de barras" : "Bajando el catálogo…"}
        value={consulta}
        onChange={(e) => setConsulta(e.target.value)}
        disabled={!catalogo}
        data-testid="busqueda"
        autoComplete="off"
      />
      <p className="ayuda solo-escritorio">
        {catalogo ? `${catalogo.length.toLocaleString("es-AR")} productos. ` : ""}
        Flechas para elegir · Shift+1 a Shift+5 para el margen (300, 200, 100, 50, 25 %) · Esc para limpiar
      </p>
      {(error ?? errorCatalogo) && <p className="error" role="alert">{error ?? errorCatalogo}</p>}
      {catalogo && catalogo.length === 0 && <p>Todavía no hay productos: cargá una lista de precios primero.</p>}
      {consultaEstable.trim() && resultados.length === 0 && catalogo && catalogo.length > 0 && <p data-testid="sin-resultados">Nada con "{consultaEstable}". Probá con menos palabras.</p>}
      <div className="tabla-scroll">
        <table className="resultados" data-testid="resultados">
          {resultados.length > 0 && (
            <thead><tr><th /><th>Producto</th><th>Proveedor</th><th>Costo</th><th>Margen</th><th>Precio de venta</th></tr></thead>
          )}
          <tbody>
            {resultados.map((p, i) => (
              <FilaProducto key={p.id} producto={p} elegido={i === elegido} alElegir={() => setElegido(i)} alCambiar={(c) => actualizar(p.id, c)} />
            ))}
          </tbody>
        </table>
        {hayMas && <div ref={centinela} className="centinela" data-testid="cargar-mas">Cargando más…</div>}
      </div>
    </section>
  );
}

function FilaProducto({ producto: p, elegido, alElegir, alCambiar }: { producto: Producto; elegido: boolean; alElegir: () => void; alCambiar: (c: Partial<Pick<Producto, "margen_elegido" | "foto_url">>) => void }) {
  const costo = p.costo_neto === null ? null : Number(p.costo_neto);
  const iva = p.iva === null ? 0.21 : Number(p.iva);
  // Margen a mano: cualquier porcentaje que no sea uno de los botones.
  const manual = p.margen_elegido !== null && !esMargenBoton(p.margen_elegido) ? p.margen_elegido : null;
  const calculado = costo !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: costo, margen: p.margen_elegido, iva }) : null;
  const [editandoManual, setEditandoManual] = useState(false);

  return (
    <tr className={elegido ? "elegido" : ""} onClick={alElegir} data-testid="producto" aria-selected={elegido}>
      <td className="celda-foto"><FotoProducto id={p.id} url={p.foto_url ?? null} descripcion={p.descripcion} alSubir={async (archivo) => alCambiar({ foto_url: await subirFoto(p.id, archivo) })} /></td>
      <td>
        <strong>{p.descripcion}</strong>
        <br /><small>{[p.marca, p.codigo_proveedor, p.codigo_barras].filter(Boolean).join(" · ")}</small>
      </td>
      <td>
        {p.proveedor ?? <em>sin proveedor</em>}<br />
        {p.fecha_lista && (p.lista_importada_id ? (
          <button className="enlace chico" title="Bajar el Excel original del proveedor" data-testid="bajar-lista"
            onClick={(e) => { e.stopPropagation(); descargar(`/listas/${p.lista_importada_id}/archivo`, `lista ${p.proveedor ?? ""} ${p.fecha_lista}.xlsx`).catch((err: Error) => alert(`No se pudo bajar la lista: ${err.message}`)); }}>
            lista del {fecha(p.fecha_lista)} ⤓
          </button>
        ) : <small>lista del {fecha(p.fecha_lista)}</small>)}
        {(p.proveedores?.length ?? 0) > 1 && (
          <ul className="otros-proveedores" data-testid="otros-proveedores">
            {p.proveedores!.map((v, i) => (
              <li key={v.proveedor_id} className={v.proveedor === p.proveedor ? "actual" : ""}>
                {i === 0 ? "★ " : ""}{v.proveedor} {pesos(v.costo_neto)}{v.proveedor !== p.proveedor && <button className="enlace chico" onClick={(e) => { e.stopPropagation(); alCambiar({ proveedor_preferido_id: v.proveedor_id } as never); }}>usar</button>}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td>{costo === null ? <em>sin costo</em> : <Explicacion valor={pesos(costo)} pasos={p.explicacion_costo.length ? p.explicacion_costo : [`Costo ${pesos(costo)} según la lista del proveedor`]} />}</td>
      <td>
        <div className="margenes" role="radiogroup" aria-label="margen">
          {MARGENES.map((m, i) => (
            <button
              key={m}
              className={`margen ${p.margen_elegido === m ? "activo" : ""}`}
              title={`Shift+${i + 1}`}
              onClick={(e) => { e.stopPropagation(); alElegir(); alCambiar({ margen_elegido: m }); }}
              disabled={costo === null}
            >
              {m} %
            </button>
          ))}
        </div>
      </td>
      <td className="precio">
        {calculado ? (
          <>
            <Explicacion valor={pesos(calculado.valor)} pasos={calculado.pasos} />
            {manual !== null && <> <small className="manual">margen a mano · {manual} %</small></>}
          </>
        ) : (
          <em className="sin-precio">sin precio: elegí un margen</em>
        )}
        {editandoManual ? (
          <span className="margen-a-mano" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              min="1"
              max="10000"
              step="1"
              autoFocus
              className="precio-manual"
              placeholder="20"
              defaultValue={manual ?? ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") { const v = Math.round(Number((e.target as HTMLInputElement).value)); if (v > 0) alCambiar({ margen_elegido: v }); setEditandoManual(false); }
                if (e.key === "Escape") setEditandoManual(false);
              }}
              onBlur={() => setEditandoManual(false)}
            /> % de margen
          </span>
        ) : (
          <button className="enlace chico" onClick={(e) => { e.stopPropagation(); alElegir(); setEditandoManual(true); }} disabled={costo === null} title="Un porcentaje de margen distinto de los botones">
            {manual !== null ? "cambiar" : "otro margen"}
          </button>
        )}
      </td>
    </tr>
  );
}
