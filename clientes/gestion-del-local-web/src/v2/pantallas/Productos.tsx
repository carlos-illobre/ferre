import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { esMargenBoton, MARGENES, precioDeVenta } from "@ferre/calculo-de-precios";
import { useCatalogo } from "../../catalogo";
import { useDebounce } from "../../debounce";
import { useTeclasGlobales } from "../../teclas";
import { descargar, subirFoto, urlDeFoto } from "../../api";
import { fecha, pesos } from "../../formato";
import type { Producto } from "../../pantallas/Productos";
import { useEsCelular } from "../vista";
import { irA } from "../rutas";
import { Aviso, Boton, Buscador, Explicado, FotoProducto, Hoja, Icono, Margenes, Pagina, Pastilla, Progreso, Vacio, numero, pesosCortos } from "../ui";
import "../estilos/productos.css";

// Productos: búsqueda al instante sobre el catálogo guardado en el dispositivo, y el margen
// de cada uno. En la computadora todo se cambia en la fila; en el celular, cada producto
// abre su ficha. Teclado: flechas eligen, Mayúsculas + 1 a 5 fijan el margen, Enter abre la
// ficha, Esc borra la búsqueda.
type Cambios = Partial<Pick<Producto, "margen_elegido" | "foto_url">> & { proveedor_preferido_id?: string };
const PASO = 30;

function calcular(p: Producto) {
  const costo = p.costo_neto === null ? null : Number(p.costo_neto);
  const iva = p.iva === null ? 0.21 : Number(p.iva);
  const precio = costo !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: costo, margen: p.margen_elegido, iva }) : null;
  const manual = p.margen_elegido !== null && !esMargenBoton(p.margen_elegido) ? p.margen_elegido : null;
  return { costo, precio, manual, pasosCosto: costo === null ? [] : p.explicacion_costo.length ? p.explicacion_costo : [`Costo ${pesos(costo)} según la lista del proveedor`] };
}
const codigosDe = (p: Producto) => [p.marca, p.codigo_proveedor, p.codigo_barras].filter(Boolean).join(" · ");

export function Productos() {
  const { catalogo, stock, error: errorCatalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const esCelular = useEsCelular();
  const [error, setError] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const consultaEstable = useDebounce(consulta, 150);
  const [elegido, setElegido] = useState(0);
  const [limite, setLimite] = useState(PASO);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const centinela = useRef<HTMLDivElement>(null);

  useEffect(() => { caja.current?.focus(); }, [catalogo]);
  const resultados = useMemo(() => (consultaEstable.trim() ? buscarProductos(consultaEstable, limite) : (catalogo ?? []).slice(0, limite)), [buscarProductos, consultaEstable, limite, catalogo]);
  const hayMas = resultados.length === limite;
  useEffect(() => { setElegido(0); setLimite(PASO); }, [consultaEstable]);
  // Trae más resultados al llegar al final de los que están a la vista.
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hayMas) return;
    const obs = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) setLimite((l) => l + PASO); }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hayMas, resultados.length]);
  // El elegido con las flechas queda siempre a la vista.
  useEffect(() => { document.querySelector(".productos [aria-selected='true']")?.scrollIntoView({ block: "nearest" }); }, [elegido]);

  const actualizar = useCallback((id: string, cambios: Cambios) => {
    setError(null);
    actualizarProducto(id, cambios).catch((e: Error) => setError(`No se pudo guardar el cambio: ${e.message}. Probá de nuevo.`));
  }, [actualizarProducto]);

  const teclas = useCallback((e: globalThis.KeyboardEvent) => {
    if (abiertoId || document.querySelector("dialog[open]")) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && resultados[elegido] && (e.target as HTMLElement).tagName !== "BUTTON") { e.preventDefault(); setAbiertoId(resultados[elegido]!.id); }
    else if (e.key === "Escape") { setConsulta(""); caja.current?.focus(); }
    else if (e.shiftKey && /^Digit[1-5]$/.test(e.code)) {
      // Se mira e.code porque con Mayúsculas la tecla «3» reporta «#».
      e.preventDefault();
      const p = resultados[elegido];
      if (p && p.costo_neto !== null) actualizar(p.id, { margen_elegido: MARGENES[Number(e.code.slice(5)) - 1]! });
    }
  }, [resultados, elegido, actualizar, abiertoId]);
  useTeclasGlobales(teclas, caja.current);

  const abierto = abiertoId ? (catalogo ?? []).find((p) => p.id === abiertoId) ?? null : null;
  const sinMargen = useMemo(() => (catalogo ?? []).filter((p) => p.margen_elegido === null && p.costo_neto !== null).length, [catalogo]);

  return (
    <Pagina titulo="Productos" testId="productos" className="productos"
      acciones={catalogo && catalogo.length > 0 ? (
        <div className="fila envuelve">
          <Pastilla sinPunto>{numero(catalogo.length)} productos</Pastilla>
          {sinMargen > 0 && <Pastilla tipo="alerta">{numero(sinMargen)} sin margen</Pastilla>}
        </div>
      ) : undefined}>
      <Buscador valor={consulta} alCambiar={setConsulta} cajaRef={caja} disabled={!catalogo} autoFoco
        placeholder={!catalogo ? "Bajando el catálogo…" : esCelular ? "Buscar por nombre o código" : "Escribí el nombre del producto, el código o el código de barras"} etiqueta="Buscar productos" />
      {!esCelular && (
        <p className="vender-teclas detalle">
          <span><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd> eligen</span>
          <span><kbd className="tecla">Mayús</kbd> + <kbd className="tecla">1</kbd> a <kbd className="tecla">5</kbd> fijan el margen del elegido (300, 200, 100, 50, 25 %)</span>
          <span><kbd className="tecla">Enter</kbd> abre la ficha</span><span><kbd className="tecla">Esc</kbd> borra la búsqueda</span>
        </p>
      )}
      {!catalogo && !errorCatalogo && <Progreso texto="Bajando el catálogo por primera vez. Después se busca al instante, también sin internet." />}
      <Aviso tipo="error">{error ?? errorCatalogo}</Aviso>

      {catalogo && catalogo.length === 0 && (
        <Vacio icono="productos" titulo="Todavía no hay productos" accion={<Boton variante="principal" icono="listas" onClick={() => irA("listas")}>Cargar una lista de precios</Boton>}>
          Los productos entran solos al cargar la lista de precios de un proveedor.
        </Vacio>
      )}
      {consultaEstable.trim() && resultados.length === 0 && catalogo && catalogo.length > 0 && (
        <div data-testid="sin-resultados"><Vacio icono="buscar" titulo={`Nada con «${consultaEstable}»`}>Probá con menos palabras, o con el código del proveedor.</Vacio></div>
      )}

      {resultados.length > 0 && (esCelular ? (
        <ul className="lista" data-testid="resultados">
          {resultados.map((p, i) => {
            const { costo, precio } = calcular(p);
            return (
              <li key={p.id}>
                <button type="button" className="renglon con-foto" aria-selected={i === elegido} onClick={() => { setElegido(i); setAbiertoId(p.id); }} data-testid="producto">
                  <span className="miniatura">{p.foto_url ? <img src={urlDeFoto(p.foto_url) ?? ""} alt="" loading="lazy" /> : <Icono nombre="productos" tam={18} grosor={1.6} />}</span>
                  <span className="nombre">{p.descripcion}</span>
                  <span className={precio ? "importe" : "falta-texto"}>{precio ? pesosCortos(precio.valor) : costo === null ? "sin costo" : "sin margen"}</span>
                  <span className="detalle">{[p.marca, p.proveedor, p.margen_elegido !== null ? `margen ${p.margen_elegido} %` : null].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="tabla-marco">
          <table className="tabla productos-tabla" data-testid="resultados">
            <thead><tr><th className="angosta"><span className="solo-lectores">Foto</span></th><th>Producto</th><th>Proveedor</th><th className="num">Stock</th><th className="num">Costo</th><th>Margen</th><th className="num">Precio de venta</th></tr></thead>
            <tbody>
              {resultados.map((p, i) => <FilaProducto key={p.id} producto={p} stock={stock.get(p.id)} elegido={i === elegido} alElegir={() => setElegido(i)} alCambiar={(c) => actualizar(p.id, c)} alError={setError} />)}
            </tbody>
          </table>
        </div>
      ))}
      {hayMas && <div ref={centinela} className="detalle productos-mas" data-testid="cargar-mas">Trayendo más productos…</div>}

      {abierto && <FichaProducto producto={abierto} stock={stock.get(abierto.id)} alCerrar={() => setAbiertoId(null)} alCambiar={(c) => actualizar(abierto.id, c)} />}
    </Pagina>
  );
}

// «Otro margen»: un porcentaje que no es ninguno de los cinco botones. Enter o salir del campo lo guarda.
function OtroMargen({ producto: p, manual, alCambiar, id }: { producto: Producto; manual: number | null; alCambiar: (c: Cambios) => void; id?: string }) {
  const [texto, setTexto] = useState(manual === null ? "" : String(manual));
  useEffect(() => { setTexto(manual === null ? "" : String(manual)); }, [manual]);
  const guardar = () => { const v = Math.round(Number(texto)); if (v > 0 && v !== p.margen_elegido) alCambiar({ margen_elegido: v }); else if (!texto) setTexto(manual === null ? "" : String(manual)); };
  return (
    <label className={`con-prefijo productos-otro ${manual !== null ? "activo" : ""}`} title="Un porcentaje de margen distinto de los cinco botones" onClick={(e) => e.stopPropagation()}>
      <input id={id} inputMode="numeric" placeholder="otro" aria-label={`Otro margen para ${p.descripcion}, en porcentaje`} value={texto} disabled={p.costo_neto === null} data-testid="otro-margen"
        onChange={(e) => setTexto(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); guardar(); } else if (e.key === "Escape") { e.stopPropagation(); setTexto(manual === null ? "" : String(manual)); (e.target as HTMLInputElement).blur(); } }}
        onBlur={guardar} />
      <span aria-hidden="true">%</span>
    </label>
  );
}

function BajarLista({ producto: p, alError }: { producto: Producto; alError: (m: string) => void }) {
  if (!p.fecha_lista) return null;
  if (!p.lista_importada_id) return <span className="detalle">lista del {fecha(p.fecha_lista)}</span>;
  return (
    <Boton tam="chico" icono="bajar" title="Bajar el Excel original del proveedor" data-testid="bajar-lista"
      onClick={(e) => { e.stopPropagation(); descargar(`/listas/${p.lista_importada_id}/archivo`, `lista ${p.proveedor ?? ""} ${p.fecha_lista}.xlsx`).catch((err: Error) => alError(`No se pudo bajar la lista: ${err.message}.`)); }}>
      Lista del {fecha(p.fecha_lista)}
    </Boton>
  );
}

function FilaProducto({ producto: p, stock, elegido, alElegir, alCambiar, alError }: { producto: Producto; stock: number | undefined; elegido: boolean; alElegir: () => void; alCambiar: (c: Cambios) => void; alError: (m: string) => void }) {
  const { costo, precio, manual, pasosCosto } = calcular(p);
  const varios = (p.proveedores?.length ?? 0) > 1;
  return (
    <tr className="elegible" aria-selected={elegido} onClick={alElegir} data-testid="producto">
      <td className="angosta"><FotoProducto id={p.id} url={p.foto_url ?? null} descripcion={p.descripcion} alSubir={async (archivo) => alCambiar({ foto_url: await subirFoto(p.id, archivo) })} /></td>
      <td>
        <span className="nombre">{p.descripcion}</span>
        <div className="detalle">{codigosDe(p)}</div>
      </td>
      <td>
        <div className="productos-proveedor">
          <span>{p.proveedor ?? <span className="detalle">sin proveedor</span>}</span>
          <BajarLista producto={p} alError={alError} />
        </div>
        {varios && (
          <ul className="productos-otros" data-testid="otros-proveedores">
            {p.proveedores!.map((v, i) => {
              const actual = v.proveedor === p.proveedor;
              return (
                <li key={v.proveedor_id}>
                  <span>{v.proveedor} <strong>{pesos(v.costo_neto)}</strong></span>
                  {i === 0 && <Pastilla tipo="ok" sinPunto>el más barato</Pastilla>}
                  {actual ? <span className="detalle">en uso</span> : <Boton tam="chico" aria-label={`Usar el costo de ${v.proveedor}`} onClick={(e) => { e.stopPropagation(); alCambiar({ proveedor_preferido_id: v.proveedor_id }); }}>Usar</Boton>}
                </li>
              );
            })}
          </ul>
        )}
      </td>
      <td className="num">{stock === undefined ? <span className="detalle">sin contar</span> : <span className={stock <= 0 ? "sube" : ""}>{numero(stock)}</span>}</td>
      <td className="num">{costo === null ? <span className="detalle">sin costo</span> : <Explicado valor={pesos(costo)} pasos={pasosCosto} etiqueta={`Costo ${pesos(costo)}`} />}</td>
      <td>
        <div className="productos-margen">
          <Margenes compacto elegido={p.margen_elegido} disabled={costo === null} atajos={elegido} etiqueta={`Margen de ${p.descripcion}`} alElegir={(m) => { alElegir(); alCambiar({ margen_elegido: m }); }} />
          <OtroMargen producto={p} manual={manual} alCambiar={alCambiar} />
        </div>
      </td>
      <td className="num">
        {precio ? <Explicado className="importe" valor={pesosCortos(precio.valor)} pasos={precio.pasos} etiqueta={`Precio de venta ${pesosCortos(precio.valor)}`} />
          : <span className="falta-texto" data-testid="sin-precio">{costo === null ? "sin costo" : "elegí un margen"}</span>}
      </td>
    </tr>
  );
}

// Ficha del producto: precio con su explicación, margen, proveedores con el más barato,
// foto y la lista de la que salió el costo.
function FichaProducto({ producto: p, stock, alCerrar, alCambiar }: { producto: Producto; stock: number | undefined; alCerrar: () => void; alCambiar: (c: Cambios) => void }) {
  const { costo, precio, manual, pasosCosto } = calcular(p);
  const [error, setError] = useState<string | null>(null);
  const masBarato = p.proveedores?.[0]?.proveedor_id;
  return (
    <Hoja titulo={p.descripcion} alCerrar={alCerrar} testId="ficha-producto" pie={<Boton variante="marino" onClick={alCerrar}>Listo</Boton>}>
      <div className="fila">
        <FotoProducto id={p.id} url={p.foto_url ?? null} descripcion={p.descripcion} alSubir={async (archivo) => alCambiar({ foto_url: await subirFoto(p.id, archivo) })} />
        <div className="crece pila junta">
          <span className="detalle">{codigosDe(p) || "Sin marca ni código"}</span>
          <span className="detalle">{stock === undefined ? "Stock sin contar" : `Stock ${numero(stock)}`}</span>
        </div>
      </div>
      <Aviso tipo="error">{error}</Aviso>

      <section className="tarjeta relleno pila" aria-label="Precio y margen">
        <div className="fila">
          <span className="rotulo crece">Precio de venta</span>
          {precio ? <Explicado className="importe productos-precio" valor={pesosCortos(precio.valor)} pasos={precio.pasos} etiqueta={`Precio de venta ${pesosCortos(precio.valor)}`} />
            : <span className="falta-texto" data-testid="sin-precio">{costo === null ? "sin costo" : "elegí un margen"}</span>}
        </div>
        <Margenes elegido={p.margen_elegido} disabled={costo === null} etiqueta="Margen" alElegir={(m) => alCambiar({ margen_elegido: m })} />
        <div className="fila">
          <label className="crece detalle" htmlFor="ficha-otro-margen">Otro margen{manual !== null ? `: hoy ${manual} % a mano` : ""}</label>
          <OtroMargen producto={p} manual={manual} alCambiar={alCambiar} id="ficha-otro-margen" />
        </div>
        {costo !== null && <div className="fila"><span className="rotulo crece">Costo</span><Explicado valor={pesos(costo)} pasos={pasosCosto} etiqueta={`Costo ${pesos(costo)}`} /></div>}
      </section>

      {(p.proveedores?.length ?? 0) > 0 && (
        <section className="pila" aria-labelledby="ficha-proveedores">
          <h3 id="ficha-proveedores" className="seccion-titulo">Quién lo vende</h3>
          <ul className="lista" data-testid="otros-proveedores">
            {p.proveedores!.map((v) => {
              const actual = v.proveedor === p.proveedor;
              return (
                <li key={v.proveedor_id}>
                  <button type="button" className={`renglon ${actual ? "elegido" : ""}`} aria-pressed={actual} onClick={() => !actual && alCambiar({ proveedor_preferido_id: v.proveedor_id })} data-testid="proveedor-de-producto">
                    <span className="nombre">{v.proveedor}</span>
                    <span className="importe chico">{pesos(v.costo_neto)}</span>
                    <span className="detalle fila envuelve">lista del {fecha(v.fecha_lista)}{v.proveedor_id === masBarato && <Pastilla tipo="ok" sinPunto>el más barato</Pastilla>}{actual ? <Pastilla tipo="azul" sinPunto>en uso</Pastilla> : "tocá para usar su costo"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {p.proveedor && (p.proveedores?.length ?? 0) === 0 && <p className="detalle">Proveedor: {p.proveedor}</p>}
      <div className="fila envuelve"><BajarLista producto={p} alError={setError} /></div>
    </Hoja>
  );
}
