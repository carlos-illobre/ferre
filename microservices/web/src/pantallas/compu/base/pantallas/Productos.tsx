import { useCallback, useEffect, useRef, useState } from "react";
import { SiVeCostos, useVeCostos } from "../../../Costos";
import { escucharPuesto, EVENTO_EMPAREJAMIENTO, puestoLocal } from "../../../../puesto";
import { usePuede } from "../../../permisos";
import { MARGENES } from "../../../../negocio/precios/vista-previa";
import { esperarBusqueda, quienTieneElCodigo, traerPorCodigo, useCatalogo, useListaDeProductos, useMarcas } from "../../../../catalogo";
import { useDebounce } from "../../../../plataforma/tiempo/debounce";
import { useTeclasGlobales } from "../../../../plataforma/teclado/teclas";
import { api, descargar, subirFoto, urlDeFoto } from "../../../../api";
import { fecha, pesos } from "../../../../formato";
import type { Producto } from "../../../celular/pantallas/Productos";
import { useEsCelular } from "../vista";
import { irA } from "../rutas";
import { Aviso, Boton, Buscador, Explicado, FotoProducto, Icono, Margenes, Pagina, Pastilla, Progreso, Vacio, numero, pesosCortos } from "../ui";
import { FichaProducto } from "./FichaProducto";
import "../estilos/productos.css";
import { margenAMano, otroMargen, precioDelProducto } from "../../../../negocio/catalogo/precio";
import { cuantosFiltros, SIN_FILTROS, stockDe, type Disponibilidad, type Filtros } from "../../../../negocio/catalogo/stock-y-filtros";
import type { ResumenDelCatalogo } from "@servidor/productos";
import { agregarALaVenta } from "../../../../negocio/ventas/venta-en-curso";
import { cuantosProductos, TEXTOS } from "../../../textos";

// Productos: la búsqueda le pregunta al servidor y trae de a 50 (specs/018), y el margen
// de cada uno. En la computadora todo se cambia en la fila; en el celular, cada producto
// abre su ficha. Teclado: flechas eligen, Mayúsculas + 1 a 5 fijan el margen, Enter abre la
// ficha, Esc borra la búsqueda.
type Cambios = Partial<Pick<Producto, "margen_elegido" | "foto_url" | "codigo_barras">> & { proveedor_preferido_id?: string };

function calcular(p: Producto) {
  const { costo, calculo: precio } = precioDelProducto(p);
  const manual = margenAMano(p);
  return { costo, precio, manual, pasosCosto: costo === null ? [] : p.explicacion_costo.length ? p.explicacion_costo : [`Costo ${pesos(costo)} según la lista del proveedor`] };
}
const codigosDe = (p: Producto) => [p.marca, p.codigo_proveedor, p.codigo_barras].filter(Boolean).join(" · ");

export function Productos() {
  const fijaMargen = usePuede()("catalogo.margenes");
  const { catalogo, stock, actualizarProducto } = useCatalogo();
  // Agregar a la venta desde acá (RF-108), con el botón o la tecla «+»: solo quien puede vender.
  const puedeVender = usePuede()("ventas.registrar");
  const [agregado, setAgregado] = useState<string | null>(null);
  // Filtros por disponibilidad y marca (RF-109): de esta pantalla, no se guardan.
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [viendoFiltros, setViendoFiltros] = useState(false);
  const conFiltros = cuantosFiltros(filtros) > 0;
  const agregar = useCallback((p: Producto) => { agregarALaVenta(p); setAgregado(`${TEXTOS.catalogo.agregado.largo}: ${p.descripcion}`); }, []);
  useEffect(() => { if (!agregado) return; const t = setTimeout(() => setAgregado(null), 3000); return () => clearTimeout(t); }, [agregado]);
  const esCelular = useEsCelular();
  const [error, setError] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const consultaEstable = useDebounce(consulta, 300);
  const [elegido, setElegido] = useState(0);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const centinela = useRef<HTMLDivElement>(null);

  // Buscar escaneando (RF-08): lo que lee el celular vinculado abre la ficha de ese producto o,
  // si nadie tiene ese código, queda escrito en la búsqueda. Con una ficha abierta no escucha:
  // ahí el código es para ese producto.
  const alEscanear = useRef<(codigo: string) => void>(() => undefined);
  useEffect(() => {
    alEscanear.current = (codigo) => {
      void traerPorCodigo(codigo).then((p) => { if (p) { setConsulta(""); setAbiertoId(p.id); } else setConsulta(codigo); }).catch((e: Error) => setError(e.message));
    };
  }, []);
  const [emparejado, setEmparejado] = useState(() => puestoLocal()?.id ?? null);
  useEffect(() => { const mirar = () => setEmparejado(puestoLocal()?.id ?? null); window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar); return () => window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar); }, []);
  useEffect(() => {
    if (!emparejado || abiertoId) return;
    return escucharPuesto(emparejado, (codigo) => alEscanear.current(codigo), undefined, true);
  }, [abiertoId, emparejado]);
  // Lo encontrado llega del servidor de a 50, ya filtrado; al llegar al final, los siguientes
  // (specs/018). Las marcas para elegir son las de lo encontrado (015-E29).
  const lista = useListaDeProductos({ buscar: consultaEstable, marca: filtros.marca, disponibilidad: filtros.disponibilidad });
  const resultados = lista.productos;
  const marcas = useMarcas(consultaEstable, viendoFiltros);
  const { hayMas, cargarMas } = lista;
  useEffect(() => { setElegido(0); }, [consultaEstable, filtros]);
  // Trae más resultados al llegar al final de los que están a la vista.
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hayMas) return;
    const obs = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) cargarMas(); }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hayMas, cargarMas, resultados.length]);
  // Cuántos productos hay y cuántos sin margen: los cuenta el servidor.
  const [resumen, setResumen] = useState<ResumenDelCatalogo | null>(null);
  useEffect(() => { api<ResumenDelCatalogo>("/productos/resumen").then(setResumen).catch(() => undefined); }, []);
  // El elegido con las flechas queda siempre a la vista.
  useEffect(() => { document.querySelector(".productos [aria-selected='true']")?.scrollIntoView?.({ block: "nearest" }); }, [elegido]);

  const actualizar = useCallback((id: string, cambios: Cambios) => {
    setError(null);
    actualizarProducto(id, cambios).catch((e: Error) => setError(`No se pudo guardar el cambio: ${e.message}. Probá de nuevo.`));
  }, [actualizarProducto]);

  const teclas = useCallback((e: globalThis.KeyboardEvent) => {
    if (abiertoId || viendoFiltros || document.querySelector("dialog[open]")) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      // Arriba de la primera fila están las pestañas: la marca de las flechas vuelve a ellas (decisión 82).
      if (elegido === 0) document.querySelector<HTMLElement>(".cuerpo .pestanas button[aria-current='page']")?.focus();
      else setElegido((i) => Math.max(i - 1, 0));
    }
    else if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
      // Si la lista todavía no alcanzó a lo que se escribió (llega un instante después de tipear),
      // Enter espera la respuesta y abre el primero: no abre la fila de la lista vieja.
      e.preventDefault();
      if (consulta === consultaEstable && !lista.cargando) { const p = resultados[elegido]; if (p) setAbiertoId(p.id); }
      else if (consulta.trim()) void esperarBusqueda(consulta).then((r) => { if (r[0]) setAbiertoId(r[0].id); });
    }
    else if (e.key === "Escape") { setConsulta(""); caja.current?.focus(); }
    // «+» agrega el elegido a la venta (015-E27); sin permiso de vender, no hace nada.
    else if (e.key === "+" && !e.ctrlKey && !e.metaKey && !e.altKey && puedeVender && resultados[elegido]) { e.preventDefault(); agregar(resultados[elegido]!); }
    else if (fijaMargen && e.shiftKey && /^Digit[1-5]$/.test(e.code)) {
      // Se mira e.code porque con Mayúsculas la tecla «3» reporta «#».
      e.preventDefault();
      const p = resultados[elegido];
      if (p && p.costo_neto !== null) actualizar(p.id, { margen_elegido: MARGENES[Number(e.code.slice(5)) - 1]! });
    }
  }, [resultados, elegido, actualizar, abiertoId, consulta, consultaEstable, lista.cargando, viendoFiltros, puedeVender, agregar, fijaMargen]);
  useTeclasGlobales(teclas, caja.current);

  const abierto = abiertoId ? catalogo.find((p) => p.id === abiertoId) ?? null : null;
  const listo = !lista.cargando || resultados.length > 0;
  const catalogoVacio = listo && !lista.error && resultados.length === 0 && !consultaEstable.trim() && !conFiltros;

  return (
    <Pagina titulo="Productos" testId="productos" className="productos"
      acciones={resumen && resumen.productos > 0 ? (
        <div className="fila envuelve">
          <Pastilla sinPunto>{numero(resumen.productos)} productos</Pastilla>
          {resumen.sin_margen > 0 && <Pastilla tipo="alerta">{numero(resumen.sin_margen)} sin margen</Pastilla>}
        </div>
      ) : undefined}>
      <Buscador valor={consulta} alCambiar={setConsulta} cajaRef={caja} autoFoco
        placeholder={esCelular ? TEXTOS.catalogo.buscar.corto : TEXTOS.catalogo.buscar.largo} etiqueta="Buscar productos"
        extra={<div className="filtros-lugar">
          <Boton icono="filtros" onClick={() => setViendoFiltros((v) => !v)} aria-expanded={viendoFiltros} aria-label={conFiltros ? `${TEXTOS.catalogo.filtros.largo}: ${cuantosFiltros(filtros)}` : undefined} data-testid="filtros">
            {TEXTOS.catalogo.filtros.largo}{conFiltros && <b className="cuenta-filtros" data-testid="cuantos-filtros">{cuantosFiltros(filtros)}</b>}
          </Boton>
          {viendoFiltros && <PanelDeFiltros filtros={filtros} marcas={marcas} alCambiar={setFiltros} alCerrar={() => { setViendoFiltros(false); caja.current?.focus(); }} />}
        </div>} />
      {!esCelular && (
        <p className="vender-teclas detalle">
          <span><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd> eligen</span>
          {fijaMargen && <span><kbd className="tecla">Mayús</kbd> + <kbd className="tecla">1</kbd> a <kbd className="tecla">5</kbd> fijan el margen del elegido (300, 200, 100, 50, 25 %)</span>}
          <span><kbd className="tecla">Enter</kbd> abre la ficha</span><span><kbd className="tecla">Esc</kbd> borra la búsqueda</span>
          {puedeVender && <span><kbd className="tecla">+</kbd> {TEXTOS.catalogo.teclaAgregar.largo}</span>}
        </p>
      )}
      {!listo && <Progreso texto="Buscando…" />}
      <Aviso tipo="error">{error ?? lista.error}</Aviso>

      {catalogoVacio && (
        <Vacio icono="productos" titulo="Todavía no hay productos" accion={<Boton variante="principal" icono="listas" onClick={() => irA("listas")}>Cargar una lista de precios</Boton>}>
          Los productos entran solos al cargar la lista de precios de un proveedor.
        </Vacio>
      )}
      {conFiltros && (
        <p className="con-filtros detalle" data-testid="con-filtros">{cuantosProductos(lista.total)} {TEXTOS.catalogo.conFiltros.largo}
          <button type="button" className="enlace" onClick={() => setFiltros(SIN_FILTROS)} data-testid="sacar-filtros">{TEXTOS.catalogo.sacarFiltros.largo}</button></p>
      )}
      {listo && !lista.error && conFiltros && resultados.length === 0 ? (
        <div data-testid="sin-resultados"><Vacio icono="buscar" titulo={TEXTOS.catalogo.sinProductosConFiltros.largo} accion={<Boton onClick={() => setFiltros(SIN_FILTROS)}>{TEXTOS.catalogo.sacarFiltros.largo}</Boton>}>{consultaEstable.trim() ? `Lo que se buscó, «${consultaEstable}», no tiene productos con esos filtros.` : "Ningún producto del catálogo cumple esos filtros."}</Vacio></div>
      ) : listo && !lista.error && consultaEstable.trim() && resultados.length === 0 && (
        <div data-testid="sin-resultados"><Vacio icono="buscar" titulo={`Nada con «${consultaEstable}»`}>Probá con menos palabras, o con el código del proveedor.</Vacio></div>
      )}

      {resultados.length > 0 && (esCelular ? (
        <ul className="lista" data-flechas-propias data-testid="resultados">
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
          <table className="tabla productos-tabla" data-flechas-propias data-testid="resultados">
            <thead><tr><th className="angosta"><span className="solo-lectores">Foto</span></th><th>Producto</th><th>Proveedor</th><th className="num">Stock</th><SiVeCostos><th className="num">Costo</th></SiVeCostos><th>Margen</th><th className="num">Precio de venta</th></tr></thead>
            <tbody>
              {resultados.map((p, i) => <FilaProducto key={p.id} producto={p} stock={stockDe(p, stock)} elegido={i === elegido} alElegir={() => setElegido(i)} alCambiar={(c) => actualizar(p.id, c)} alError={setError} alAgregar={puedeVender ? () => agregar(p) : undefined} />)}
            </tbody>
          </table>
        </div>
      ))}
      {hayMas && <div ref={centinela} className="detalle productos-mas" data-testid="cargar-mas">Trayendo más productos…</div>}

      {agregado && <div className="aviso-agregado" role="status" data-testid="agregado"><Icono nombre="tilde" tam={20} grosor={2.6} />{agregado}</div>}
      {abierto && <FichaProducto producto={abierto} quienLoTiene={(codigo) => quienTieneElCodigo(codigo, abierto.id)} alCerrar={() => setAbiertoId(null)} alCambiar={(c) => actualizar(abierto.id, c)} />}
    </Pagina>
  );
}

// «Otro margen»: un porcentaje que no es ninguno de los cinco botones. Enter o salir del campo lo guarda.
function OtroMargen({ producto: p, manual, alCambiar, id }: { producto: Producto; manual: number | null; alCambiar: (c: Cambios) => void; id?: string }) {
  const [texto, setTexto] = useState(manual === null ? "" : String(manual));
  useEffect(() => { setTexto(manual === null ? "" : String(manual)); }, [manual]);
  const guardar = () => { const v = otroMargen(texto); if (v !== null && v !== p.margen_elegido) alCambiar({ margen_elegido: v }); else if (!texto) setTexto(manual === null ? "" : String(manual)); };
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
      lista del {fecha(p.fecha_lista)}
    </Boton>
  );
}

function FilaProducto({ producto: p, stock, elegido, alElegir, alCambiar, alError, alAgregar }: { producto: Producto; stock: { hay: boolean; texto: string }; elegido: boolean; alElegir: () => void; alCambiar: (c: Cambios) => void; alError: (m: string) => void; alAgregar?: () => void }) {
  const fijaMargen = usePuede()("catalogo.margenes");
  const { costo, precio, manual, pasosCosto } = calcular(p);
  const veCostos = useVeCostos();
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
          <SiVeCostos><BajarLista producto={p} alError={alError} /></SiVeCostos>
        </div>
        {veCostos && varios && (
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
      <td className="num"><span className={`etiqueta-stock ${stock.hay ? "hay" : "no"}`} data-testid="stock">{stock.texto}</span></td>
      <SiVeCostos><td className="num">{costo === null ? <span className="detalle">sin costo</span> : <Explicado valor={pesos(costo)} pasos={pasosCosto} etiqueta={`Costo ${pesos(costo)}`} />}</td></SiVeCostos>
      <td>
        {!fijaMargen ? <span className="detalle" data-testid="margen-fijo">{p.margen_elegido === null ? "sin margen" : `${p.margen_elegido} %`}</span> : <div className="productos-margen">
          <Margenes compacto elegido={p.margen_elegido} disabled={costo === null} atajos={elegido} etiqueta={`Margen de ${p.descripcion}`} alElegir={(m) => { alElegir(); alCambiar({ margen_elegido: m }); }} />
          <OtroMargen producto={p} manual={manual} alCambiar={alCambiar} />
        </div>}
      </td>
      <td className="num">
        {precio ? <Explicado conCosto className="importe" valor={pesosCortos(precio.valor)} pasos={precio.pasos} etiqueta={`Precio de venta ${pesosCortos(precio.valor)}`} />
          : <span className="falta-texto" data-testid="sin-precio">{costo === null ? "sin costo" : "elegí un margen"}</span>}
        {alAgregar && <><br /><button type="button" className="agregar-a-la-venta" onClick={(e) => { e.stopPropagation(); alElegir(); alAgregar(); }} aria-label={`${TEXTOS.catalogo.agregarALaVenta.largo}: ${p.descripcion}`} data-testid="agregar"><Icono nombre="carrito" tam={20} grosor={1.8} />{TEXTOS.catalogo.agregar.largo}</button></>}
      </td>
    </tr>
  );
}


// Los filtros, en un panel debajo de su botón (maqueta de 015): la disponibilidad y la marca, con
// su buscador. Se aplican mientras se eligen; Esc o tocar afuera lo cierra y quedan puestos.
function PanelDeFiltros({ filtros, marcas, alCambiar, alCerrar }: { filtros: Filtros; marcas: string[]; alCambiar: (f: Filtros) => void; alCerrar: () => void }) {
  const [buscarMarca, setBuscarMarca] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const t = TEXTOS.catalogo;
  // El foco entra una sola vez, al abrir; el padre pasa un `alCerrar` nuevo en cada dibujo, y
  // depender de él movería el foco cada vez que cambia la lista (015-E30).
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("[aria-checked='true']")?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); cerrar.current(); } };
    const afuera = (e: MouseEvent) => { if (panel.current && !panel.current.parentElement?.contains(e.target as Node)) cerrar.current(); };
    window.addEventListener("keydown", tecla, true);
    document.addEventListener("mousedown", afuera);
    return () => { window.removeEventListener("keydown", tecla, true); document.removeEventListener("mousedown", afuera); };
  }, []);
  const opciones: { valor: Disponibilidad; nombre: string }[] = [{ valor: "todos", nombre: t.todos.largo }, { valor: "con-stock", nombre: t.conStock.largo }, { valor: "sin-stock", nombre: t.sinStock.largo }];
  const visibles = marcas.filter((m) => m.toLocaleLowerCase("es-AR").includes(buscarMarca.trim().toLocaleLowerCase("es-AR")));
  return (
    <div className="panel-filtros" role="dialog" aria-label={t.filtros.largo} ref={panel} data-testid="panel-filtros">
      <div className="panel-filtros-cabeza"><h2>{t.filtros.largo}</h2><button type="button" className="enlace" onClick={() => alCambiar(SIN_FILTROS)} data-testid="panel-sacar-filtros">{t.sacarFiltros.largo}</button></div>
      <h3>{t.disponibilidad.largo}</h3>
      <div className="filtros-disponibilidad" role="radiogroup" aria-label={t.disponibilidad.largo}>
        {opciones.map((o) => <button key={o.valor} type="button" role="radio" aria-checked={filtros.disponibilidad === o.valor} onClick={() => alCambiar({ ...filtros, disponibilidad: o.valor })} data-testid={`disponibilidad-${o.valor}`}>{o.nombre}</button>)}
      </div>
      <h3>{t.marca.largo}</h3>
      <label className="filtros-buscar-marca"><Icono nombre="buscar" tam={18} /><input type="search" value={buscarMarca} onChange={(e) => setBuscarMarca(e.target.value)} placeholder={t.buscarMarca.largo} aria-label={t.buscarMarca.largo} data-testid="buscar-marca" /></label>
      <ul className="filtros-marcas" role="radiogroup" aria-label={t.marca.largo}>
        {[null, ...visibles].map((m) => (
          <li key={m ?? ""}><button type="button" role="radio" aria-checked={filtros.marca === m} onClick={() => alCambiar({ ...filtros, marca: m })} data-testid="marca"><i aria-hidden="true" />{m ?? t.todasLasMarcas.largo}</button></li>
        ))}
      </ul>
      <p className="detalle">La lista se filtra mientras elegís. Esc cierra.</p>
    </div>
  );
}
