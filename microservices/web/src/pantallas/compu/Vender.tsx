import { IconoDeMedio } from "../IconoDeMedio";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { SiVeCostos, useVeCostos } from "../Costos";
import { usePuede } from "../permisos";
import { MEDIOS, TEXTOS, type Medio } from "../textos";
import { createPortal } from "react-dom";
import { contarAlEspejo, useEspejar } from "../../espejo";
import { ventaActual } from "../../negocio/ventas/venta-en-curso";
import { precioDe as precioSugerido, useSugeridos } from "../sugeridos";
import { marcarLoQueEntro, useLlegadosDelCelular } from "../../negocio/ventas/llegados-del-celular";
import { NOMBRE_DE_MEDIO, cuentaDelRenglon, precioDe, subtotalDe, useVenta, type Cobro, type Item, type MotivoDeCambio } from "../../negocio/ventas/venta";
import { esMargenBoton } from "../../negocio/precios/vista-previa";
import { precioDelProducto } from "../../negocio/catalogo/precio";
import { useCodigoParaVincular } from "../../negocio/vinculo";
import { abreviarUnidad, cantidadValida, enteras, unidadDe, type Unidad } from "../../unidades";
import { api, ErrorApi, subirFoto, urlDeFoto } from "../../api";
import { guardar, borrarAnterioresA } from "../../almacen";
import { enviarOEncolar, enviarPendientes } from "../../cola";
import { useCatalogo, type Cliente } from "../../catalogo";
import { useTeclasGlobales } from "../../plataforma/teclado/teclas";
import { nombreDeProducto, pesos } from "../../formato";
import { Escaner, hayCamara } from "../../plataforma/camara/Escaner";
import { enviarCodigoAlPuesto, escucharPuesto, EVENTO_EMPAREJAMIENTO, guardarPuestoLocal, pedirLector, puestoLocal, puestoRemoto, soltarEmparejamiento } from "../../puesto";
import type { Producto } from "../celular/pantallas/Productos";
import { describirDispositivo } from "./base/dispositivo";
import { useEsCelular } from "./base/vista";
import { irA } from "./base/rutas";
import { Aviso, Boton, Buscador, Contador, Exito, Explicado, FotoProducto, Hoja, Icono, Margenes, Pagina, Pastilla, Progreso, Toast, Vacio, hora, numero, pesosCortos } from "./base/ui";
import "./base/estilos/vender.css";
import "./base/estilos/vender-mostrador.css";
import { AlLadoDeLasPestanas } from "../AlLadoDeLasPestanas";

// La venta, en el orden del mostrador: buscar → costo, margen y precio → cantidad → cobro.
// Nada obligatorio que el cuaderno no tenga. En la computadora todo sale con el teclado:
// Enter agrega, F5 a F8 eligen cómo paga, F2 (o Enter con la búsqueda vacía) cobra.
const precioDeLista = (p: Producto) => precioDelProducto(p).valor;
const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");
const pasosDeCosto = (p: Producto, costo: number) => (p.explicacion_costo?.length ? p.explicacion_costo : [`Costo ${pesos(costo)} según la lista del proveedor`]);
const iniciales = (nombre: string) => nombre.split(/\s+/).filter((x) => /^[A-ZÁÉÍÓÚÑ]/i.test(x)).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
const soloDigitos = (v: string) => (v === "" ? null : Number(v.replace(/[^\d]/g, "")) || null);

export function Vender() {
  const puedeEsto = usePuede();
  const { catalogo, catalogoCompleto, stock: stockPorId, clientes, error: errorCatalogo, buscarProductos, actualizarProducto, ajustarStockLocal } = useCatalogo();
  const esCelular = useEsCelular();
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const [escaneando, setEscaneando] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState<string | null>(null);
  const [puestoVinculado, setPuestoVinculado] = useState(false);
  const llegados = useLlegadosDelCelular();
  const [eligiendoCliente, setEligiendoCliente] = useState(false);
  const caja = useRef<HTMLInputElement>(null);

  // La venta en sí (renglones, precios, cobrar, «no llevó») está una sola vez, en el negocio:
  // acá va solo lo de esta interfaz: sus textos largos, su foco y sus ventanas.
  const venta = useVenta({
    lado: "computadora", dispositivo: describirDispositivo, fijaMargen: puedeEsto("catalogo.margenes"),
    textoDe: (motivo) => TEXTOS.vender[motivo === "sin-precio" ? "sinPrecio" : motivo === "sin-medio" ? "elegiComoPaga" : "faltaElCliente"].largo,
    textoDeRechazo: (m) => `${m}. La venta sigue armada: corregila y cobrá de nuevo.`,
    alCambiar: useCallback((motivo: MotivoDeCambio) => { if (motivo === "agregar") setConsulta(""); caja.current?.focus(); }, []),
    alFaltarCliente: () => setEligiendoCliente(true),
  });
  const { items, medio, setMedio, clienteId, setClienteId, cliente, total, sinPrecio, mensaje, setMensaje, error, ocupado, codigoDesconocido, setCodigoDesconocido, cobro, agregar, cambiarItem, cambiarUnidad, quitar, elegirMargen, subirFotoDe, elegirSugerencia, elegirMedio, cobrar } = venta;
  // Un código que no es de ningún producto deja la búsqueda limpia, para elegir a cuál asociarlo.
  const agregarPorCodigo = useCallback((codigo: string) => { const conocido = venta.agregarPorCodigo(codigo); setConsulta(""); return conocido; }, [venta.agregarPorCodigo]);
  const noLlevo = () => venta.noLlevo(TEXTOS.vender.noLlevo.largo);
  // Lo que se dice de la venta recién cobrada, con las palabras de la computadora.
  const exito = useMemo(() => cobro && {
    total: cobro.total, encolado: cobro.encolado,
    medio: NOMBRE_DE_MEDIO[cobro.medio] + (cobro.cliente ? ` · ${cobro.cliente}` : ""),
    detalle: cobro.encolado ? "Sin conexión: quedó guardada en este dispositivo y se envía sola cuando vuelva internet." : `${cobro.productos} ${cobro.productos === 1 ? "producto" : "productos"} a las ${hora(cobro.fecha)}. El stock ya se descontó.`,
  }, [cobro]);

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 8) : []), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);

  // El oyente del celular vinculado se crea una vez y tiene que ver siempre la versión nueva.
  const manejarCodigo = useRef(agregarPorCodigo);
  useEffect(() => { manejarCodigo.current = agregarPorCodigo; }, [agregarPorCodigo]);

  const pararPuesto = useRef<(() => void) | null>(null);
  const alVincular = useCallback((puestoId: string) => {
    setPuestoVinculado(true);
    pararPuesto.current?.();
    // Lo que lee el celular como lector se marca «Llegó del celular» un momento (decisión 127).
    pararPuesto.current = escucharPuesto(puestoId, (codigo) => { const antes = ventaActual().items; manejarCodigo.current(codigo); marcarLoQueEntro(antes, ventaActual().items); }, (conectado) => { if (!conectado) setPuestoVinculado(Boolean(puestoLocal())); });
  }, []);
  useEffect(() => {
    // El emparejamiento puede llegar después de abrir la pantalla (se pone al día con el servidor) o soltarse.
    const mirar = () => { const p = puestoLocal(); if (p) alVincular(p.id); else { pararPuesto.current?.(); pararPuesto.current = null; setPuestoVinculado(false); } };
    mirar();
    window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar);
    return () => { window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar); pararPuesto.current?.(); };
  }, [alVincular]);

  const alDetectar = useCallback((codigo: string) => {
    const conocido = manejarCodigo.current(codigo);
    setUltimoEscaneo(conocido ? `${codigo}: agregado` : `${codigo}: no está en el catálogo`);
    if (puestoRemoto()) enviarCodigoAlPuesto(codigo).then((ok) => { if (ok) setUltimoEscaneo((u) => `${u ?? codigo}. Enviado a la computadora.`); });
  }, []);

  function teclasBusqueda(e: KeyboardEvent<HTMLInputElement>) {
    // Sin resultados a la vista, ↑ ↓ no son para elegir uno: recorren la pantalla (flechas.ts).
    if (e.key === "ArrowDown" && resultados.length) { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp" && resultados.length) { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const p = resultados[elegido];
      const texto = consulta.trim();
      if (p) elegirSugerencia(p);
      else if (texto && /^[0-9A-Za-z-]{6,32}$/.test(texto)) agregarPorCodigo(texto);
      else if (texto) agregar(null, texto); // ítem libre
      else void cobrar(); // con la venta armada, el Enter final la cierra
    }
    else if (e.key === "Escape" && consulta) { e.preventDefault(); setConsulta(""); }
  }
  const hayVentana = Boolean(exito) || eligiendoCliente || escaneando;
  useEffect(() => {
    const global = (e: globalThis.KeyboardEvent) => {
      if (hayVentana) return;
      const medioTecla = MEDIOS.find((m) => m.tecla === e.key);
      if (medioTecla) { e.preventDefault(); elegirMedio(medioTecla.valor); }
      else if (e.key === "F2") { e.preventDefault(); void cobrar(); }
    };
    window.addEventListener("keydown", global);
    return () => window.removeEventListener("keydown", global);
  });
  // Flechas y Esc también sin el cursor en la búsqueda (salvo dentro de otro campo).
  useTeclasGlobales(useCallback((e: globalThis.KeyboardEvent) => {
    if (document.activeElement === caja.current || hayVentana) return;
    if (e.key === "ArrowDown" && resultados.length) { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp" && resultados.length) { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Escape") { caja.current?.focus(); }
  }, [resultados.length, hayVentana]), caja.current);

  // Los cuatro últimos productos vendidos, para la venta vacía (decisión 131); se recalculan al cobrar.
  const sugeridos = useSugeridos(catalogo, cobro);
  const vacio = items.length === 0 && !consulta.trim() && !codigoDesconocido;
  // La computadora (decisión 122): el renglón elegido, el panel de la derecha y sus pestañas,
  // el celular que escanea y el aviso con Deshacer.
  const [elegida, setElegida] = useState<string | null>(null);
  const [panel, setPanel] = useState(() => { try { return localStorage.getItem("ferre.panel") !== "oculto"; } catch { return true; } });
  const verPanel = (si: boolean) => { setPanel(si); try { localStorage.setItem("ferre.panel", si ? "visible" : "oculto"); } catch { /* sin almacenamiento */ } };
  const [pestanaPanel, setPestanaPanel] = useState<"donde" | "boleta">("donde");
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: () => void } | null>(null);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 6000); return () => clearTimeout(t); }, [aviso]);
  const lista = useRef<HTMLUListElement>(null);
  // Lo último agregado queda elegido; si se va, el último que quede.
  const claves = items.map((i) => i.clave).join(",");
  const ultimaClave = items.at(-1)?.clave ?? null;
  useEffect(() => { setElegida(ultimaClave); }, [items.length, ultimaClave]);
  useEffect(() => { if (elegida && !items.some((i) => i.clave === elegida)) setElegida(ultimaClave); }, [claves]); // eslint-disable-line react-hooks/exhaustive-deps
  // La marca de las flechas (flechas.ts) también elige el renglón.
  useEffect(() => {
    const el = lista.current; if (!el) return;
    const obs = new MutationObserver(() => { const m = el.querySelector<HTMLElement>("[data-flecha]"); if (m?.dataset.clave) setElegida(m.dataset.clave); });
    obs.observe(el, { attributes: true, subtree: true, attributeFilter: ["data-flecha"] });
    return () => obs.disconnect();
  });
  const vaciar = () => { if (!items.length) return; const copia = items; venta.vaciar(); setAviso({ texto: "Vaciaste la venta", deshacer: () => venta.devolver(copia) }); };
  const quitarConDeshacer = (it: Item) => { const copia = items; quitar(it.clave); setAviso({ texto: `Quitaste ${nombreDeProducto(it.descripcion)}`, deshacer: () => venta.devolver(copia) }); };
  const [escaneandoCelular, setEscaneandoCelular] = useState(false);
  useEffect(() => {
    if (esCelular) return;
    const tecla = (e: globalThis.KeyboardEvent) => {
      if (hayVentana || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "F1") { e.preventDefault(); verPanel(!panel); return; }
      if (e.key === "F9") { e.preventDefault(); setEligiendoCliente(true); return; }
      // F4 es «No llevó» (Esc queda para cerrar el desplegable de la búsqueda, decisión 127).
      if (e.key === "F4") { e.preventDefault(); if (items.length) noLlevo(); return; }
      // Con la búsqueda vacía: + y − cambian la cantidad del renglón elegido y Supr lo quita.
      const foco = document.activeElement;
      const enOtroCampo = foco instanceof HTMLElement && foco !== caja.current && (foco.matches("input, select, textarea") || foco.isContentEditable);
      if (consulta || enOtroCampo) return;
      const it = items.find((i) => i.clave === elegida);
      if ((e.key === "+" || e.key === "-") && it) { e.preventDefault(); const paso = enteras(it.unidad) ? 1 : 0.5; const v = Math.round((it.cantidad + (e.key === "+" ? paso : -paso)) * 10) / 10; if (v > 0) cambiarItem(it.clave, { cantidad: v }); }
      else if (e.key === "Delete" && it) { e.preventDefault(); quitarConDeshacer(it); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });
  const filas = items.map((it) => ({
    item: it, stock: it.producto ? stockPorId.get(it.producto.id) : undefined,
    alCambiar: (c: Partial<Item>) => cambiarItem(it.clave, c), alQuitar: () => quitar(it.clave), alElegirMargen: (m: number) => elegirMargen(it, m),
    alCambiarUnidad: (u: Unidad) => cambiarUnidad(it, u), alSubirFoto: it.producto ? (a: File) => subirFotoDe(it, a) : undefined, marcar: Boolean(error) && sinPrecio,
  }));

  if (!esCelular) {
    const renglonElegido = items.find((i) => i.clave === elegida) ?? null;
    const faltan = items.filter((i) => precioDe(i).unitario === null).length;
    return (
      <Pagina titulo="Vender" testId="vender" className="vender vmc-pagina">
        <div className={`vmc ${panel ? "" : "sin-panel"}`}>
          <div className="vmc-izq">
            <div className="vmc-busqueda">
              <div className="vender-busqueda">
                <Buscador valor={consulta} alCambiar={setConsulta} cajaRef={caja} autoFoco disabled={!catalogo} onKeyDown={teclasBusqueda}
                  placeholder={!catalogo ? "Bajando el catálogo…" : "Buscá por nombre o código, o escaneá"}
                  etiqueta="Buscar un producto para agregarlo a la venta" controla="vender-sugerencias" activo={resultados[elegido] ? `sug-${resultados[elegido]!.id}` : undefined} />
                {resultados.length > 0 && (
                  // El desplegable de la v2 (decisión 126): la foto, el nombre con marca y proveedor, el stock
                  // en su pastilla y el precio; abajo, las teclas y cuántos encontró.
                  <div className="vmc-sug" data-testid="sugerencias">
                    <ul className="vender-sugerencias" id="vender-sugerencias" role="listbox" aria-label="Productos encontrados">
                      {resultados.map((p, i) => {
                        const precio = precioDeLista(p);
                        const stock = stockPorId.get(p.id);
                        return (
                          <li key={p.id} id={`sug-${p.id}`} role="option" aria-selected={i === elegido} className="vmc-sug-r" onMouseDown={(e) => { e.preventDefault(); elegirSugerencia(p); }} onMouseEnter={() => setElegido(i)}>
                            <span className="miniatura">{p.foto_url ? <img src={urlDeFoto(p.foto_url) ?? ""} alt="" loading="lazy" /> : <Icono nombre="productos" tam={18} grosor={1.6} />}</span>
                            <span className="vmc-sug-txt"><span className="nombre">{nombreDeProducto(p.descripcion)}</span><span className="detalle">{detalleDe(p) || "\u00a0"}</span></span>
                            {/* Sin movimientos de stock, no hay: «sin stock», como la maqueta. */}
                            {(stock ?? 0) > 0 ? <Pastilla tipo="ok" sinPunto>{numero(stock!)} {abreviarUnidad(p.unidad ?? "unidad")}</Pastilla> : <Pastilla sinPunto>sin stock</Pastilla>}
                            <span className={precio === null ? "falta-texto" : "importe"}>{precio === null ? "Sin precio" : pesosCortos(precio)}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="vmc-sug-pie" aria-hidden="true">
                      <span><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd> elegir</span><span><kbd className="tecla">Enter</kbd> agrega</span><span><kbd className="tecla">Esc</kbd> cierra</span>
                      <span className="crece" /><span>{resultados.length} {resultados.length === 1 ? "encontrado" : "encontrados"}</span>
                    </div>
                  </div>
                )}
              </div>
              {puestoVinculado && (escaneandoCelular
                ? <div className="vmc-camara" role="status" data-testid="celular-escaneando"><span className="vivo" aria-hidden="true" /><span className="t">El celular está escaneando<small>Lo que lea entra acá</small></span><span className="rec" aria-hidden="true" /><button type="button" onClick={() => setEscaneandoCelular(false)} data-testid="dejar-de-escanear">Detener</button></div>
                : <VincularParaEscanear vinculado alVincular={alVincular} alPedir={() => setEscaneandoCelular(true)} comoV2 />)}
            </div>
            {/* Las teclas que no están en ningún botón, con el aspecto de la v2. */}
            <p className="vender-teclas detalle" data-testid="teclas">
              <span><kbd className="tecla">Enter</kbd> agrega</span><span><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd> eligen el renglón</span>
              <span><kbd className="tecla">+</kbd><kbd className="tecla">−</kbd> cantidad</span><span><kbd className="tecla">Supr</kbd> quita</span><span><kbd className="tecla">F1</kbd> panel</span>
            </p>
            {!catalogo && !errorCatalogo && <Progreso texto="Bajando el catálogo por primera vez. Después se busca al instante, también sin internet." />}
            <Aviso tipo="error">{errorCatalogo}</Aviso>
            {codigoDesconocido && (
              <Aviso tipo="alerta" testId="codigo-desconocido" accion={<Boton tam="chico" onClick={() => setCodigoDesconocido(null)}>Ignorar</Boton>}>
                El código <code>{codigoDesconocido}</code> no está en el catálogo. Buscá el producto y elegilo: el código le queda asociado.
              </Aviso>
            )}
            {consulta.trim() && resultados.length === 0 && catalogo && (
              <div className="lista" data-sin-flechas>
                <button type="button" className="renglon" onClick={() => agregar(null, consulta.trim())} data-testid="agregar-libre">
                  <span className="nombre">Agregar «{consulta.trim()}» como ítem libre</span><Icono nombre="mas" />
                  <span className="detalle">No está en ninguna lista. Le ponés el precio a mano. Enter lo agrega.</span>
                </button>
              </div>
            )}
            <div className="vmc-cab" data-testid="titulo-venta">
              <h2>Esta venta</h2><span className="vmc-cuenta">{items.length} {items.length === 1 ? "producto" : "productos"}</span>
              {/* Cuántos precios faltan, al lado de la cuenta y no en la barra del cobro (decisión 126). */}
              {faltan > 0 && <span className="vmc-cuenta falta" data-testid="faltan-precios">Falta{faltan > 1 ? `n ${faltan} precios` : " 1 precio"}</span>}
              <span className="crece" />
              {/* Con la venta vacía no hay nada que anotar ni vaciar: no se muestran (decisión 126). */}
              {items.length > 0 && <>
                <Boton tam="chico" icono="prohibido" className="vmc-fantasma" onClick={noLlevo} aria-keyshortcuts="F4" data-testid="no-llevo">No llevó <kbd className="tecla">F4</kbd></Boton>
                <Boton tam="chico" icono="basura" className="vmc-fantasma" onClick={vaciar} data-testid="vaciar-venta">Vaciar</Boton>
              </>}
            </div>
            {items.length === 0 ? (
              <>
                {/* La venta vacía, como la maqueta (decisión 131): el recuadro gris con el carrito y,
                    debajo, los cuatro últimos productos vendidos, que se agregan con un clic. */}
                <div className="vmc-vacia" data-testid="venta-vacia">
                  <span className="vmc-vacia-icono" aria-hidden="true"><Icono nombre="vender" tam={26} /></span>
                  <b>La venta está vacía</b>
                  <span>Buscá por nombre o código, escaneá con el lector o con el celular.</span>
                </div>
                {sugeridos.ultimos.length > 0 && (
                  <section className="vmc-ultimos" aria-label="Lo último que se vendió" data-testid="sugeridos-ultimos">
                    <h2>Lo último que se vendió</h2>
                    <ul data-sin-flechas>
                      {sugeridos.ultimos.map((p) => {
                        const precio = precioSugerido(p);
                        return (
                          <li key={p.id}>
                            <button type="button" className="vmc-ultimo" onClick={() => agregar(p)}>
                              <span className="miniatura">{p.foto_url ? <img src={urlDeFoto(p.foto_url) ?? ""} alt="" loading="lazy" /> : <Icono nombre="productos" tam={20} grosor={1.6} />}</span>
                              <span className="vmc-ultimo-txt"><span className="nombre">{nombreDeProducto(p.descripcion)}</span><span className={precio === null ? "falta-texto" : "importe"}>{precio === null ? "Sin precio" : pesosCortos(precio)}</span></span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </>
            ) : (
              <ul className="lista vmc-items" ref={lista} data-testid="venta">
                {filas.map((f) => <RenglonDeVenta key={f.item.clave} {...f} alQuitar={() => quitarConDeshacer(f.item)} elegido={f.item.clave === elegida} alElegir={() => setElegida(f.item.clave)} llegado={llegados.has(f.item.clave)} />)}
              </ul>
            )}
          </div>
          {!panel && (
            <button type="button" className="vmc-abrir-panel" onClick={() => verPanel(true)} aria-keyshortcuts="F1" title="Mostrar el panel (F1)" data-testid="abrir-panel">
              <Icono nombre="izquierda" tam={18} /><span>De dónde sale · Boleta</span><kbd className="tecla">F1</kbd>
            </button>
          )}
          {panel && (
            <aside className={`vmc-panel ${pestanaPanel === "boleta" ? "con-boleta" : ""}`} aria-label="Panel de la venta" data-testid="panel">
              <div className="vmc-panel-cab" role="tablist">
                <button type="button" role="tab" aria-selected={pestanaPanel === "donde"} onClick={() => setPestanaPanel("donde")} data-testid="panel-donde"><Icono nombre="calculadora" tam={16} />De dónde sale</button>
                <button type="button" role="tab" aria-selected={pestanaPanel === "boleta"} onClick={() => setPestanaPanel("boleta")} data-testid="panel-boleta"><Icono nombre="archivo" tam={16} />Boleta</button>
                <button type="button" className="vmc-ocultar" onClick={() => verPanel(false)} aria-label="Ocultar el panel" title="Ocultar el panel (F1)" aria-keyshortcuts="F1" data-testid="ocultar-panel"><Icono nombre="ocultar-panel" tam={20} grosor={1.9} /></button>
              </div>
              <div className="vmc-panel-cuerpo" role="tabpanel">
                {pestanaPanel === "donde" ? <DeDondeSale item={renglonElegido} /> : <Boleta items={items} total={total} />}
              </div>
            </aside>
          )}
        </div>

        <section className="vmc-cobro" aria-label="Cobro" data-testid="cobro">
          {aviso && (
            // Como la maqueta (decisión 133): verde oscuro, con el tacho si se quitó algo, y «Deshacer». Se va solo.
            <div className="vmc-aviso" role="status" data-testid="mensaje">
              <Icono nombre={aviso.deshacer ? "basura" : "prohibido"} tam={20} />
              <span>{aviso.texto}</span>
              {aviso.deshacer && <button type="button" onClick={() => { aviso.deshacer!(); setAviso(null); }}>Deshacer</button>}
            </div>
          )}
          {error && <div className="vender-cobro-aviso"><Aviso tipo="error" testId="error-cobro">{error}</Aviso></div>}
          <div className="vmc-medios" role="radiogroup" aria-label="Cómo paga">
            {MEDIOS.map((m) => (
              <button key={m.valor} type="button" role="radio" aria-checked={medio === m.valor} aria-keyshortcuts={m.tecla} className={`vmc-medio medio-${m.valor}`} title={m.nombre} aria-label={m.nombre} onClick={() => elegirMedio(m.valor)} data-testid={`medio-${m.valor}`}>
                <IconoDeMedio medio={m.valor} tam={18} />{m.corto}<kbd className="tecla">{m.tecla}</kbd>
              </button>
            ))}
            <button type="button" className={`vmc-cliente ${cliente ? "elegido" : medio === "cuenta_corriente" ? "falta" : ""}`} onClick={() => setEligiendoCliente(true)} aria-keyshortcuts="F9" data-testid="cliente">
              {cliente ? <span className="vmc-iniciales" aria-hidden="true">{iniciales(cliente.nombre)}</span> : <Icono nombre="usuarios" tam={16} />}<span>{cliente ? cliente.nombre : medio === "cuenta_corriente" ? "Elegí el cliente" : "Cliente"}</span><kbd className="tecla">F9</kbd>
            </button>
          </div>
          <Boton variante="principal" tam="grande" disabled={ocupado || !items.length} onClick={() => void cobrar()} tecla="F2" data-testid="cobrar">{ocupado ? "Cobrando…" : <>Cobrar <span className="importe" data-testid="total">{pesosCortos(total)}</span></>}</Boton>
        </section>

        <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
        {eligiendoCliente && <ElegirCliente clientes={clientes} elegido={clienteId} soloCuentaCorriente={medio === "cuenta_corriente"} alCerrar={() => setEligiendoCliente(false)} alElegir={(id) => { setClienteId(id); setEligiendoCliente(false); }} />}
        {cobro && <VentaRegistrada cobro={cobro} alVerHoy={() => { venta.cerrarCobro(); irA("hoy"); }} alCerrar={() => { venta.cerrarCobro(); setTimeout(() => caja.current?.focus(), 0); }} />}
      </Pagina>
    );
  }

  return (
    <Pagina titulo="Vender" testId="vender" className={`vender ${items.length ? "con-cobro" : ""}`}
      acciones={<AlLadoDeLasPestanas>
        <div className="fila envuelve">
          {/* Sin celular emparejado, «Vincular el celular» está en el menú lateral, siempre a la vista. */}
          {!esCelular && puestoVinculado && <VincularParaEscanear vinculado={puestoVinculado} alVincular={alVincular} />}
          {puestoRemoto() && <span data-testid="celular-vinculado-remoto"><Pastilla tipo="ok">Vinculado a la computadora</Pastilla></span>}
        </div>
      </AlLadoDeLasPestanas>}>
      <div className="vender-busqueda">
        <Buscador valor={consulta} alCambiar={setConsulta} cajaRef={caja} autoFoco disabled={!catalogo} onKeyDown={teclasBusqueda}
          placeholder={!catalogo ? "Bajando el catálogo…" : esCelular ? "Buscar producto o código" : "Escribí el nombre del producto o el código"}
          etiqueta="Buscar un producto para agregarlo a la venta" controla="vender-sugerencias" activo={resultados[elegido] ? `sug-${resultados[elegido]!.id}` : undefined}
          alEscanear={esCelular && hayCamara() ? () => setEscaneando(true) : undefined} />
        {resultados.length > 0 && (
          <ul className="lista vender-sugerencias" id="vender-sugerencias" role="listbox" aria-label="Productos encontrados" data-testid="sugerencias">
            {resultados.map((p, i) => {
              const precio = precioDeLista(p);
              const stock = stockPorId.get(p.id);
              return (
                <li key={p.id} id={`sug-${p.id}`} role="option" aria-selected={i === elegido} className="renglon con-foto elegible" onMouseDown={(e) => { e.preventDefault(); elegirSugerencia(p); }} onMouseEnter={() => setElegido(i)}>
                  <span className="miniatura">{p.foto_url ? <img src={urlDeFoto(p.foto_url) ?? ""} alt="" loading="lazy" /> : <Icono nombre="productos" tam={18} grosor={1.6} />}</span>
                  <span className="nombre">{nombreDeProducto(p.descripcion)}</span>
                  <span className={precio === null ? "falta-texto" : "importe"}>{precio === null ? "sin precio" : pesosCortos(precio)}</span>
                  <span className="detalle">{detalleDe(p)}{stock !== undefined ? `${detalleDe(p) ? " · " : ""}stock ${numero(stock)}` : ""}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {!catalogo && !errorCatalogo && <Progreso texto="Bajando el catálogo por primera vez. Después se busca al instante, también sin internet." />}

      <Aviso tipo="error">{errorCatalogo}</Aviso>
      {codigoDesconocido && (
        <Aviso tipo="alerta" testId="codigo-desconocido" accion={<Boton tam="chico" onClick={() => setCodigoDesconocido(null)}>Ignorar</Boton>}>
          El código <code>{codigoDesconocido}</code> no está en el catálogo. Buscá el producto y elegilo: el código le queda asociado.
        </Aviso>
      )}
      {consulta.trim() && resultados.length === 0 && catalogo && (
        <div className="lista" data-sin-flechas>
          <button type="button" className="renglon" onClick={() => agregar(null, consulta.trim())} data-testid="agregar-libre">
            <span className="nombre">Agregar «{consulta.trim()}» como ítem libre</span><Icono nombre="mas" />
            <span className="detalle">No está en ninguna lista. Le ponés el precio a mano.{!esCelular && " Enter lo agrega."}</span>
          </button>
        </div>
      )}

      {vacio && (
        <Vacio icono="vender" titulo="Venta nueva">
          {esCelular ? "Escribí el nombre del producto o escaneá el código de barras." : "Escribí el nombre del producto o el código y apretá Enter. También podés escanear con el celular vinculado."}
        </Vacio>
      )}

      {/* Siguen a la vista con la venta empezada, para sumar otro producto de un clic. */}

      {items.length > 0 && <ul className="vender-items" data-testid="venta">{filas.map((f) => <TarjetaDeVenta key={f.item.clave} {...f} />)}</ul>}

      {items.length > 0 && (
        <section className="vender-cobro sobre-oscuro" aria-label="Cobro" data-testid="cobro">
          {error && <div className="vender-cobro-aviso"><Aviso tipo="error" testId="error-cobro">{error}</Aviso></div>}
          <div className="vender-total"><span>Total</span><strong className="importe total" data-testid="total">{pesosCortos(total)}</strong></div>
          <div className="vender-medios" role="radiogroup" aria-label="Cómo paga">
            {MEDIOS.map((m) => (
              <Boton key={m.valor} variante="sobre-marino" role="radio" aria-checked={medio === m.valor} aria-keyshortcuts={m.tecla} onClick={() => elegirMedio(m.valor)} data-testid={`medio-${m.valor}`}>
                {!esCelular && <span className="tecla" aria-hidden="true">{m.tecla}</span>}<IconoDeMedio medio={m.valor} tam={16} conFondo className="chico" />{esCelular ? m.corto : m.nombre}
              </Boton>
            ))}
          </div>
          {medio === "cuenta_corriente" && (
            <Boton variante="sobre-marino" className={`vender-cliente ${cliente ? "" : "falta"}`} icono="usuarios" onClick={() => setEligiendoCliente(true)} data-testid="cliente">{cliente ? cliente.nombre : "Elegí el cliente"}</Boton>
          )}
          <div className="vender-acciones">
            <Boton variante="sobre-marino" onClick={noLlevo} data-testid="no-llevo">No llevó <kbd className="tecla">F4</kbd></Boton>
            <Boton variante="principal" tam="grande" disabled={ocupado} onClick={() => void cobrar()} tecla="F2" data-testid="cobrar">{ocupado ? "Cobrando…" : esCelular ? `Cobrar ${pesosCortos(total)}` : "Cobrar"}</Boton>
          </div>
        </section>
      )}

      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      {escaneando && <Escaner alDetectar={alDetectar} alCerrar={() => setEscaneando(false)} ultimo={ultimoEscaneo} />}
      {eligiendoCliente && <ElegirCliente clientes={clientes} elegido={clienteId} alCerrar={() => setEligiendoCliente(false)} alElegir={(id) => { setClienteId(id); setMedio("cuenta_corriente"); setEligiendoCliente(false); }} />}
      {exito && (
        <Exito que={exito.encolado ? "Venta guardada en este dispositivo" : "Venta registrada"} importe={pesosCortos(exito.total)} medio={exito.medio} detalle={exito.detalle} boton="Nueva venta"
          alCerrar={() => { venta.cerrarCobro(); setTimeout(() => caja.current?.focus(), 0); }} />
      )}
    </Pagina>
  );
}

type PropsDeRenglon = {
  item: Item; stock: number | undefined; marcar: boolean; alCambiar: (c: Partial<Item>) => void; alQuitar: () => void; alElegirMargen: (m: number) => void;
  alCambiarUnidad: (u: Unidad) => void; alSubirFoto?: (archivo: File) => Promise<void>;
};

function useRenglon(it: Item) {
  const p = precioDe(it);
  const renglon = subtotalDe(it);
  const margenTexto = it.precioManual !== null ? "precio a mano" : p.margen === null ? "elegí el margen" : `margen ${p.margen} %${esMargenBoton(p.margen) ? "" : " a mano"}`;
  return { p, renglon, margenTexto };
}
const StockDeRenglon = ({ stock, cantidad }: { stock: number | undefined; cantidad: number }) => (stock === undefined ? null : (
  <>stock {numero(stock)}{stock - cantidad < 0 && <> <Pastilla tipo="alerta" sinPunto>{TEXTOS.vender.stockNoAlcanza.largo}</Pastilla></>}</>
));
function PrecioAMano({ item, alCambiar, falta, id, enfocar }: { item: Item; alCambiar: (c: Partial<Item>) => void; falta?: boolean; id?: string; enfocar?: boolean }) {
  return (
    <label className={`con-prefijo vender-a-mano ${falta ? "falta" : ""}`} title="Un precio distinto solo para esta venta. No cambia el producto.">
      <span aria-hidden="true">$</span>
      <input id={id} inputMode="numeric" placeholder="a mano" aria-label={`Precio a mano de ${item.descripcion || "este ítem"}, solo para esta venta`} autoFocus={enfocar || (!item.producto && item.precioManual === null)}
        value={item.precioManual ?? ""} onChange={(e) => alCambiar({ precioManual: soloDigitos(e.target.value) })} data-testid="precio-manual" />
    </label>
  );
}

// «Precio a mano» en la computadora, como la maqueta (decisión 127): una ventana con el producto,
// la caja con el «$» y «Poner el precio» (Enter). Vale solo para esta venta.
function HojaPrecioAMano({ item, alPoner, alCerrar }: { item: Item; alPoner: (v: number | null) => void; alCerrar: () => void }) {
  const [valor, setValor] = useState<number | null>(item.precioManual);
  const poner = () => { if (valor !== null) alPoner(valor); };
  // El diálogo pone el foco en su primer botón (la ×): la caja lo toma apenas se abre.
  const caja = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => { caja.current?.focus(); caja.current?.select(); }, 0); return () => clearTimeout(t); }, []);
  return (
    <Hoja titulo="Precio a mano" alCerrar={alCerrar} testId="hoja-precio-manual" bajoTitulo={<span className="detalle">{nombreDeProducto(item.descripcion)}</span>}
      pie={<><Boton onClick={alCerrar}>Cancelar</Boton><Boton variante="principal" disabled={valor === null} onClick={poner} data-testid="poner-precio">Poner el precio <kbd className="tecla">Enter</kbd></Boton></>}>
      <form onSubmit={(e) => { e.preventDefault(); poner(); }}>
        <label className="con-prefijo vmc-precio-grande">
          <span aria-hidden="true">$</span>
          <input ref={caja} inputMode="numeric" aria-label={`Precio a mano de ${item.descripcion}, solo para esta venta`} value={valor === null ? "" : numero(valor)}
            onChange={(e) => setValor(soloDigitos(e.target.value))} data-testid="precio-manual" />
        </label>
      </form>
      <p className="detalle">Vale solo para esta venta: no cambia el margen guardado. Se cobra tal cual, sin redondear.</p>
    </Hoja>
  );
}

// Computadora (decisión 122): cada renglón, una tarjeta de la v2. Arriba la foto, el nombre con
// marca, proveedor y stock, la cantidad con su unidad, el total del renglón y el tacho; abajo el
// costo, el margen y el precio por unidad (o a mano). Elegirlo lo muestra en «De dónde sale».
function RenglonDeVenta({ item: it, stock, marcar, alCambiar, alQuitar, alElegirMargen, alCambiarUnidad, alSubirFoto, elegido, alElegir, llegado }: PropsDeRenglon & { elegido: boolean; alElegir: () => void; llegado: boolean }) {
  const { p, renglon } = useRenglon(it);
  const producto = it.producto;
  const sinPrecio = p.unitario === null;
  const raiz = useRef<HTMLLIElement>(null);
  const noAlcanza = stock !== undefined && it.cantidad > stock;
  const [aMano, setAMano] = useState(false);
  return (
    <li ref={raiz} className={`vmc-item ${sinPrecio ? "sin-precio" : ""} ${sinPrecio && marcar ? "marcada" : ""} ${elegido ? "elegido" : ""}`} data-testid="item" data-clave={it.clave} onMouseDown={alElegir} onFocusCapture={alElegir}>
      {llegado && <span className="vmc-llego" role="status" data-testid="llego-del-celular"><Icono nombre="celular" tam={16} />Llegó del celular</span>}
      <div className="vmc-foto">{producto ? <FotoProducto id={producto.id} url={producto.foto_url ?? null} descripcion={it.descripcion} alSubir={alSubirFoto} /> : <span className="miniatura"><Icono nombre="editar" tam={18} grosor={1.6} /></span>}</div>
      <div className="vmc-nombre">
        {/* Enter sobre el renglón marcado pone el cursor en su cantidad. */}
        {producto ? <button type="button" className="nombre" data-principal onClick={() => raiz.current?.querySelector<HTMLInputElement>("[data-testid='cantidad']")?.focus()}>{nombreDeProducto(it.descripcion)}</button>
          : <input className="entrada" value={it.descripcion} placeholder="¿Qué se lleva?" aria-label="Descripción del ítem libre" onChange={(e) => alCambiar({ descripcion: e.target.value })} data-testid="descripcion-libre" />}
        <div className="detalle">{producto ? <>{detalleDe(producto)}<>{detalleDe(producto) ? " · " : ""}{(stock ?? 0) <= 0 ? <Pastilla tipo="alerta" sinPunto>sin stock</Pastilla> : noAlcanza ? <Pastilla tipo="alerta" sinPunto>{`hay ${numero(stock!)}: no alcanza`}</Pastilla> : <Pastilla tipo="ok" sinPunto>{numero(stock!)} {abreviarUnidad(it.unidad)}</Pastilla>}</></> : "Ítem libre: no está en ninguna lista"}</div>
      </div>
      <Contador valor={it.cantidad} entera={enteras(it.unidad)} alCambiar={(v) => alCambiar({ cantidad: v })} unidad={it.unidad} alCambiarUnidad={alCambiarUnidad} etiqueta={`Cantidad de ${it.descripcion}`} />
      <div className="vmc-sub" data-testid="subtotal">
        {renglon ? <span className="importe">{pesosCortos(renglon.valor)}</span> : <span className="falta-texto" data-testid="sin-precio">Sin precio</span>}
        <small>{sinPrecio ? (producto && p.costo !== null ? "elegí el margen" : "poné el precio") : `${numero(it.cantidad)} × ${pesosCortos(p.unitario!)}`}</small>
      </div>
      {/* El tacho, a la derecha del precio (Carlos, 2026-10-20; decisión 132). */}
      <button type="button" className="vmc-tacho" title="Quitar de la venta" aria-label={`Quitar ${it.descripcion || "el ítem"}`} onClick={alQuitar} data-testid="quitar-renglon"><Icono nombre="basura" tam={20} /></button>
      <div className="vmc-fila2">
        {producto && p.costo !== null && <SiVeCostos><span>Costo <b className="vmc-valor">{pesos(p.costo)}</b></span><span className="vmc-sep" /></SiVeCostos>}
        {producto && p.costo !== null && <><span className={sinPrecio ? "falta-texto" : ""}>Margen</span><Margenes compacto sinSigno elegido={it.precioManual === null ? p.margen : null} alElegir={alElegirMargen} etiqueta={`Margen de ${it.descripcion}`} /><span>%</span><span className="vmc-sep" /></>}
        {/* El precio por unidad, una sola vez: con «a mano» a su lado, que lo cambia por la caja. La cuenta está en «De dónde sale». */}
        {/* El precio por unidad, una sola vez (decisión 127). Con un precio a mano, el botón «A mano $X»
            (como la maqueta), que vuelve a abrir la caja; elegir un margen vuelve al precio del margen. */}
        <span className="vmc-precio">
          {!producto
            ? <>Precio <PrecioAMano item={it} alCambiar={alCambiar} falta={sinPrecio} /></>
            : it.precioManual !== null
              ? <button type="button" className="vmc-a-mano grande" onClick={() => setAMano(true)} title="Precio a mano, solo para esta venta: tocá para cambiarlo" data-testid="habilitar-precio-manual"><Icono nombre="editar" tam={16} />A mano {pesosCortos(it.precioManual)}</button>
              : sinPrecio
                // Sin precio, como la maqueta: el botón «Precio a mano» en lugar del precio.
                ? <button type="button" className="vmc-a-mano grande" onClick={() => setAMano(true)} title="Un precio distinto solo para esta venta" data-testid="habilitar-precio-manual"><Icono nombre="editar" tam={16} />Precio a mano</button>
                : <>Precio <b className="vmc-valor">{pesosCortos(p.unitario!)}</b>
                    <button type="button" className="vmc-a-mano fantasma" onClick={() => setAMano(true)} title="Un precio distinto solo para esta venta" data-testid="habilitar-precio-manual"><Icono nombre="editar" tam={16} />Precio a mano</button>
                  </>}
          {aMano && <HojaPrecioAMano item={it} alPoner={(v) => { alCambiar({ precioManual: v }); setAMano(false); }} alCerrar={() => setAMano(false)} />}
        </span>
      </div>
    </li>
  );
}

// «De dónde sale» (de la v3): la cuenta del renglón elegido, paso a paso, siempre a la vista.
function DeDondeSale({ item }: { item: Item | null }) {
  const veCostos = useVeCostos();
  if (!item) return <p className="detalle">Elegí un renglón para ver de dónde sale su precio.</p>;
  const cuenta = cuentaDelRenglon(item, veCostos);
  if (!cuenta) return <><p className="detalle">{nombreDeProducto(item.descripcion)}</p><Aviso tipo="alerta">Todavía no tiene precio: elegí el margen o ponelo a mano.</Aviso></>;
  // Como la maqueta (decisión 127): cada paso con su importe a la derecha, separados por una línea punteada.
  return (
    <div className="vmc-donde" data-testid="de-donde-sale">
      <p className="detalle">{nombreDeProducto(item.descripcion)}, el renglón elegido</p>
      <dl className="vmc-cuenta-filas">{cuenta.filas.map((f, i) => <div key={i}><dt>{f.texto}</dt><dd>{f.valor}</dd></div>)}</dl>
      <div className="vmc-donde-total"><span>Total del renglón</span><strong className="importe">{pesosCortos(cuenta.total)}</strong></div>
    </div>
  );
}

// La boleta (de la v4): la venta como un ticket de mostrador.
function Boleta({ items, total }: { items: Item[]; total: number }) {
  return (
    <div className="vmc-boleta" data-testid="boleta">
      <div className="vmc-boleta-cab"><b>Boleta de mostrador</b><span className="detalle">{hora(new Date().toISOString())}</span></div>
      {items.length === 0 ? <p className="detalle">La boleta está vacía.</p> : items.map((it) => {
        const p = precioDe(it); const r = subtotalDe(it);
        return (
          <div key={it.clave} className={`vmc-linea ${p.unitario === null ? "falta" : ""}`}>
            <span className="q">{numero(it.cantidad)}{it.unidad === "unidad" ? " ×" : ` ${abreviarUnidad(it.unidad)}`}</span>
            <span className="nm">{nombreDeProducto(it.descripcion)}<small>{p.unitario === null ? "Sin precio" : `${pesosCortos(p.unitario)} ${it.unidad === "unidad" ? "c/u" : `el ${abreviarUnidad(it.unidad)}`}${it.precioManual !== null ? " · a mano" : p.margen !== null ? ` · margen ${p.margen} %` : ""}`}</small></span>
            <span className="im">{r ? pesosCortos(r.valor) : "—"}</span>
          </div>
        );
      })}
      <div className="vmc-boleta-total"><span>Total<small>{items.length} {items.length === 1 ? "producto" : "productos"}</small></span><strong className="importe">{pesosCortos(total)}</strong></div>
    </div>
  );
}

// La venta registrada (como en el celular): el total, el medio, cuántos productos y la hora;
// «Seguir vendiendo» (Enter) y «Ver en Ventas de hoy». Sin conexión, que se envía sola.
function VentaRegistrada({ cobro, alCerrar, alVerHoy }: { cobro: Cobro; alCerrar: () => void; alVerHoy: () => void }) {
  const que = cobro.encolado ? "Guardada en este dispositivo" : "Venta registrada";
  return (
    <Hoja titulo={que} alCerrar={alCerrar} testId="exito"
      pie={<><Boton icono="ventas" onClick={alVerHoy} data-testid="ver-en-hoy">Ver en Ventas de hoy</Boton><Boton variante="marino" autoFocus onClick={alCerrar} data-testid="cerrar-exito">Seguir vendiendo</Boton></>}>
      <div className="vmc-listo">
        <span className={`vmc-listo-tilde ${cobro.encolado ? "pendiente" : ""}`}><Icono nombre={cobro.encolado ? "nube" : "tilde"} tam={34} grosor={3} /></span>
        <strong className="importe vmc-listo-total" data-testid="exito-total">{pesosCortos(cobro.total)}</strong>
        {cobro.encolado && <Aviso tipo="alerta">Sin conexión: quedó guardada en este dispositivo y se envía sola cuando vuelva internet.</Aviso>}
        <p className="detalle"><IconoDeMedio medio={cobro.medio} tam={16} />{NOMBRE_DE_MEDIO[cobro.medio]}{cobro.cliente ? ` · ${cobro.cliente}` : ""} · {cobro.productos} {cobro.productos === 1 ? "producto" : "productos"} · {hora(cobro.fecha)}{cobro.encolado ? "" : ". El stock ya se descontó."}</p>
      </div>
    </Hoja>
  );
}

// Celular: cada renglón es una tarjeta. Si no tiene precio, los márgenes ya están a la vista.
function TarjetaDeVenta({ item: it, stock, marcar, alCambiar, alQuitar, alElegirMargen, alCambiarUnidad, alSubirFoto }: PropsDeRenglon) {
  const { p, renglon, margenTexto } = useRenglon(it);
  const producto = it.producto;
  const sinPrecio = p.unitario === null;
  const abierto = it.abierto || (sinPrecio && Boolean(producto));
  return (
    <li className={`tarjeta vender-item ${sinPrecio ? "sin-precio" : ""} ${sinPrecio && marcar ? "marcada" : ""}`} data-testid="item">
      <div className="vender-item-cabeza">
        {producto ? <FotoProducto id={producto.id} url={producto.foto_url ?? null} descripcion={producto.descripcion} alSubir={alSubirFoto} /> : <span className="miniatura"><Icono nombre="editar" tam={18} grosor={1.6} /></span>}
        <div className="crece pila junta">
          {producto ? <span className="nombre">{nombreDeProducto(it.descripcion)}</span>
            : <input className="entrada" value={it.descripcion} placeholder="¿Qué se lleva?" aria-label="Descripción del ítem libre" onChange={(e) => alCambiar({ descripcion: e.target.value })} data-testid="descripcion-libre" />}
          <span className="detalle">{producto ? <>{detalleDe(producto)}{detalleDe(producto) && stock !== undefined ? " · " : ""}<StockDeRenglon stock={stock} cantidad={it.cantidad} /></> : "Ítem libre"}</span>
        </div>
        <span data-testid="subtotal">{renglon ? <Explicado conCosto className="importe" valor={pesosCortos(renglon.valor)} pasos={[...p.pasos, ...renglon.pasos]} etiqueta={`Subtotal ${pesosCortos(renglon.valor)}`} /> : !producto ? <PrecioAMano item={it} alCambiar={alCambiar} falta /> : <span className="falta-texto" data-testid="sin-precio">sin precio</span>}</span>
      </div>
      <div className="vender-item-pie">
        <Contador valor={it.cantidad} entera={enteras(it.unidad)} alCambiar={(v) => alCambiar({ cantidad: v })} unidad={it.unidad} alCambiarUnidad={alCambiarUnidad} />
        <span className="crece" />
        {producto && p.costo !== null && !sinPrecio && (
          <Boton onClick={() => alCambiar({ abierto: !it.abierto })} aria-expanded={abierto} data-testid="margen">{margenTexto}<Icono nombre={abierto ? "arriba" : "abajo"} tam={16} grosor={2.4} /></Boton>
        )}
        <Boton icono="basura" aria-label={`Quitar ${it.descripcion || "el ítem"}`} onClick={alQuitar} />
      </div>
      {abierto && producto && p.costo !== null && (
        <div className="vender-item-margen">
          <div className="fila">
            <SiVeCostos><span className="crece"><Explicado valor={`Costo ${pesos(p.costo)}`} pasos={pasosDeCosto(producto, p.costo)} /></span></SiVeCostos>
            {p.unitario !== null && <span className="detalle">{pesosCortos(p.unitario)} c/u</span>}
          </div>
          {sinPrecio && <p className="falta-texto">Elegí el margen o poné el precio a mano.</p>}
          <Margenes elegido={it.precioManual === null ? p.margen : null} alElegir={alElegirMargen} etiqueta={`Margen de ${it.descripcion}`} />
          <div className="fila">
            <label className="crece detalle" htmlFor={`mano-${it.clave}`}>Otro precio, solo para esta venta</label>
            <PrecioAMano item={it} alCambiar={alCambiar} id={`mano-${it.clave}`} />
          </div>
        </div>
      )}
    </li>
  );
}

// Cuenta corriente: el cliente se busca escribiendo; cada uno dice cuánto debe.
function ElegirCliente({ clientes, elegido, alElegir, alCerrar, soloCuentaCorriente = true }: { clientes: Cliente[]; elegido: string; alElegir: (id: string) => void; alCerrar: () => void; soloCuentaCorriente?: boolean }) {
  const [filtro, setFiltro] = useState("");
  const [marcado, setMarcado] = useState(0);
  const f = filtro.trim().toLowerCase();
  const visibles = clientes.filter((c) => (!soloCuentaCorriente || c.cuenta_corriente !== false) && (!f || c.nombre.toLowerCase().includes(f)));
  useEffect(() => { setMarcado(0); }, [filtro]);
  return (
    <Hoja titulo={soloCuentaCorriente ? TEXTOS.vender.quienLleva.largo : "Cliente de la venta (opcional)"} alCerrar={alCerrar} testId="hoja-clientes"
      pie={elegido ? <Boton onClick={() => alElegir("")} data-testid="sin-cliente">Sin cliente</Boton> : undefined}>
      {clientes.length === 0 ? (
        <Vacio icono="usuarios" titulo="Todavía no hay clientes con cuenta corriente">Mientras tanto, cobrá con otro medio de pago. Los clientes con cuenta corriente se cargan desde Clientes, que todavía no está en esta versión.</Vacio>
      ) : (
        <>
          <input className="entrada" type="search" autoFocus value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Escribí el nombre del cliente" aria-label="Buscar cliente por nombre" autoComplete="off" data-testid="buscar-cliente"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((i) => Math.min(i + 1, visibles.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter" && visibles[marcado]) { e.preventDefault(); alElegir(visibles[marcado]!.id); }
            }} />
          {visibles.length === 0 && <p className="detalle">Ningún cliente con «{filtro}». Probá con menos letras.</p>}
          <ul className="lista">
            {visibles.map((c, i) => (
              <li key={c.id}>
                <button type="button" className={`renglon ${i === marcado || c.id === elegido ? "elegido" : ""}`} onClick={() => alElegir(c.id)} data-testid="cliente-opcion">
                  <span className="nombre">{c.nombre}</span>
                  {Number(c.deuda) > 0 ? <Pastilla tipo="alerta" sinPunto>debe {pesosCortos(c.deuda)}</Pastilla> : <Pastilla tipo="ok" sinPunto>al día</Pastilla>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Hoja>
  );
}

// En la computadora: un QR que el celular lee con su cámara. Queda vinculado 12 horas y lo
// que escanea aparece en esta venta.
// `comoV2`: en Vender, el botón verde oscuro de la v2, del alto de la búsqueda y con el ícono de escanear.
export function VincularParaEscanear({ vinculado, alVincular, alPedir, comoV2 = false }: { vinculado: boolean; alVincular: (puestoId: string) => void; alPedir?: () => void; comoV2?: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const codigo = useCodigoParaVincular((id) => { setAbierta(false); alVincular(id); }, { ancho: 260, oscuro: "#0f1e36" });
  const { qr, vencido, error } = codigo;
  async function generar() { setAbierta(true); await codigo.generar(); }
  function cerrar() { codigo.cerrar(); setAbierta(false); }
  // Con el celular emparejado no hay código que leer: se le pide que abra el lector (decisión 59).
  const [pedido, setPedido] = useState<"si" | "no" | null>(null);
  async function pedir() { const ok = await pedirLector(); setPedido(ok ? "si" : "no"); if (ok) alPedir?.(); }
  useEffect(() => { if (!pedido) return; const t = setTimeout(() => setPedido(null), 20000); return () => clearTimeout(t); }, [pedido]);

  if (vinculado) {
    return (
      <span className="fila" data-testid="celular-vinculado">
        <Boton icono={comoV2 ? "escanear" : "celular"} className={comoV2 ? "vmc-escanear" : undefined} onClick={() => void pedir()} data-testid="pedir-lector">Escanear con el celular</Boton>
        {pedido === "si" && <Pastilla tipo="ok"><span data-testid="lector-pedido">Abrí Ferrebress en el celular y tocá «Abrir el lector»</span></Pastilla>}
        {pedido === "no" && <Pastilla tipo="alerta">No se pudo avisar al celular</Pastilla>}
      </span>
    );
  }
  return (
    <>
      <Boton icono="celular" onClick={() => void generar()} data-testid="emparejar-celular">Vincular el celular</Boton>
      {/* La ventana se dibuja en el cuerpo de la aplicación y no donde está el botón: dentro del
          menú lateral heredaba sus estilos (el título y el botón de cerrar salían deformados). */}
      {abierta && createPortal(
        <Hoja titulo="Vincular el celular con esta computadora" alCerrar={cerrar} testId="hoja-vincular">
          <div className="vender-vincular">
            <div className="vender-qr" data-testid="qr-vincular">
              {qr ? <img src={qr} alt="Código para vincular el celular" width={220} height={220} /> : vencido || error ? <Icono nombre="celular" tam={56} grosor={1.4} /> : <div className="esqueleto" aria-label="Generando el código" />}
            </div>
            <ol className="pasos">
              <li><span>En el celular, abrí Ferrebress y andá a Más → «Vincular con la computadora».</span></li>
              <li><span>Apuntá a este código. (También sirve la cámara del teléfono: tocá el enlace que aparece.)</span></li>
              <li><span>Listo: el celular y esta computadora trabajan en espejo. Lo que hagas en uno se ve en el otro, y el celular pone la cámara.</span></li>
            </ol>
          </div>
          <Aviso tipo="error">{error}</Aviso>
          {vencido && <Aviso tipo="alerta" accion={<Boton tam="chico" onClick={() => void generar()}>Generar otro</Boton>}>El código venció a los 5 minutos.</Aviso>}
          {qr && <p className="detalle">El código vence en 5 minutos. No hace falta instalar nada en el celular.</p>}
        </Hoja>,
        document.querySelector(".cuerpo") ?? document.body,
      )}
    </>
  );
}
