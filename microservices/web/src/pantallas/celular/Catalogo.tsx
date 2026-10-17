import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SiVeCostos } from "../Costos";
import { Escaner, hayCamara } from "../../plataforma/camara/Escaner";
import { usePuede, type Permiso } from "../permisos";
import { SinPermiso } from "../SinPermiso";
import { esMargenBoton, MARGENES } from "../../negocio/precios/vista-previa";
import { AvisoError, Buscador, Hoja, Icono, Toast, Lista } from "./componentes/base";
import { Pestanas } from "./Pestanas";
import { traerPorCodigo, useCatalogo } from "../../catalogo";
import { useDebounce } from "../../plataforma/tiempo/debounce";
import { useTeclasGlobales } from "../../plataforma/teclado/teclas";
import { pesos, pesosCortos } from "../../formato";
import { irA } from "../../rutas";
import { Listas } from "./pantallas/Listas";
import { Duplicados } from "./pantallas/Duplicados";
import type { Producto } from "./pantallas/Productos";
import { precioDelProducto } from "../../negocio/catalogo/precio";
import { cuantosFiltros, filtrar, marcasDe, SIN_FILTROS, stockDe, type Disponibilidad, type Filtros } from "../../negocio/catalogo/stock-y-filtros";
import { agregarALaVenta } from "../../negocio/ventas/venta-en-curso";
import { cuantosProductos, TEXTOS } from "../textos";
import { FichaProducto } from "./FichaProducto";
import "./catalogo.css";

// Catálogo: productos con margen y proveedores, listas de precios, duplicados. Tres
// sub-pantallas con un segmento arriba.
const SUB = [{ valor: "productos", nombre: "Productos" }, { valor: "listas", nombre: "Listas" }, { valor: "duplicados", nombre: "Duplicados" }] as const;
type Sub = (typeof SUB)[number]["valor"];
// Lo que pide cada pestaña (RF-72). Buscar productos lo puede cualquiera con sesión.
const PIDE: Partial<Record<Sub, Permiso>> = { listas: "catalogo.listas", duplicados: "catalogo.duplicados" };

export function Catalogo({ sub }: { sub: string | null }) {
  const actual: Sub = sub === "listas" || sub === "duplicados" ? sub : "productos";
  const puedeEsto = usePuede();
  const permitida = (s: Sub) => !PIDE[s] || puedeEsto(PIDE[s]!);
  if (!permitida(actual)) return <SinPermiso falta={[PIDE[actual]!]} />;
  return (
    <main className="contenido">
      <div className="encabezado">
        <h1 className="titulo">Catálogo</h1>
        <Pestanas opciones={SUB.filter((s) => permitida(s.valor)).map((s) => ({ valor: s.valor, nombre: s.nombre, icono: s.valor }))} actual={actual} alElegir={(v) => irA(v === "productos" ? "catalogo" : `catalogo/${v}`)} />
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
  const fijaMargen = usePuede()("catalogo.margenes");
  const { catalogo, error: errorCatalogo, buscarProductos, actualizarProducto, stock } = useCatalogo();
  // Agregar a la venta desde acá (RF-108): solo quien puede vender.
  const puedeVender = usePuede()("ventas.registrar");
  const [agregado, setAgregado] = useState<string | null>(null);
  // Filtros por disponibilidad y marca (RF-109): de esta pantalla, no se guardan.
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [viendoFiltros, setViendoFiltros] = useState(false);
  const conFiltros = cuantosFiltros(filtros) > 0;
  const [error, setError] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const consultaEstable = useDebounce(consulta, 150);
  const [elegido, setElegido] = useState(0);
  const [limite, setLimite] = useState(30);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  // Buscar escaneando (RF-08): el código de un producto abre su ficha; uno que nadie tiene, lo dice.
  const [escaneando, setEscaneando] = useState(false);
  const alEscanear = useCallback((codigo: string) => {
    setEscaneando(false);
    // De la memoria o, buscando en el servidor (RF-85), del servidor.
    void traerPorCodigo(codigo).then((p) => {
      if (p) { setConsulta(""); setAbiertoId(p.id); return; }
      setConsulta(codigo);
      setError(`Ningún producto tiene el código ${codigo}. Buscá el producto, abrilo y tocá «Escanear el código» para cargárselo.`);
    }).catch((e: Error) => setError(e.message));
  }, []);
  const caja = useRef<HTMLInputElement>(null);
  const centinela = useRef<HTMLDivElement>(null);

  // En el celular la búsqueda no toma el foco sola: abriría el teclado y taparía el menú.
  // Con filtros se filtra todo lo encontrado y después se muestra de a 30, para no perder
  // productos. Lo encontrado entero se arma solo con filtros o con los filtros abiertos: sin eso se
  // busca de a tramos, como siempre. Las marcas para elegir son las de lo encontrado (015-E29).
  const encontrados = useMemo(() => (conFiltros || viendoFiltros ? (consultaEstable.trim() ? buscarProductos(consultaEstable, Number.MAX_SAFE_INTEGER) : catalogo ?? []) : []), [conFiltros, viendoFiltros, consultaEstable, buscarProductos, catalogo]);
  const filtrados = useMemo(() => (conFiltros ? filtrar(encontrados, stock, filtros) : null), [conFiltros, encontrados, stock, filtros]);
  const resultados = useMemo(() => (filtrados ? filtrados.slice(0, limite) : consultaEstable.trim() ? buscarProductos(consultaEstable, limite) : (catalogo ?? []).slice(0, limite)), [filtrados, limite, consultaEstable, buscarProductos, catalogo]);
  const marcas = useMemo(() => marcasDe(encontrados), [encontrados]);
  const agregar = useCallback((p: Producto) => { agregarALaVenta(p); setAgregado(`${TEXTOS.catalogo.agregado.corto}: ${p.descripcion}`); }, []);
  useEffect(() => { if (!agregado) return; const t = setTimeout(() => setAgregado(null), 3000); return () => clearTimeout(t); }, [agregado]);
  const hayMas = resultados.length === limite;
  useEffect(() => { setElegido(0); setLimite(30); }, [consultaEstable, filtros]);
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hayMas) return;
    const obs = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) setLimite((l) => l + 30); }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hayMas, resultados.length]);

  const actualizar = useCallback((id: string, cambios: Partial<Pick<Producto, "margen_elegido" | "foto_url" | "codigo_barras">> & { proveedor_preferido_id?: string }) => {
    actualizarProducto(id, cambios as never).catch((e: Error) => setError(`No se pudo guardar: ${e.message}`));
  }, [actualizarProducto]);

  const teclas = useCallback((e: globalThis.KeyboardEvent) => {
    if (abiertoId) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && resultados[elegido]) { e.preventDefault(); setAbiertoId(resultados[elegido]!.id); }
    else if (e.key === "Escape") { setConsulta(""); caja.current?.focus(); }
    else if (fijaMargen && e.shiftKey && /^Digit[1-5]$/.test(e.code)) {
      e.preventDefault();
      const p = resultados[elegido];
      if (p) actualizar(p.id, { margen_elegido: MARGENES[Number(e.code.slice(5)) - 1]! });
    }
  }, [resultados, elegido, actualizar, abiertoId, fijaMargen]);
  useTeclasGlobales(teclas, caja.current);

  const abierto = abiertoId ? (catalogo ?? []).find((p) => p.id === abiertoId) ?? null : null;

  return (
    <>
      <Buscador chico valor={consulta} alCambiar={setConsulta} placeholder={catalogo ? TEXTOS.catalogo.buscar.corto : "Bajando el catálogo…"} disabled={!catalogo} cajaRef={caja} alEscanear={hayCamara() ? () => setEscaneando(true) : undefined}
        extra={<button type="button" className="boton-filtros" aria-label={conFiltros ? `${TEXTOS.catalogo.filtros.corto}: ${cuantosFiltros(filtros)}` : TEXTOS.catalogo.filtros.corto} onClick={() => setViendoFiltros(true)} disabled={!catalogo} data-testid="filtros">
          <Icono nombre="filtros" tam={22} />{conFiltros && <b data-testid="cuantos-filtros">{cuantosFiltros(filtros)}</b>}
        </button>} />
      {conFiltros && (
        <p className="con-filtros" data-testid="con-filtros">{cuantosProductos(filtrados?.length ?? 0)} {TEXTOS.catalogo.conFiltros.corto}
          <button type="button" onClick={() => setFiltros(SIN_FILTROS)} data-testid="sacar-filtros">{TEXTOS.catalogo.sacarFiltros.corto}</button></p>
      )}
      {escaneando && <Escaner alDetectar={alEscanear} alCerrar={() => setEscaneando(false)} />}
      <small className="solo-escritorio">Flechas para elegir · Enter abre{fijaMargen ? " · Shift+1 a Shift+5 fijan el margen (300, 200, 100, 50, 25 %)" : ""} · Esc limpia</small>
      <AvisoError texto={error ?? errorCatalogo} alCerrar={() => setError(null)} />
      {catalogo && catalogo.length === 0 && <div className="aviso-suave">Todavía no hay productos: cargá una lista de precios primero.</div>}
      {conFiltros && resultados.length === 0 && catalogo && catalogo.length > 0 ? <div className="aviso-suave" data-testid="sin-resultados">{TEXTOS.catalogo.sinProductosConFiltros.corto} <button type="button" className="enlace" onClick={() => setFiltros(SIN_FILTROS)}>{TEXTOS.catalogo.sacarFiltros.corto}</button></div>
        : consultaEstable.trim() && resultados.length === 0 && catalogo && catalogo.length > 0 && <div className="aviso-suave" data-testid="sin-resultados">Nada con "{consultaEstable}". Probá con menos palabras.</div>}
      {resultados.length > 0 && (
        <Lista data-testid="resultados" className="productos-para-vender">
          {resultados.map((p, i) => <FilaProducto key={p.id} producto={p} stock={stockDe(p, stock)} elegida={i === elegido} alAbrir={() => { setElegido(i); setAbiertoId(p.id); }} alAgregar={puedeVender ? () => agregar(p) : undefined} />)}
        </Lista>
      )}
      {hayMas && <div ref={centinela} className="aviso-suave" data-testid="cargar-mas">Cargando más…</div>}
      {agregado && <div className="aviso-agregado"><Toast texto={agregado} alCerrar={() => setAgregado(null)} testId="agregado" /></div>}
      {viendoFiltros && <HojaDeFiltros filtros={filtros} marcas={marcas} cuantos={filtrados?.length ?? encontrados.length} alCambiar={setFiltros} alCerrar={() => setViendoFiltros(false)} />}
      {abierto && <FichaProducto producto={abierto} quienLoTiene={(codigo) => (catalogo ?? []).find((x) => x.id !== abierto.id && x.codigo_barras === codigo)} alCerrar={() => setAbiertoId(null)} alCambiar={(c) => actualizar(abierto.id, c)} />}
    </>
  );
}

// Cada producto, una tarjeta (maqueta B de 015): el stock arriba del nombre, el precio con su
// margen y, debajo, «Agregar» a la venta. «Agregar» va al lado del botón que abre la ficha, no
// adentro: un botón no puede tener otro adentro.
function FilaProducto({ producto: p, stock, elegida, alAbrir, alAgregar }: { producto: Producto; stock: { hay: boolean; texto: string }; elegida: boolean; alAbrir: () => void; alAgregar?: () => void }) {
  const { costo, valor: precio } = precioDelProducto(p);
  return (
    <div className={`tarjeta-producto ${alAgregar ? "con-agregar" : ""}`}>
    <button type="button" className={`fila con-foto ${elegida ? "elegida" : ""}`} onClick={alAbrir} data-testid="producto" aria-selected={elegida}>
      <span className="miniatura">{p.foto_url ? <img src={p.foto_url.startsWith("/") ? `${import.meta.env.VITE_API_URL}${p.foto_url}` : p.foto_url} alt="" /> : null}</span>
      <span className="nombre"><span className={`etiqueta-stock ${stock.hay ? "hay" : "no"}`} data-testid="stock">{stock.hay ? `${stock.texto} ${TEXTOS.catalogo.enStock.corto}` : stock.texto}</span>{p.descripcion}</span>
      <span className="derecha">
        <strong className="importe">{precio === null ? "—" : pesosCortos(precio)}</strong>
        <small style={{ color: p.margen_elegido === null ? "var(--coral-texto)" : undefined, fontWeight: 600 }}>{p.margen_elegido === null ? (costo === null ? "sin costo" : "sin margen") : `${p.margen_elegido} %${esMargenBoton(p.margen_elegido) ? "" : " a mano"}${costo === null ? " · sin costo" : ""}`}</small>
      </span>
      <span className="detalle">{detalleDe(p)}{costo !== null && <SiVeCostos>{` · costo ${pesos(costo)}`}</SiVeCostos>}</span>
    </button>
    {alAgregar && (
      <button type="button" className="agregar-a-la-venta" onClick={alAgregar} aria-label={`${TEXTOS.catalogo.agregarALaVenta.corto}: ${p.descripcion}`} data-testid="agregar">
        <Icono nombre="carrito" tam={20} grosor={1.8} />{TEXTOS.catalogo.agregar.corto}
      </button>
    )}
    </div>
  );
}

// Los filtros, en una hoja que sube desde abajo (maqueta de 015): la disponibilidad y la marca,
// con su buscador. Se aplican mientras se eligen; «Ver N productos» cierra la hoja.
function HojaDeFiltros({ filtros, marcas, cuantos, alCambiar, alCerrar }: { filtros: Filtros; marcas: string[]; cuantos: number; alCambiar: (f: Filtros) => void; alCerrar: () => void }) {
  const [buscarMarca, setBuscarMarca] = useState("");
  const t = TEXTOS.catalogo;
  const opciones: { valor: Disponibilidad; nombre: string }[] = [{ valor: "todos", nombre: t.todos.corto }, { valor: "con-stock", nombre: t.conStock.corto }, { valor: "sin-stock", nombre: t.sinStock.corto }];
  const visibles = marcas.filter((m) => m.toLocaleLowerCase("es-AR").includes(buscarMarca.trim().toLocaleLowerCase("es-AR")));
  const n = cuantos;
  return (
    <Hoja titulo={t.filtros.corto} extra={<button type="button" className="enlace" onClick={() => alCambiar(SIN_FILTROS)} data-testid="hoja-sacar-filtros">{t.sacarFiltros.corto}</button>} alCerrar={alCerrar} testId="hoja-filtros">
      <h3 className="filtros-titulo">{t.disponibilidad.corto}</h3>
      <div className="segmentos filtros-disponibilidad" role="radiogroup" aria-label={t.disponibilidad.corto}>
        {opciones.map((o) => <button key={o.valor} type="button" role="radio" aria-checked={filtros.disponibilidad === o.valor} className={filtros.disponibilidad === o.valor ? "activo" : ""} onClick={() => alCambiar({ ...filtros, disponibilidad: o.valor })} data-testid={`disponibilidad-${o.valor}`}>{o.nombre}</button>)}
      </div>
      <h3 className="filtros-titulo">{t.marca.corto}</h3>
      <Buscador chico valor={buscarMarca} alCambiar={setBuscarMarca} placeholder={t.buscarMarca.corto} testId="buscar-marca" />
      <ul className="filtros-marcas" role="radiogroup" aria-label={t.marca.corto}>
        {[null, ...visibles].map((m) => (
          <li key={m ?? ""}><button type="button" role="radio" aria-checked={filtros.marca === m} className={filtros.marca === m ? "elegida" : ""} onClick={() => alCambiar({ ...filtros, marca: m })} data-testid="marca"><i aria-hidden="true" />{m ?? t.todasLasMarcas.corto}</button></li>
        ))}
      </ul>
      <button type="button" className="boton coral principal centrado ver-productos" onClick={alCerrar} data-testid="ver-productos">{n === 0 ? t.sinProductosConFiltros.corto : `${t.ver.corto} ${cuantosProductos(n)}`}</button>
    </Hoja>
  );
}

