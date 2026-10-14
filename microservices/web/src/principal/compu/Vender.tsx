import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { SiVeCostos } from "../Costos";
import { usePuede } from "../permisos";
import { MEDIOS, TEXTOS, type Medio } from "../textos";
import QRCode from "qrcode";
import { createPortal } from "react-dom";
import { contarAlEspejo, useEspejar } from "../../espejo";
import { NOMBRE_DE_MEDIO, precioDe, useVenta, type Item, type MotivoDeCambio } from "../../negocio/ventas/venta";
import { esMargenBoton, margenReal, precioDeVenta, subtotalDeRenglon } from "@ferre/calculo-de-precios";
import { cantidadValida, enteras, unidadDe, type Unidad } from "../../unidades";
import { api, ErrorApi, subirFoto, urlDeFoto } from "../../api";
import { guardar, borrarAnterioresA } from "../../almacen";
import { enviarOEncolar, enviarPendientes } from "../../cola";
import { useCatalogo, type Cliente } from "../../catalogo";
import { useTeclasGlobales } from "../../plataforma/teclado/teclas";
import { pesos } from "../../formato";
import { Escaner, hayCamara } from "../../plataforma/camara/Escaner";
import { enviarCodigoAlPuesto, escucharPuesto, EVENTO_EMPAREJAMIENTO, guardarPuestoLocal, pedirLector, puestoLocal, puestoRemoto, soltarEmparejamiento } from "../../puesto";
import type { Producto } from "../celular/pantallas/Productos";
import { describirDispositivo } from "./base/dispositivo";
import { useEsCelular } from "./base/vista";
import { irA } from "./base/rutas";
import { Aviso, Boton, Buscador, Contador, Exito, Explicado, FotoProducto, Hoja, Icono, Margenes, Pagina, Pastilla, Progreso, Toast, Vacio, hora, numero, pesosCortos } from "./base/ui";
import "./base/estilos/vender.css";
import { precioDe as precioSugerido, useSugeridos } from "../sugeridos";

// La venta, en el orden del mostrador: buscar → costo, margen y precio → cantidad → cobro.
// Nada obligatorio que el cuaderno no tenga. En la computadora todo sale con el teclado:
// Enter agrega, F5 a F8 eligen cómo paga, F2 (o Enter con la búsqueda vacía) cobra.
const precioDeLista = (p: Producto) => (p.costo_neto !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: Number(p.costo_neto), margen: p.margen_elegido, iva: Number(p.iva ?? 0.21) }).valor : null);
const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");
const pasosDeCosto = (p: Producto, costo: number) => (p.explicacion_costo?.length ? p.explicacion_costo : [`Costo ${pesos(costo)} según la lista del proveedor`]);
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
  const sugeridos = useSugeridos(catalogo, exito);

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 8) : []), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);
  useEffect(() => { caja.current?.focus(); }, [catalogo]);

  // El oyente del celular vinculado se crea una vez y tiene que ver siempre la versión nueva.
  const manejarCodigo = useRef(agregarPorCodigo);
  useEffect(() => { manejarCodigo.current = agregarPorCodigo; }, [agregarPorCodigo]);

  const pararPuesto = useRef<(() => void) | null>(null);
  const alVincular = useCallback((puestoId: string) => {
    setPuestoVinculado(true);
    pararPuesto.current?.();
    pararPuesto.current = escucharPuesto(puestoId, (codigo) => manejarCodigo.current(codigo), (conectado) => { if (!conectado) setPuestoVinculado(Boolean(puestoLocal())); });
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

  const vacio = items.length === 0 && !consulta.trim() && !codigoDesconocido;
  const filas = items.map((it) => ({
    item: it, stock: it.producto ? stockPorId.get(it.producto.id) : undefined,
    alCambiar: (c: Partial<Item>) => cambiarItem(it.clave, c), alQuitar: () => quitar(it.clave), alElegirMargen: (m: number) => elegirMargen(it, m),
    alCambiarUnidad: (u: Unidad) => cambiarUnidad(it, u), alSubirFoto: it.producto ? (a: File) => subirFotoDe(it, a) : undefined, marcar: Boolean(error) && sinPrecio,
  }));

  return (
    <Pagina titulo="Vender" testId="vender" className={`vender ${items.length ? "con-cobro" : ""}`}
      acciones={
        <div className="fila envuelve">
          {/* Sin celular emparejado, «Vincular el celular» está en el menú lateral, siempre a la vista. */}
          {!esCelular && puestoVinculado && <VincularParaEscanear vinculado={puestoVinculado} alVincular={alVincular} />}
          {puestoRemoto() && <span data-testid="celular-vinculado-remoto"><Pastilla tipo="ok">Vinculado a la computadora</Pastilla></span>}
        </div>
      }>
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
                  <span className="nombre">{p.descripcion}</span>
                  <span className={precio === null ? "falta-texto" : "importe"}>{precio === null ? "sin precio" : pesosCortos(precio)}</span>
                  <span className="detalle">{detalleDe(p)}{stock !== undefined ? `${detalleDe(p) ? " · " : ""}stock ${numero(stock)}` : ""}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {!catalogo && !errorCatalogo && <Progreso texto="Bajando el catálogo por primera vez. Después se busca al instante, también sin internet." />}

      {!esCelular && (
        <p className="vender-teclas detalle" data-testid="teclas">
          <span><kbd className="tecla">Enter</kbd> agrega</span><span><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd> eligen</span>
          <span><kbd className="tecla">F5</kbd> a <kbd className="tecla">F8</kbd> cómo paga</span><span><kbd className="tecla">F2</kbd> cobra</span><span><kbd className="tecla">Esc</kbd> borra la búsqueda</span>
        </p>
      )}

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

      {vacio && !sugeridos.hay && (
        <Vacio icono="vender" titulo="Venta nueva">
          {esCelular ? "Escribí el nombre del producto o escaneá el código de barras." : "Escribí el nombre del producto o el código y apretá Enter. También podés escanear con el celular vinculado."}
        </Vacio>
      )}

      {/* Siguen a la vista con la venta empezada, para sumar otro producto de un clic. */}
      {sugeridos.hay && !consulta.trim() && !codigoDesconocido && (
        <div className="sugeridos">
          {[["Lo último que se vendió", sugeridos.ultimos, "ultimos"] as const, ["Lo que más se vende", items.length ? [] : sugeridos.masVendidos, "mas-vendidos"] as const].map(([titulo, lista, clave]) => lista.length > 0 && (
            <section key={clave} aria-label={titulo} data-testid={`sugeridos-${clave}`}>
              <h2 className="seccion-titulo">{titulo}</h2>
              <ul className="sugeridos-grilla" data-sin-flechas>
                {lista.map((p) => {
                  const precio = precioSugerido(p);
                  return (
                    <li key={p.id}>
                      <button type="button" className="tarjeta sugeridos-tarjeta" onClick={() => agregar(p)}>
                        <span className="miniatura">{p.foto_url ? <img src={urlDeFoto(p.foto_url) ?? ""} alt="" loading="lazy" /> : <Icono nombre="productos" tam={18} grosor={1.6} />}</span>
                        <span className="nombre">{p.descripcion}</span>
                        <span className="detalle">{detalleDe(p) || "Agregar a la venta"}</span>
                        <span className={precio === null ? "falta-texto" : "importe chico"}>{precio === null ? "sin precio" : pesosCortos(precio)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {vacio && <p className="detalle">Un clic agrega el producto a la venta. También podés escribir en la búsqueda o escanear con el celular vinculado.</p>}
        </div>
      )}

      {items.length > 0 && (esCelular ? (
        <ul className="vender-items" data-testid="venta">{filas.map((f) => <TarjetaDeVenta key={f.item.clave} {...f} />)}</ul>
      ) : (
        <div className="tabla-marco">
          <table className="tabla vender-tabla" data-testid="venta">
            <thead><tr><th className="angosta"><span className="solo-lectores">Foto</span></th><th>Producto</th><SiVeCostos><th className="num">Costo</th></SiVeCostos><th>Margen</th><th className="num">Precio por unidad</th><th>Cantidad</th><th className="num">Subtotal</th><th className="angosta"><span className="solo-lectores">Quitar</span></th></tr></thead>
            <tbody>{filas.map((f) => <FilaDeVenta key={f.item.clave} {...f} />)}</tbody>
          </table>
        </div>
      ))}

      {items.length > 0 && (
        <section className="vender-cobro sobre-oscuro" aria-label="Cobro" data-testid="cobro">
          {error && <div className="vender-cobro-aviso"><Aviso tipo="error" testId="error-cobro">{error}</Aviso></div>}
          <div className="vender-total"><span>Total</span><strong className="importe total" data-testid="total">{pesosCortos(total)}</strong></div>
          <div className="vender-medios" role="radiogroup" aria-label="Cómo paga">
            {MEDIOS.map((m) => (
              <Boton key={m.valor} variante="sobre-marino" role="radio" aria-checked={medio === m.valor} aria-keyshortcuts={m.tecla} onClick={() => elegirMedio(m.valor)} data-testid={`medio-${m.valor}`}>
                {!esCelular && <span className="tecla" aria-hidden="true">{m.tecla}</span>}{esCelular ? m.corto : m.nombre}
              </Boton>
            ))}
          </div>
          {medio === "cuenta_corriente" && (
            <Boton variante="sobre-marino" className={`vender-cliente ${cliente ? "" : "falta"}`} icono="usuarios" onClick={() => setEligiendoCliente(true)} data-testid="cliente">{cliente ? cliente.nombre : "Elegí el cliente"}</Boton>
          )}
          <div className="vender-acciones">
            <Boton variante="sobre-marino" onClick={noLlevo} data-testid="no-llevo">No llevó</Boton>
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
  const renglon = p.unitario === null ? null : subtotalDeRenglon({ precioUnitario: p.unitario, cantidad: it.cantidad, unidad: it.unidad });
  const margenTexto = it.precioManual !== null ? "precio a mano" : p.margen === null ? "elegí el margen" : `margen ${p.margen} %${esMargenBoton(p.margen) ? "" : " a mano"}`;
  return { p, renglon, margenTexto };
}
const StockDeRenglon = ({ stock, cantidad }: { stock: number | undefined; cantidad: number }) => (stock === undefined ? null : (
  <>stock {numero(stock)}{stock - cantidad < 0 && <> <Pastilla tipo="alerta" sinPunto>{TEXTOS.vender.stockNoAlcanza.largo}</Pastilla></>}</>
));
function PrecioAMano({ item, alCambiar, falta, id }: { item: Item; alCambiar: (c: Partial<Item>) => void; falta?: boolean; id?: string }) {
  return (
    <label className={`con-prefijo vender-a-mano ${falta ? "falta" : ""}`} title="Un precio distinto solo para esta venta. No cambia el producto.">
      <span aria-hidden="true">$</span>
      <input id={id} inputMode="numeric" placeholder="a mano" aria-label={`Precio a mano de ${item.descripcion || "este ítem"}, solo para esta venta`} autoFocus={!item.producto && item.precioManual === null}
        value={item.precioManual ?? ""} onChange={(e) => alCambiar({ precioManual: soloDigitos(e.target.value) })} data-testid="precio-manual" />
    </label>
  );
}

// Computadora: cada renglón es una fila y todo se cambia ahí, sin soltar el teclado.
function FilaDeVenta({ item: it, stock, marcar, alCambiar, alQuitar, alElegirMargen, alCambiarUnidad, alSubirFoto }: PropsDeRenglon) {
  const { p, renglon } = useRenglon(it);
  const producto = it.producto;
  const sinPrecio = p.unitario === null;
  return (
    <tr data-testid="item" className={sinPrecio ? `vender-sin-precio ${marcar ? "marcada" : ""}` : ""}>
      <td className="angosta">{producto ? <FotoProducto id={producto.id} url={producto.foto_url ?? null} descripcion={it.descripcion} alSubir={alSubirFoto} /> : <span className="miniatura"><Icono nombre="editar" tam={18} grosor={1.6} /></span>}</td>
      <td>
        {producto ? <span className="nombre">{it.descripcion}</span>
          : <input className="entrada" value={it.descripcion} placeholder="¿Qué se lleva?" aria-label="Descripción del ítem libre" onChange={(e) => alCambiar({ descripcion: e.target.value })} data-testid="descripcion-libre" />}
        <div className="detalle">{producto ? <>{detalleDe(producto)}{detalleDe(producto) && stock !== undefined ? " · " : ""}<StockDeRenglon stock={stock} cantidad={it.cantidad} /></> : "Ítem libre: no está en ninguna lista"}</div>
      </td>
      <SiVeCostos><td className="num">{p.costo === null || !producto ? <span className="detalle">sin costo</span> : <Explicado valor={pesos(p.costo)} pasos={pasosDeCosto(producto, p.costo)} etiqueta={`Costo ${pesos(p.costo)}`} />}</td></SiVeCostos>
      <td>{producto && p.costo !== null ? <Margenes compacto elegido={it.precioManual === null ? p.margen : null} alElegir={alElegirMargen} etiqueta={`Margen de ${it.descripcion}`} /> : <span className="detalle">a mano</span>}</td>
      <td className="num">
        <div className="vender-precio">
          {sinPrecio ? <span className="falta-texto" data-testid="sin-precio">elegí margen o precio</span> : <Explicado conCosto className="importe chico" valor={pesosCortos(p.unitario)} pasos={p.pasos} etiqueta={`Precio ${pesosCortos(p.unitario)}`} />}
          <PrecioAMano item={it} alCambiar={alCambiar} falta={sinPrecio} />
        </div>
      </td>
      <td><Contador valor={it.cantidad} entera={enteras(it.unidad)} alCambiar={(v) => alCambiar({ cantidad: v })} unidad={it.unidad} alCambiarUnidad={alCambiarUnidad} etiqueta={`Cantidad de ${it.descripcion}`} sinBotones /></td>
      <td className="num" data-testid="subtotal">{renglon && (renglon.pasos.length ? <Explicado conCosto className="importe" valor={pesosCortos(renglon.valor)} pasos={[...p.pasos, ...renglon.pasos]} etiqueta={`Subtotal ${pesosCortos(renglon.valor)}`} /> : <span className="importe">{pesosCortos(renglon.valor)}</span>)}</td>
      <td className="angosta"><Boton icono="basura" variante="peligro" tam="chico" title="Quitar de la venta" aria-label={`Quitar ${it.descripcion || "el ítem"}`} onClick={alQuitar} /></td>
    </tr>
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
          {producto ? <span className="nombre">{it.descripcion}</span>
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
function ElegirCliente({ clientes, elegido, alElegir, alCerrar }: { clientes: Cliente[]; elegido: string; alElegir: (id: string) => void; alCerrar: () => void }) {
  const [filtro, setFiltro] = useState("");
  const [marcado, setMarcado] = useState(0);
  const f = filtro.trim().toLowerCase();
  const visibles = clientes.filter((c) => c.cuenta_corriente !== false && (!f || c.nombre.toLowerCase().includes(f)));
  useEffect(() => { setMarcado(0); }, [filtro]);
  return (
    <Hoja titulo={TEXTOS.vender.quienLleva.largo} alCerrar={alCerrar} testId="hoja-clientes">
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
export function VincularParaEscanear({ vinculado, alVincular }: { vinculado: boolean; alVincular: (puestoId: string) => void }) {
  const [abierta, setAbierta] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [vencido, setVencido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consulta = useRef<ReturnType<typeof setInterval> | null>(null);
  const parar = () => { if (consulta.current) clearInterval(consulta.current); consulta.current = null; };
  useEffect(() => parar, []);

  async function generar() {
    setAbierta(true); setError(null); setVencido(false); setQr(null); parar();
    try {
      const { id, codigo, expiraEnSegundos } = await api<{ id: string; codigo: string; expiraEnSegundos: number }>("/puestos", { method: "POST", body: JSON.stringify({ nombre: "computadora del mostrador" }) });
      const enlace = `${location.origin}${location.pathname}#/vincular-celular?codigo=${encodeURIComponent(codigo)}`;
      setQr(await QRCode.toDataURL(enlace, { width: 260, margin: 1, color: { dark: "#0f1e36", light: "#ffffff" } }));
      // Para las pruebas automáticas: el enlace que el celular abriría.
      (window as unknown as { __enlaceVinculacion?: string }).__enlaceVinculacion = enlace;
      const fin = Date.now() + expiraEnSegundos * 1000;
      consulta.current = setInterval(async () => {
        if (Date.now() > fin) { parar(); setQr(null); setVencido(true); return; }
        const estado = await api<{ vinculado_en: string | null; expira_en: string }>(`/puestos/${id}`).catch(() => null);
        if (estado?.vinculado_en) { parar(); guardarPuestoLocal({ id, expira_en: estado.expira_en }); setAbierta(false); alVincular(id); }
      }, 2000);
    } catch (e) { const err = e as { estado?: number; message: string }; setError(err.estado ? err.message : "Sin conexión: para vincular el celular hace falta internet."); }
  }
  function cerrar() { parar(); setAbierta(false); }
  // Con el celular emparejado no hay código que leer: se le pide que abra el lector (decisión 59).
  const [pedido, setPedido] = useState<"si" | "no" | null>(null);
  async function pedir() { setPedido((await pedirLector()) ? "si" : "no"); }
  useEffect(() => { if (!pedido) return; const t = setTimeout(() => setPedido(null), 20000); return () => clearTimeout(t); }, [pedido]);

  if (vinculado) {
    return (
      <span className="fila" data-testid="celular-vinculado">
        <Boton icono="celular" onClick={() => void pedir()} data-testid="pedir-lector">Escanear con el celular</Boton>
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
