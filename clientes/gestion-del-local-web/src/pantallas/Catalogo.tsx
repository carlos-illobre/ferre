import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { esMargenBoton, MARGENES, precioDeVenta } from "@ferre/calculo-de-precios";
import { AvisoError, Buscador, Hoja, Segmentos, Toast } from "../componentes/base";
import { Explicacion } from "../componentes/Explicacion";
import { FotoProducto } from "../componentes/Foto";
import { useCatalogo } from "../catalogo";
import { useDebounce } from "../debounce";
import { useTeclasGlobales } from "../teclas";
import { descargar, subirFoto } from "../api";
import { fecha, pesos } from "../formato";
import { irA } from "../rutas";
import { Listas } from "./Listas";
import { Duplicados } from "./Duplicados";
import { pesosCortos } from "./VentasDeHoy";
import type { Producto } from "./Productos";

// Catálogo: productos con margen y proveedores, listas de precios, duplicados. Tres
// sub-pantallas con un segmento arriba (rediseño en mockups/Ferre iOS.html).
const SUB = [{ valor: "productos", nombre: "Productos" }, { valor: "listas", nombre: "Listas" }, { valor: "duplicados", nombre: "Duplicados" }] as const;
type Sub = (typeof SUB)[number]["valor"];

export function Catalogo({ sub }: { sub: string | null }) {
  const actual: Sub = sub === "listas" || sub === "duplicados" ? sub : "productos";
  return (
    <main className="contenido">
      <div className="encabezado">
        <h1 className="titulo">Catálogo</h1>
        <Segmentos opciones={SUB.map((s) => ({ valor: s.valor, nombre: s.nombre }))} actual={actual} alElegir={(v) => irA(v === "productos" ? "catalogo" : `catalogo/${v}`)} />
      </div>
      {actual === "productos" ? <Productos /> : actual === "listas" ? <Listas /> : <Duplicados />}
    </main>
  );
}

const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");

// Búsqueda instantánea con carga de a 30; cada producto abre su ficha en una hoja, donde
// está el margen (botones o tipeado), los proveedores, la foto y la lista de origen.
// Teclado: flechas eligen, Enter abre, Shift+1..5 fijan el margen del elegido, Esc limpia.
export function Productos() {
  const { catalogo, error: errorCatalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const [error, setError] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const consultaEstable = useDebounce(consulta, 150);
  const [elegido, setElegido] = useState(0);
  const [limite, setLimite] = useState(30);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const centinela = useRef<HTMLDivElement>(null);

  useEffect(() => { caja.current?.focus(); }, [catalogo]);
  const resultados = useMemo(() => (consultaEstable.trim() ? buscarProductos(consultaEstable, limite) : (catalogo ?? []).slice(0, limite)), [buscarProductos, consultaEstable, limite, catalogo]);
  const hayMas = resultados.length === limite;
  useEffect(() => { setElegido(0); setLimite(30); }, [consultaEstable]);
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hayMas) return;
    const obs = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) setLimite((l) => l + 30); }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hayMas, resultados.length]);

  const actualizar = useCallback((id: string, cambios: Partial<Pick<Producto, "margen_elegido" | "foto_url">> & { proveedor_preferido_id?: string }) => {
    actualizarProducto(id, cambios as never).catch((e: Error) => setError(`No se pudo guardar: ${e.message}`));
  }, [actualizarProducto]);

  const teclas = useCallback((e: globalThis.KeyboardEvent) => {
    if (abiertoId) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && resultados[elegido]) { e.preventDefault(); setAbiertoId(resultados[elegido]!.id); }
    else if (e.key === "Escape") { setConsulta(""); caja.current?.focus(); }
    else if (e.shiftKey && /^Digit[1-5]$/.test(e.code)) {
      e.preventDefault();
      const p = resultados[elegido];
      if (p) actualizar(p.id, { margen_elegido: MARGENES[Number(e.code.slice(5)) - 1]! });
    }
  }, [resultados, elegido, actualizar, abiertoId]);
  useTeclasGlobales(teclas, caja.current);

  const abierto = abiertoId ? (catalogo ?? []).find((p) => p.id === abiertoId) ?? null : null;

  return (
    <>
      <Buscador chico valor={consulta} alCambiar={setConsulta} placeholder={catalogo ? `Buscar en ${catalogo.length.toLocaleString("es-AR")} productos` : "Bajando el catálogo…"} disabled={!catalogo} cajaRef={caja} />
      <small className="solo-escritorio">Flechas para elegir · Enter abre · Shift+1 a Shift+5 fijan el margen (300, 200, 100, 50, 25 %) · Esc limpia</small>
      <AvisoError texto={error ?? errorCatalogo} alCerrar={() => setError(null)} />
      {catalogo && catalogo.length === 0 && <div className="aviso-suave">Todavía no hay productos: cargá una lista de precios primero.</div>}
      {consultaEstable.trim() && resultados.length === 0 && catalogo && catalogo.length > 0 && <div className="aviso-suave" data-testid="sin-resultados">Nada con "{consultaEstable}". Probá con menos palabras.</div>}
      {resultados.length > 0 && (
        <div className="lista" data-testid="resultados">
          {resultados.map((p, i) => <FilaProducto key={p.id} producto={p} elegida={i === elegido} alAbrir={() => { setElegido(i); setAbiertoId(p.id); }} />)}
        </div>
      )}
      {hayMas && <div ref={centinela} className="aviso-suave" data-testid="cargar-mas">Cargando más…</div>}
      {abierto && <FichaProducto producto={abierto} alCerrar={() => setAbiertoId(null)} alCambiar={(c) => actualizar(abierto.id, c)} />}
    </>
  );
}

function FilaProducto({ producto: p, elegida, alAbrir }: { producto: Producto; elegida: boolean; alAbrir: () => void }) {
  const costo = p.costo_neto === null ? null : Number(p.costo_neto);
  const precio = costo !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: costo, margen: p.margen_elegido, iva: Number(p.iva ?? 0.21) }).valor : null;
  return (
    <button type="button" className={`fila con-foto ${elegida ? "elegida" : ""}`} onClick={alAbrir} data-testid="producto" aria-selected={elegida}>
      <span className="miniatura">{p.foto_url ? <img src={p.foto_url.startsWith("/") ? `${import.meta.env.VITE_API_URL}${p.foto_url}` : p.foto_url} alt="" /> : null}</span>
      <span className="nombre">{p.descripcion}</span>
      <span className="derecha">
        <strong className="importe">{precio === null ? "—" : pesosCortos(precio)}</strong>
        <small style={{ color: p.margen_elegido === null ? "var(--coral-texto)" : undefined, fontWeight: 600 }}>{costo === null ? "sin costo" : p.margen_elegido === null ? "sin margen" : `${p.margen_elegido} %${esMargenBoton(p.margen_elegido) ? "" : " a mano"}`}</small>
      </span>
      <span className="detalle">{detalleDe(p)}{costo !== null ? ` · costo ${pesos(costo)}` : ""}</span>
    </button>
  );
}

// Ficha del producto: precio con explicación, margen (botones u otro), proveedores con el
// más barato, foto, y la lista de origen para bajar el Excel.
export function FichaProducto({ producto: p, alCerrar, alCambiar }: { producto: Producto; alCerrar: () => void; alCambiar: (c: Partial<Pick<Producto, "margen_elegido" | "foto_url">> & { proveedor_preferido_id?: string }) => void }) {
  const costo = p.costo_neto === null ? null : Number(p.costo_neto);
  const iva = p.iva === null ? 0.21 : Number(p.iva);
  const calculado = costo !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: costo, margen: p.margen_elegido, iva }) : null;
  const manual = p.margen_elegido !== null && !esMargenBoton(p.margen_elegido) ? p.margen_elegido : null;
  const [otro, setOtro] = useState(manual === null ? "" : String(manual));
  const [mensaje, setMensaje] = useState<string | null>(null);
  useEffect(() => { setOtro(manual === null ? "" : String(manual)); }, [manual]);
  const masBarato = p.proveedores?.[0]?.proveedor_id;

  return (
    <Hoja alCerrar={alCerrar} testId="ficha-producto">
      <div className="ficha-cabeza">
        <FotoProducto id={p.id} url={p.foto_url ?? null} descripcion={p.descripcion} alSubir={async (archivo) => alCambiar({ foto_url: await subirFoto(p.id, archivo) })} />
        <div className="textos">
          <strong>{p.descripcion}</strong>
          <small>{[p.marca, p.codigo_proveedor ? `código ${p.codigo_proveedor}` : null, p.codigo_barras].filter(Boolean).join(" · ")}</small>
        </div>
      </div>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} testId="mensaje-ficha" />
      <div className="tarjeta">
        <div className="fila-precio">
          <small>Precio de venta</small>
          {calculado ? <Explicacion valor={pesosCortos(calculado.valor)} pasos={calculado.pasos} /> : <span className="importe" style={{ fontSize: 22, color: "var(--coral-texto)" }} data-testid="sin-precio">{costo === null ? "sin costo" : "elegí un margen"}</span>}
        </div>
        <div className="cuadricula-5" role="radiogroup" aria-label="margen">
          {MARGENES.map((m, i) => (
            <button key={m} type="button" className={`boton ${p.margen_elegido === m ? "activo" : ""}`} title={`Shift+${i + 1}`} disabled={costo === null} onClick={() => alCambiar({ margen_elegido: m })}>{m} %</button>
          ))}
        </div>
        <div className="fila-otro">
          <span>Otro margen{manual !== null ? ` · ${manual} % a mano` : ""}</span>
          <label className="campo"><input inputMode="numeric" placeholder="ej. 120" value={otro} disabled={costo === null} data-testid="otro-margen"
            onChange={(e) => setOtro(e.target.value.replace(/[^\d]/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") { const v = Number(otro); if (v > 0) alCambiar({ margen_elegido: v }); } }}
            onBlur={() => { const v = Number(otro); if (v > 0 && v !== p.margen_elegido) alCambiar({ margen_elegido: v }); }} /><span>%</span></label>
        </div>
      </div>
      {(p.proveedores?.length ?? 0) > 0 && (
        <>
          <div className="seccion">Proveedores · el costo sale del elegido</div>
          <div className="lista" data-testid="otros-proveedores">
            {p.proveedores!.map((v) => {
              const activo = v.proveedor === p.proveedor;
              return (
                <button key={v.proveedor_id} type="button" className="fila" onClick={() => !activo && alCambiar({ proveedor_preferido_id: v.proveedor_id })} data-testid="proveedor-de-producto">
                  <span className="nombre">{v.proveedor_id === masBarato ? "★ " : ""}{v.proveedor}</span>
                  <span className="derecha" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <strong className="importe" style={{ fontSize: 19 }}>{pesos(v.costo_neto)}</strong>
                    <span className={`radio-circulo ${activo ? "activo" : ""}`} aria-label={activo ? "en uso" : "usar"}>{activo && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>}</span>
                  </span>
                  <span className="detalle">lista del {fecha(v.fecha_lista)}{v.proveedor_id === masBarato ? " · el más barato" : ""}{activo ? " · en uso" : " · tocá para usar"}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {costo !== null && (
        <div className="acciones" style={{ flexWrap: "wrap" }}>
          <Explicacion className="boton texto" valor={`¿Cómo se calcula el costo ${pesos(costo)}?`} pasos={p.explicacion_costo.length ? p.explicacion_costo : [`Costo ${pesos(costo)} según la lista del proveedor`]} />
          {p.fecha_lista && p.lista_importada_id && (
            <button type="button" className="boton texto gris" data-testid="bajar-lista" onClick={() => descargar(`/listas/${p.lista_importada_id}/archivo`, `lista ${p.proveedor ?? ""} ${p.fecha_lista}.xlsx`).catch((err: Error) => setMensaje(`No se pudo bajar la lista: ${err.message}`))}>
              Bajar el Excel de la lista del {fecha(p.fecha_lista)}
            </button>
          )}
        </div>
      )}
      <button type="button" className="boton tinta" onClick={alCerrar}>Listo</button>
    </Hoja>
  );
}
