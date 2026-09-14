import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { margenReal, MARGENES, precioDeVenta, type Margen } from "@ferre/calculo-de-precios";
import { useCatalogo } from "../catalogo";
import { Explicacion } from "../componentes/Explicacion";
import { fecha, pesos } from "../formato";

export type Producto = {
  id: string; descripcion: string; marca: string | null; codigo_barras: string | null; unidad: string;
  margen_elegido: Margen | null; precio_manual: string | null;
  proveedor: string | null; codigo_proveedor: string | null;
  costo_neto: string | null; iva: string | null; fecha_lista: string | null; explicacion_costo: string[];
  sector_id?: string | null;
};

// Búsqueda instantánea y selector de margen (issues #13 y #14). El catálogo se baja
// entero y se busca en memoria: respuesta al instante y base del modo sin conexión (#18).
// Teclado: escribir busca; flechas eligen; 1 a 5 fijan el margen del elegido; Esc limpia.
export function Productos() {
  const { catalogo, error: errorCatalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const [error, setError] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const caja = useRef<HTMLInputElement>(null);

  useEffect(() => { caja.current?.focus(); }, [catalogo]);
  const resultados = useMemo(() => buscarProductos(consulta, 50), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);

  const actualizar = useCallback((id: string, cambios: Partial<Pick<Producto, "margen_elegido" | "precio_manual">>) => {
    actualizarProducto(id, cambios).catch((e: Error) => setError(`No se pudo guardar: ${e.message}`));
  }, [actualizarProducto]);

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Escape") { setConsulta(""); }
    else if (e.shiftKey && /^Digit[1-5]$/.test(e.code)) {
      // Shift+1..5 elige el margen del resultado marcado sin ensuciar la búsqueda (el 1..5
      // solo escribe). Se mira e.code porque con Shift la tecla "3" reporta "#".
      e.preventDefault();
      const p = resultados[elegido];
      if (p) actualizar(p.id, { margen_elegido: MARGENES[Number(e.key === "#" ? 3 : e.code.slice(5)) - 1]!, precio_manual: null });
    }
  }

  return (
    <section className="productos">
      <input
        ref={caja}
        className="busqueda"
        type="search"
        placeholder={catalogo ? "Escribí el nombre del producto, el código o escaneá el código de barras" : "Bajando el catálogo…"}
        value={consulta}
        onChange={(e) => setConsulta(e.target.value)}
        onKeyDown={teclas}
        disabled={!catalogo}
        data-testid="busqueda"
        autoComplete="off"
      />
      <p className="ayuda">
        {catalogo ? `${catalogo.length.toLocaleString("es-AR")} productos. ` : ""}
        Flechas para elegir · Shift+1 a Shift+5 para el margen (300, 200, 100, 50, 25 %) · Esc para limpiar
      </p>
      {(error ?? errorCatalogo) && <p className="error" role="alert">{error ?? errorCatalogo}</p>}
      {catalogo && catalogo.length === 0 && <p>Todavía no hay productos: cargá una lista de precios primero.</p>}
      {consulta.trim() && resultados.length === 0 && catalogo && catalogo.length > 0 && <p data-testid="sin-resultados">Nada con "{consulta}". Probá con menos palabras.</p>}
      <div className="tabla-scroll">
        <table className="resultados" data-testid="resultados">
          {resultados.length > 0 && (
            <thead><tr><th>Producto</th><th>Proveedor</th><th>Costo</th><th>Margen</th><th>Precio de venta</th></tr></thead>
          )}
          <tbody>
            {resultados.map((p, i) => (
              <FilaProducto key={p.id} producto={p} elegido={i === elegido} alElegir={() => setElegido(i)} alCambiar={(c) => actualizar(p.id, c)} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FilaProducto({ producto: p, elegido, alElegir, alCambiar }: { producto: Producto; elegido: boolean; alElegir: () => void; alCambiar: (c: Partial<Pick<Producto, "margen_elegido" | "precio_manual">>) => void }) {
  const costo = p.costo_neto === null ? null : Number(p.costo_neto);
  const iva = p.iva === null ? 0.21 : Number(p.iva);
  const manual = p.precio_manual === null ? null : Number(p.precio_manual);
  const calculado = costo !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: costo, margen: p.margen_elegido, iva }) : null;
  const real = costo !== null && manual !== null ? margenReal({ costoNeto: costo, iva, precio: manual }) : null;
  const [editandoManual, setEditandoManual] = useState(false);

  return (
    <tr className={elegido ? "elegido" : ""} onClick={alElegir} data-testid="producto" aria-selected={elegido}>
      <td>
        <strong>{p.descripcion}</strong>
        <br /><small>{[p.marca, p.codigo_proveedor, p.codigo_barras].filter(Boolean).join(" · ")}</small>
      </td>
      <td>{p.proveedor ?? <em>sin proveedor</em>}<br /><small>{p.fecha_lista ? `lista del ${fecha(p.fecha_lista)}` : ""}</small></td>
      <td>{costo === null ? <em>sin costo</em> : <Explicacion valor={pesos(costo)} pasos={p.explicacion_costo.length ? p.explicacion_costo : [`Costo ${pesos(costo)} según la lista del proveedor`]} />}</td>
      <td>
        <div className="margenes" role="radiogroup" aria-label="margen">
          {MARGENES.map((m, i) => (
            <button
              key={m}
              className={`margen ${p.margen_elegido === m && manual === null ? "activo" : ""}`}
              title={`Shift+${i + 1}`}
              onClick={(e) => { e.stopPropagation(); alElegir(); alCambiar({ margen_elegido: m, precio_manual: null }); }}
              disabled={costo === null}
            >
              {m} %
            </button>
          ))}
        </div>
      </td>
      <td className="precio">
        {manual !== null && real ? (
          <>
            <Explicacion valor={pesos(manual)} pasos={real.pasos} /> <small className="manual">a mano · {real.valor} %</small>
          </>
        ) : calculado ? (
          <Explicacion valor={pesos(calculado.valor)} pasos={calculado.pasos} />
        ) : (
          <em className="sin-precio">sin precio: elegí un margen</em>
        )}
        {editandoManual ? (
          <input
            type="number"
            min="0"
            step="10"
            autoFocus
            className="precio-manual"
            defaultValue={manual ?? calculado?.valor ?? ""}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") { const v = Number((e.target as HTMLInputElement).value); if (v > 0) alCambiar({ precio_manual: String(v) }); setEditandoManual(false); }
              if (e.key === "Escape") setEditandoManual(false);
            }}
            onBlur={() => setEditandoManual(false)}
          />
        ) : (
          <button className="enlace chico" onClick={(e) => { e.stopPropagation(); alElegir(); setEditandoManual(true); }} disabled={costo === null}>
            {manual !== null ? "cambiar" : "a mano"}
          </button>
        )}
        {manual !== null && <button className="enlace chico" onClick={(e) => { e.stopPropagation(); alCambiar({ precio_manual: null }); }}>volver al margen</button>}
      </td>
    </tr>
  );
}
