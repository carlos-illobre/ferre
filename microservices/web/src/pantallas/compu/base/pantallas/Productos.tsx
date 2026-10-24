import { useCallback, useEffect, useRef, useState } from "react";
import { EVENTO_EMPAREJAMIENTO, puestoLocal } from "../../../../puesto";
import { escucharPuesto } from "../../../../codigos-del-celular";
import { usePuede } from "../../../permisos";
import { esMargenBoton, MARGENES } from "../../../../negocio/precios/vista-previa";
import { esperarBusqueda, quienTieneElCodigo, traerPorCodigo, useCatalogo, useListaDeProductos, useMarcas } from "../../../../negocio/catalogo";
import { useDebounce } from "../../../../plataforma/tiempo/debounce";
import { useTeclasGlobales } from "../../../../plataforma/teclado/teclas";
import { api, urlDeFoto } from "../../../../datos/conexion";
import type { Producto } from "../../../celular/pantallas/Productos";
import { useEsCelular } from "../vista";
import { irA } from "../rutas";
import { Aviso, Boton, Buscador, Icono, Pagina, Pastilla, Progreso, Vacio, numero, pesosCortos } from "../ui";
import { FichaProducto } from "./FichaProducto";
import { FichaAlLado } from "./FichaAlLado";
import { AlLadoDeLasPestanas } from "../../../AlLadoDeLasPestanas";
import { VincularParaEscanear } from "../../Vender";
import "../estilos/productos.css";
import { precioDelProducto } from "../../../../negocio/catalogo/precio";
import { cuantosFiltros, SIN_FILTROS, stockDe, type Disponibilidad, type Filtros } from "../../../../negocio/catalogo/stock-y-filtros";
import type { ResumenDelCatalogo } from "@servidor/productos";
import { agregarALaVenta } from "../../../../negocio/ventas/venta-en-curso";
import { cuantosProductos, TEXTOS } from "../../../textos";

// Productos: la búsqueda le pregunta al servidor y trae de a 50 (specs/018). En la computadora, como
// la v2 («Lista y ficha lado a lado», decisión 145): la lista a la izquierda y la ficha del elegido
// siempre abierta a la derecha. Teclado: ↑ ↓ eligen (y la ficha sigue), Mayús + 1 a 5 fijan el
// margen, «+» agrega a la venta, Enter entra a la ficha y Esc vuelve a la búsqueda (o la borra),
// F1 pliega «Así se calcula», Alt F abre los filtros y Alt E le pide el lector al celular. En una
// ventana angosta, cada producto abre su ficha encima.
type Cambios = Partial<Pick<Producto, "margen_elegido" | "foto_url" | "codigo_barras">> & { proveedor_preferido_id?: string };

export function Productos() {
  const puede = usePuede();
  const fijaMargen = puede("catalogo.margenes");
  const { catalogo, stock, actualizarProducto } = useCatalogo();
  // Agregar a la venta desde acá (RF-108), con el botón o la tecla «+»: solo quien puede vender.
  const puedeVender = puede("ventas.registrar");
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
  // En una ventana angosta, la ficha que se abrió encima.
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  // Mientras la ficha al lado carga un código, lo que escanea el celular es para ese producto.
  const [cargandoCodigo, setCargandoCodigo] = useState(false);
  const [calculoAbierto, setCalculoAbierto] = useState(true);
  const caja = useRef<HTMLInputElement>(null);
  const ficha = useRef<HTMLElement>(null);
  const centinela = useRef<HTMLDivElement>(null);

  // Buscar escaneando (RF-08): lo que lee el celular vinculado queda escrito en la búsqueda, que
  // encuentra el producto por su código (decisión 139); en la ventana angosta abre su ficha.
  const alEscanear = useRef<(codigo: string) => void>(() => undefined);
  useEffect(() => {
    alEscanear.current = (codigo) => {
      if (!esCelular) { setConsulta(codigo); return; }
      void traerPorCodigo(codigo).then((p) => { if (p) { setConsulta(""); setAbiertoId(p.id); } else setConsulta(codigo); }).catch((e: Error) => setError(e.message));
    };
  }, [esCelular]);
  const [emparejado, setEmparejado] = useState(() => puestoLocal()?.id ?? null);
  useEffect(() => { const mirar = () => setEmparejado(puestoLocal()?.id ?? null); window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar); return () => window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar); }, []);
  const escuchando = esCelular ? !abiertoId : !cargandoCodigo;
  useEffect(() => {
    if (!emparejado || !escuchando) return;
    return escucharPuesto(emparejado, (codigo) => alEscanear.current(codigo));
  }, [escuchando, emparejado]);
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
  // Cuántos productos hay y cuántos sin precio: los cuenta el servidor.
  const [resumen, setResumen] = useState<ResumenDelCatalogo | null>(null);
  useEffect(() => { api<ResumenDelCatalogo>("/productos/resumen").then(setResumen).catch(() => undefined); }, []);
  // El elegido con las flechas queda siempre a la vista.
  useEffect(() => { document.querySelector(".productos [data-testid='producto'][aria-selected='true']")?.scrollIntoView?.({ block: "nearest" }); }, [elegido]);

  const actualizar = useCallback((id: string, cambios: Cambios) => {
    setError(null);
    actualizarProducto(id, cambios).catch((e: Error) => setError(`No se pudo guardar el cambio: ${e.message}. Probá de nuevo.`));
  }, [actualizarProducto]);

  // Enter lleva el foco a la ficha, al margen elegido (o al primero); sin margen que elegir, a «Listo».
  const entrarALaFicha = useCallback(() => {
    const entrar = () => {
      const f = ficha.current;
      if (!f) return;
      const margenes = [...f.querySelectorAll<HTMLButtonElement>(".margenes button:not([disabled])")];
      (margenes.find((b) => b.getAttribute("aria-checked") === "true") ?? margenes[0] ?? f.querySelector<HTMLElement>("[data-testid='ficha-listo']"))?.focus();
    };
    // Si la ficha ya está, enseguida; si el elegido recién cambió, cuando se dibuje la suya.
    if (ficha.current) entrar(); else requestAnimationFrame(entrar);
  }, []);
  const abrir = useCallback((i: number, id: string) => { if (esCelular) setAbiertoId(id); else { setElegido(i); entrarALaFicha(); } }, [esCelular, entrarALaFicha]);

  const teclas = useCallback((e: globalThis.KeyboardEvent) => {
    if (abiertoId || viendoFiltros || document.querySelector("dialog[open]")) return;
    const enFicha = e.target instanceof Node && Boolean(ficha.current?.contains(e.target));
    if (e.altKey && e.code === "KeyF") { e.preventDefault(); setViendoFiltros(true); return; }
    if (e.altKey && e.code === "KeyE") { const b = document.querySelector<HTMLButtonElement>("[data-testid='pedir-lector']"); if (b) { e.preventDefault(); b.click(); } return; }
    if (e.key === "F1" && !esCelular) { e.preventDefault(); setCalculoAbierto((a) => !a); return; }
    if (e.key === "Escape") { if (!enFicha) setConsulta(""); caja.current?.focus(); return; }
    if (!enFicha && e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (!enFicha && e.key === "ArrowUp") {
      e.preventDefault();
      // Arriba de la primera fila están las pestañas: la marca de las flechas vuelve a ellas (decisión 82).
      if (elegido === 0) document.querySelector<HTMLElement>(".cuerpo .pestanas button[aria-current='page']")?.focus();
      else setElegido((i) => Math.max(i - 1, 0));
    }
    else if (!enFicha && e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
      // Si la lista todavía no alcanzó a lo que se escribió (llega un instante después de tipear),
      // Enter espera la respuesta y abre el primero: no abre la fila de la lista vieja.
      e.preventDefault();
      if (consulta === consultaEstable && !lista.cargando) { const p = resultados[elegido]; if (p) abrir(elegido, p.id); }
      else if (consulta.trim()) void esperarBusqueda(consulta).then((r) => { if (r[0]) abrir(0, r[0].id); });
    }
    // «+» agrega el elegido a la venta (015-E27); sin permiso de vender, no hace nada.
    else if (e.key === "+" && !e.ctrlKey && !e.metaKey && !e.altKey && puedeVender && resultados[elegido]) { e.preventDefault(); agregar(resultados[elegido]!); }
    else if (fijaMargen && e.shiftKey && /^Digit[1-5]$/.test(e.code)) {
      // Se mira e.code porque con Mayúsculas la tecla «3» reporta «#».
      e.preventDefault();
      const p = resultados[elegido];
      if (p && p.costo_neto !== null) actualizar(p.id, { margen_elegido: MARGENES[Number(e.code.slice(5)) - 1]! });
    }
  }, [resultados, elegido, actualizar, abiertoId, consulta, consultaEstable, lista.cargando, viendoFiltros, puedeVender, agregar, fijaMargen, abrir, esCelular]);
  useTeclasGlobales(teclas, caja.current);

  const abierto = abiertoId ? catalogo.find((p) => p.id === abiertoId) ?? null : null;
  const delaFicha = resultados[elegido] ? catalogo.find((p) => p.id === resultados[elegido]!.id) ?? resultados[elegido]! : null;
  const listo = !lista.cargando || resultados.length > 0;
  const catalogoVacio = listo && !lista.error && resultados.length === 0 && !consultaEstable.trim() && !conFiltros;
  const t = TEXTOS.catalogo;

  const buscador = (
    <Buscador valor={consulta} alCambiar={setConsulta} cajaRef={caja} autoFoco
      placeholder={esCelular ? t.buscar.corto : t.buscar.largo} etiqueta="Buscar productos"
      extra={<div className="filtros-lugar">
        <Boton icono="filtros" onClick={() => setViendoFiltros((v) => !v)} aria-expanded={viendoFiltros} aria-keyshortcuts="Alt+F" aria-label={conFiltros ? `${t.filtros.largo}: ${cuantosFiltros(filtros)}` : undefined} data-testid="filtros">
          {t.filtros.largo}{conFiltros && <b className="cuenta-filtros" data-testid="cuantos-filtros">{cuantosFiltros(filtros)}</b>}
        </Boton>
        {viendoFiltros && <PanelDeFiltros filtros={filtros} marcas={marcas} alCambiar={setFiltros} alCerrar={() => { setViendoFiltros(false); caja.current?.focus(); }} />}
      </div>} />
  );
  const avisos = <>
    {!listo && <Progreso texto="Buscando…" />}
    <Aviso tipo="error">{error ?? lista.error}</Aviso>
    {catalogoVacio && (
      <Vacio icono="productos" titulo="Todavía no hay productos" accion={<Boton variante="principal" icono="listas" onClick={() => irA("listas")}>Cargar una lista de precios</Boton>}>
        Los productos entran solos al cargar la lista de precios de un proveedor.
      </Vacio>
    )}
    {conFiltros && (
      <p className="con-filtros detalle" data-testid="con-filtros">{cuantosProductos(lista.total)} {t.conFiltros.largo}
        <button type="button" className="enlace" onClick={() => setFiltros(SIN_FILTROS)} data-testid="sacar-filtros">{t.sacarFiltros.largo}</button></p>
    )}
    {listo && !lista.error && conFiltros && resultados.length === 0 ? (
      <div data-testid="sin-resultados"><Vacio icono="buscar" titulo={t.sinProductosConFiltros.largo} accion={<Boton onClick={() => setFiltros(SIN_FILTROS)}>{t.sacarFiltros.largo}</Boton>}>{consultaEstable.trim() ? `Lo que se buscó, «${consultaEstable}», no tiene productos con esos filtros.` : "Ningún producto del catálogo cumple esos filtros."}</Vacio></div>
    ) : listo && !lista.error && consultaEstable.trim() && resultados.length === 0 && (
      <div data-testid="sin-resultados"><Vacio icono="buscar" titulo={`Nada con «${consultaEstable}»`}>Probá con menos palabras, o con el código del proveedor.</Vacio></div>
    )}
  </>;

  return (
    <Pagina titulo="Productos" testId="productos" className={`productos ${esCelular ? "" : "productos-v2"}`}
      acciones={<AlLadoDeLasPestanas>
        <div className="fila envuelve productos-arriba">
          {resumen && resumen.productos > 0 && <Pastilla sinPunto>{cuantosProductos(resumen.productos)}</Pastilla>}
          {resumen && resumen.sin_margen > 0 && <span className="pastilla-sin-precio" data-testid="cuantos-sin-precio"><Icono nombre="alerta" tam={15} />{numero(resumen.sin_margen)} {t.sinPrecio.largo}</span>}
          {!esCelular && emparejado && <VincularParaEscanear vinculado alVincular={() => undefined} comoV2 />}
          {!esCelular && puede("catalogo.listas") && <Boton icono="subir" onClick={() => irA("listas")} data-testid="cargar-lista">{t.cargarLista.largo}</Boton>}
        </div>
      </AlLadoDeLasPestanas>}>
      {esCelular ? <>
        {buscador}
        {avisos}
        {resultados.length > 0 && (
          <ul className="lista" data-flechas-propias data-testid="resultados">
            {resultados.map((p, i) => {
              const { costo, valor: precio } = precioDelProducto(p);
              return (
                <li key={p.id}>
                  <button type="button" className="renglon con-foto" aria-selected={i === elegido} onClick={() => { setElegido(i); setAbiertoId(p.id); }} data-testid="producto">
                    <span className="miniatura">{p.foto_url ? <img src={urlDeFoto(p.foto_url) ?? ""} alt="" loading="lazy" /> : <Icono nombre="productos" tam={18} grosor={1.6} />}</span>
                    <span className="nombre">{p.descripcion}</span>
                    <span className={precio !== null ? "importe" : "falta-texto"}>{precio !== null ? pesosCortos(precio) : costo === null ? "sin costo" : "sin margen"}</span>
                    <span className="detalle">{[p.marca, p.proveedor, p.margen_elegido !== null ? `margen ${p.margen_elegido} %` : null].filter(Boolean).join(" · ")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {hayMas && <div ref={centinela} className="detalle productos-mas" data-testid="cargar-mas">{t.cargandoMas.largo}</div>}
      </> : (
        <div className="pv">
          <div className="pv-lista">
            {buscador}
            {avisos}
            {resultados.length > 0 && <p className="pv-cuenta"><span>{consultaEstable.trim() ? `${cuantosProductos(lista.total)} con «${consultaEstable.trim()}»` : cuantosProductos(lista.total)}</span><span>{t.precioYMargen.largo}</span></p>}
            {resultados.length > 0 && (
              <ul className="pv-filas" data-flechas-propias data-testid="resultados">
                {resultados.map((p, i) => <FilaProducto key={p.id} producto={p} stock={stockDe(p, stock)} elegido={i === elegido} alElegir={() => setElegido(i)} alAgregar={puedeVender ? () => { setElegido(i); agregar(p); } : undefined} />)}
                {hayMas && <li ref={centinela as unknown as React.Ref<HTMLLIElement>} className="detalle productos-mas" data-testid="cargar-mas">{t.cargandoMas.largo}</li>}
              </ul>
            )}
            <p className="pv-teclas detalle">
              {puedeVender && <span><kbd className="tecla">+</kbd> {t.teclaAgregar.largo}</span>}
              {fijaMargen && <span><kbd className="tecla">Mayús</kbd><kbd className="tecla">1–5</kbd> margen</span>}
              <span><kbd className="tecla">Alt F</kbd> {t.filtros.largo.toLowerCase()}</span>
            </p>
          </div>
          {delaFicha ? <FichaAlLado ref={ficha} producto={delaFicha} quienLoTiene={(codigo) => quienTieneElCodigo(codigo, delaFicha.id)} alCambiar={(c) => actualizar(delaFicha.id, c)}
            alAgregar={puedeVender ? () => agregar(delaFicha) : undefined} alListo={() => caja.current?.focus()} alCargarCodigo={setCargandoCodigo}
            calculoAbierto={calculoAbierto} alPlegarCalculo={() => setCalculoAbierto((a) => !a)} />
            : <div className="pv-sin-ficha detalle">{t.elegiUnProducto.largo}</div>}
        </div>
      )}

      {agregado && <div className="aviso-agregado" role="status" data-testid="agregado"><Icono nombre="tilde" tam={20} grosor={2.6} />{agregado}</div>}
      {abierto && <FichaProducto producto={abierto} quienLoTiene={(codigo) => quienTieneElCodigo(codigo, abierto.id)} alCerrar={() => setAbiertoId(null)} alCambiar={(c) => actualizar(abierto.id, c)} />}
    </Pagina>
  );
}

// Cada producto de la lista, como la v2: la foto, el nombre, la marca y el stock con su unidad; el
// precio con el margen debajo (o «Sin precio» y qué falta); y el carrito al final. Tocarla la
// elige y la ficha de al lado pasa a ser la suya.
function FilaProducto({ producto: p, stock, elegido, alElegir, alAgregar }: { producto: Producto; stock: { hay: boolean; texto: string }; elegido: boolean; alElegir: () => void; alAgregar?: () => void }) {
  const fijaMargen = usePuede()("catalogo.margenes");
  const { costo, valor: precio } = precioDelProducto(p);
  const url = urlDeFoto(p.foto_url ?? null);
  return (
    <li className={`pv-fila ${elegido ? "elegida" : ""}`} aria-selected={elegido} onClick={alElegir} data-testid="producto">
      <span className="pv-foto">{url ? <img src={url} alt="" loading="lazy" /> : <Icono nombre="productos" tam={20} grosor={1.6} />}</span>
      <span className="pv-texto">
        <span className="pv-nombre">{p.descripcion}</span>
        <span className="pv-detalle">{p.marca && <>{p.marca} · </>}<span className={`pv-stock ${stock.hay ? "hay" : "no"}`} data-testid="stock">{stock.texto}</span></span>
      </span>
      {precio !== null ? (
        <span className="pv-precio"><b data-testid="precio">{pesosCortos(precio)}</b><small>{p.margen_elegido} %{esMargenBoton(p.margen_elegido!) ? "" : ` ${TEXTOS.ficha.aMano.largo}`}</small></span>
      ) : (
        <span className="pv-precio sin"><b>{TEXTOS.catalogo.sinPrecioTitulo.largo}</b><small data-testid="sin-precio">{costo === null ? TEXTOS.ficha.sinCosto.largo : fijaMargen ? TEXTOS.ficha.eligeMargen.largo : TEXTOS.ficha.sinMargen.largo}</small></span>
      )}
      {alAgregar ? <button type="button" className="pv-agregar" title={`${TEXTOS.catalogo.agregarALaVenta.largo} (+)`} onClick={(e) => { e.stopPropagation(); alAgregar(); }} aria-label={`${TEXTOS.catalogo.agregarALaVenta.largo}: ${p.descripcion}`} data-testid="agregar"><Icono nombre="carrito" tam={18} grosor={1.9} /></button> : <span />}
    </li>
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
