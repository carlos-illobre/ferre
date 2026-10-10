import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import QRCode from "qrcode";
import { esMargenBoton, margenReal, precioDeVenta, subtotalDeRenglon } from "@ferre/calculo-de-precios";
import { cantidadValida, enteras, unidadDe, type Unidad } from "../../unidades";
import { api, ErrorApi, subirFoto, urlDeFoto } from "../../api";
import { guardar, borrarAnterioresA } from "../../almacen";
import { enviarOEncolar, enviarPendientes } from "../../cola";
import { useCatalogo, type Cliente } from "../../catalogo";
import { useTeclasGlobales } from "../../teclas";
import { pesos } from "../../formato";
import { Escaner, hayCamara } from "../../componentes/Escaner";
import { enviarCodigoAlPuesto, escucharPuesto, guardarPuestoLocal, puestoLocal, puestoRemoto } from "../../puesto";
import type { Producto } from "../../pantallas/Productos";
import { describirDispositivo } from "../dispositivo";
import { NOMBRE_MEDIO, useVentasDelDia } from "./VentasDeHoy";
import { useEsCelular } from "../vista";
import { irA } from "../rutas";
import { Aviso, Boton, Buscador, Contador, Exito, Explicado, FotoProducto, Hoja, Icono, Margenes, Pagina, Pastilla, Progreso, Toast, Vacio, hora, numero, pesosCortos } from "../ui";
import "../estilos/vender.css";

// La venta, en el orden del mostrador: buscar → costo, margen y precio → cantidad → cobro.
// Nada obligatorio que el cuaderno no tenga. En la computadora todo sale con el teclado:
// Enter agrega, F5 a F8 eligen cómo paga, F2 (o Enter con la búsqueda vacía) cobra.
type Item = {
  clave: string; producto: Producto | null; descripcion: string; cantidad: number;
  unidad: Unidad;
  precioManual: number | null; // precio tipeado para esta venta; no se guarda en el producto
  abierto: boolean; // celular: el margen y el precio a mano desplegados
};
type Medio = "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente";
const MEDIOS: { valor: Medio; nombre: string; corto: string; tecla: string }[] = [
  { valor: "efectivo", nombre: "Efectivo", corto: "Efectivo", tecla: "F5" },
  { valor: "mercado_pago", nombre: "Mercado Pago", corto: "M. Pago", tecla: "F6" },
  { valor: "tarjeta", nombre: "Tarjeta", corto: "Tarjeta", tecla: "F7" },
  { valor: "cuenta_corriente", nombre: "Cuenta corriente", corto: "Cta. cte.", tecla: "F8" },
];

function precioDe(item: Item): { unitario: number | null; pasos: string[]; margen: number | null; costo: number | null } {
  const p = item.producto;
  const costo = p?.costo_neto != null ? Number(p.costo_neto) : null;
  const iva = p?.iva != null ? Number(p.iva) : 0.21;
  if (item.precioManual !== null) {
    const real = costo !== null ? margenReal({ costoNeto: costo, iva, precio: item.precioManual }) : null;
    return { unitario: item.precioManual, pasos: real ? real.pasos : [`Precio puesto a mano ${pesos(item.precioManual)}`], margen: null, costo };
  }
  if (p && costo !== null && p.margen_elegido !== null) {
    const r = precioDeVenta({ costoNeto: costo, margen: p.margen_elegido, iva });
    return { unitario: r.valor, pasos: r.pasos, margen: p.margen_elegido, costo };
  }
  return { unitario: null, pasos: [], margen: null, costo };
}
const precioDeLista = (p: Producto) => (p.costo_neto !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: Number(p.costo_neto), margen: p.margen_elegido, iva: Number(p.iva ?? 0.21) }).valor : null);
const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");
const pasosDeCosto = (p: Producto, costo: number) => (p.explicacion_costo?.length ? p.explicacion_costo : [`Costo ${pesos(costo)} según la lista del proveedor`]);
const soloDigitos = (v: string) => (v === "" ? null : Number(v.replace(/[^\d]/g, "")) || null);

export function Vender() {
  const { catalogo, stock: stockPorId, clientes, error: errorCatalogo, buscarProductos, actualizarProducto, ajustarStockLocal } = useCatalogo();
  const esCelular = useEsCelular();
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [medio, setMedio] = useState<Medio | null>(null);
  const [clienteId, setClienteId] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState<string | null>(null);
  const [puestoVinculado, setPuestoVinculado] = useState(false);
  const [codigoDesconocido, setCodigoDesconocido] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [eligiendoCliente, setEligiendoCliente] = useState(false);
  const [exito, setExito] = useState<{ total: number; medio: string; detalle: string; encolado: boolean } | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const { datos: hoy } = useVentasDelDia(null, exito);

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 8) : []), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);
  // Un aviso se va solo apenas se corrige su causa.
  useEffect(() => { setError(null); }, [items, medio, clienteId]);
  useEffect(() => { caja.current?.focus(); }, [catalogo]);
  useEffect(() => {
    const reintentar = () => { enviarPendientes().catch(() => undefined); };
    window.addEventListener("online", reintentar);
    // Las ventas confirmadas se conservan 7 días en el dispositivo.
    borrarAnterioresA("ventas", "fecha", new Date(Date.now() - 7 * 86400000).toISOString()).catch(() => undefined);
    return () => window.removeEventListener("online", reintentar);
  }, []);

  // Cada renglón se redondea para arriba a $1.000: toda venta es múltiplo de $1.000.
  const total = items.reduce((s, it) => s + subtotalDeRenglon({ precioUnitario: precioDe(it).unitario ?? 0, cantidad: it.cantidad }).valor, 0);
  const sinPrecio = items.some((it) => precioDe(it).unitario === null);
  const cliente = clientes.find((c) => c.id === clienteId);

  const agregar = useCallback((p: Producto | null, descripcionLibre?: string) => {
    setItems((lista) => {
      if (p) {
        const ya = lista.find((it) => it.producto?.id === p.id);
        if (ya) return lista.map((it) => (it === ya ? { ...it, cantidad: it.cantidad + 1 } : it));
        return [...lista, { clave: crypto.randomUUID(), producto: p, descripcion: p.descripcion, cantidad: 1, unidad: unidadDe(p), precioManual: null, abierto: p.margen_elegido === null }];
      }
      return [...lista, { clave: crypto.randomUUID(), producto: null, descripcion: descripcionLibre ?? "", cantidad: 1, unidad: "unidad", precioManual: null, abierto: false }];
    });
    setConsulta("");
    setMensaje(null);
    caja.current?.focus();
  }, []);

  // Un código de barras, venga de la cámara, del celular vinculado o de un lector que tipea
  // y manda Enter: si es de un producto, se agrega; si no, se ofrece asociarlo.
  const agregarPorCodigo = useCallback((codigo: string): boolean => {
    const c = codigo.trim();
    const exacto = (catalogo ?? []).find((p) => p.codigo_barras === c || p.codigo_proveedor === c);
    if (exacto) { agregar(exacto); setCodigoDesconocido(null); return true; }
    setCodigoDesconocido(c);
    setConsulta("");
    return false;
  }, [catalogo, agregar]);
  // El oyente del celular vinculado se crea una vez y tiene que ver siempre la versión nueva.
  const manejarCodigo = useRef(agregarPorCodigo);
  useEffect(() => { manejarCodigo.current = agregarPorCodigo; }, [agregarPorCodigo]);

  const pararPuesto = useRef<(() => void) | null>(null);
  const alVincular = useCallback((puestoId: string) => {
    setPuestoVinculado(true);
    pararPuesto.current?.();
    pararPuesto.current = escucharPuesto(puestoId, (codigo) => manejarCodigo.current(codigo), (conectado) => { if (!conectado) setPuestoVinculado(Boolean(puestoLocal())); });
  }, []);
  useEffect(() => { const p = puestoLocal(); if (p) alVincular(p.id); return () => pararPuesto.current?.(); }, [alVincular]);

  const alDetectar = useCallback((codigo: string) => {
    const conocido = manejarCodigo.current(codigo);
    setUltimoEscaneo(conocido ? `${codigo}: agregado` : `${codigo}: no está en el catálogo`);
    if (puestoRemoto()) enviarCodigoAlPuesto(codigo).then((ok) => { if (ok) setUltimoEscaneo((u) => `${u ?? codigo}. Enviado a la computadora.`); });
  }, []);

  function cambiarItem(clave: string, cambios: Partial<Item>) {
    setItems((lista) => lista.map((it) => (it.clave === clave ? { ...it, ...cambios } : it)));
  }
  function cambiarUnidad(item: Item, unidad: Unidad) {
    cambiarItem(item.clave, { unidad, cantidad: cantidadValida(String(item.cantidad), unidad) || 1 });
    // Queda guardado en el producto: la próxima vez ya se vende así.
    if (item.producto) actualizarProducto(item.producto.id, { unidad }).catch(() => undefined);
  }
  function quitar(clave: string) {
    setItems((lista) => lista.filter((it) => it.clave !== clave));
    caja.current?.focus();
  }
  function elegirMargen(item: Item, margen: number) {
    if (!item.producto) return;
    actualizarProducto(item.producto.id, { margen_elegido: margen }).catch(() => undefined);
    cambiarItem(item.clave, { precioManual: null, producto: { ...item.producto, margen_elegido: margen } });
  }
  async function subirFotoDe(item: Item, archivo: File) {
    if (!item.producto) return;
    const foto_url = await subirFoto(item.producto.id, archivo);
    actualizarProducto(item.producto.id, { foto_url }).catch(() => undefined);
    cambiarItem(item.clave, { producto: { ...item.producto, foto_url } });
  }
  function elegirSugerencia(p: Producto) {
    if (codigoDesconocido) {
      // Asociar el código escaneado al producto elegido: la próxima vez se encuentra directo.
      actualizarProducto(p.id, { codigo_barras: codigoDesconocido }).catch(() => undefined);
      agregar({ ...p, codigo_barras: codigoDesconocido });
      setCodigoDesconocido(null);
    } else agregar(p);
  }
  function elegirMedio(valor: Medio) {
    setMedio(valor);
    if (valor === "cuenta_corriente" && !clienteId) setEligiendoCliente(true);
  }

  function teclasBusqueda(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setElegido((i) => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => Math.max(i - 1, 0)); }
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

  async function cobrar() {
    if (items.length === 0 || ocupado) return;
    if (sinPrecio) { setError("Hay productos sin precio: elegí un margen o poné el precio a mano en el renglón marcado."); return; }
    if (!medio) { setError("Elegí cómo paga: efectivo, Mercado Pago, tarjeta o cuenta corriente."); return; }
    if (medio === "cuenta_corriente" && !clienteId) { setError("Cuenta corriente: elegí el cliente."); setEligiendoCliente(true); return; }
    setOcupado(true);
    setError(null);
    const id = crypto.randomUUID();
    const cuerpo = {
      id,
      fecha: new Date().toISOString(),
      medio_pago: medio,
      cliente_id: medio === "cuenta_corriente" ? clienteId : null,
      dispositivo_id: describirDispositivo(),
      items: items.map((it) => {
        const p = precioDe(it);
        return {
          producto_id: it.producto?.id ?? null, descripcion: it.descripcion, cantidad: it.cantidad, precio_unitario: p.unitario ?? 0,
          costo_neto: p.costo, margen_aplicado: p.margen, explicacion: { pasos: p.pasos, costo: it.producto?.explicacion_costo ?? [] },
        };
      }),
    };
    try {
      const { encolado } = await enviarOEncolar("venta", "POST", "/ventas", cuerpo);
      // Copia local de la venta (7 días) y stock que ve el mostrador.
      guardar("ventas", { id, fecha: cuerpo.fecha, total, medio_pago: medio, items: cuerpo.items, enviada: !encolado }).catch(() => undefined);
      for (const it of items) if (it.producto) ajustarStockLocal(it.producto.id, -it.cantidad);
      const n = items.length;
      setExito({
        total, encolado,
        medio: NOMBRE_MEDIO[medio]! + (cliente ? ` · ${cliente.nombre}` : ""),
        detalle: encolado ? "Sin conexión: quedó guardada en este dispositivo y se envía sola cuando vuelva internet." : `${n} ${n === 1 ? "producto" : "productos"} a las ${hora(cuerpo.fecha)}. El stock ya se descontó.`,
      });
    } catch (e) {
      setOcupado(false);
      if (e instanceof ErrorApi) { setError(`${e.message}. La venta sigue armada: corregila y cobrá de nuevo.`); return; }
      throw e;
    }
    setItems([]); setMedio(null); setClienteId(""); setOcupado(false);
  }

  function noLlevo() {
    if (items.length === 0) return;
    const consultaItems = items.map((it) => ({ producto_id: it.producto?.id ?? null, descripcion: it.descripcion, precio_ofrecido: precioDe(it).unitario }));
    enviarOEncolar("consulta", "POST", "/consultas", { items: consultaItems, dispositivo_id: describirDispositivo() }).catch(() => undefined);
    setItems([]); setMedio(null); setClienteId("");
    setMensaje("Anotado como «No llevó»: qué pidió y a cuánto se le ofreció.");
    caja.current?.focus();
  }

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
          {!esCelular && <VincularParaEscanear vinculado={puestoVinculado} alVincular={alVincular} />}
          {puestoRemoto() && <span data-testid="celular-vinculado-remoto"><Pastilla tipo="ok">Vinculado a la computadora</Pastilla></span>}
          {hoy && <Boton icono="ventas" onClick={() => irA("ventas")} data-testid="hoy">Hoy <span className="importe chico">{pesosCortos(hoy.total)}</span></Boton>}
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
        <div className="lista">
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

      {items.length > 0 && (esCelular ? (
        <ul className="vender-items" data-testid="venta">{filas.map((f) => <TarjetaDeVenta key={f.item.clave} {...f} />)}</ul>
      ) : (
        <div className="tabla-marco">
          <table className="tabla vender-tabla" data-testid="venta">
            <thead><tr><th className="angosta"><span className="solo-lectores">Foto</span></th><th>Producto</th><th className="num">Costo</th><th>Margen</th><th className="num">Precio por unidad</th><th>Cantidad</th><th className="num">Subtotal</th><th className="angosta"><span className="solo-lectores">Quitar</span></th></tr></thead>
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
          alCerrar={() => { setExito(null); setTimeout(() => caja.current?.focus(), 0); }} />
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
  <>stock {numero(stock)}{stock - cantidad < 0 && <> <Pastilla tipo="alerta" sinPunto>queda en {numero(stock - cantidad)}</Pastilla></>}</>
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
      <td className="num">{p.costo === null || !producto ? <span className="detalle">sin costo</span> : <Explicado valor={pesos(p.costo)} pasos={pasosDeCosto(producto, p.costo)} etiqueta={`Costo ${pesos(p.costo)}`} />}</td>
      <td>{producto && p.costo !== null ? <Margenes compacto elegido={it.precioManual === null ? p.margen : null} alElegir={alElegirMargen} etiqueta={`Margen de ${it.descripcion}`} /> : <span className="detalle">a mano</span>}</td>
      <td className="num">
        <div className="vender-precio">
          {sinPrecio ? <span className="falta-texto" data-testid="sin-precio">elegí margen o precio</span> : <Explicado className="importe chico" valor={pesosCortos(p.unitario)} pasos={p.pasos} etiqueta={`Precio ${pesosCortos(p.unitario)}`} />}
          <PrecioAMano item={it} alCambiar={alCambiar} falta={sinPrecio} />
        </div>
      </td>
      <td><Contador valor={it.cantidad} entera={enteras(it.unidad)} alCambiar={(v) => alCambiar({ cantidad: v })} unidad={it.unidad} alCambiarUnidad={alCambiarUnidad} etiqueta={`Cantidad de ${it.descripcion}`} sinBotones /></td>
      <td className="num" data-testid="subtotal">{renglon && (renglon.pasos.length ? <Explicado className="importe" valor={pesosCortos(renglon.valor)} pasos={[...p.pasos, ...renglon.pasos]} etiqueta={`Subtotal ${pesosCortos(renglon.valor)}`} /> : <span className="importe">{pesosCortos(renglon.valor)}</span>)}</td>
      <td className="angosta"><Boton icono="cerrar" tam="chico" aria-label={`Quitar ${it.descripcion || "el ítem"}`} onClick={alQuitar} /></td>
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
        <span data-testid="subtotal">{renglon ? <Explicado className="importe" valor={pesosCortos(renglon.valor)} pasos={[...p.pasos, ...renglon.pasos]} etiqueta={`Subtotal ${pesosCortos(renglon.valor)}`} /> : !producto ? <PrecioAMano item={it} alCambiar={alCambiar} falta /> : <span className="falta-texto" data-testid="sin-precio">sin precio</span>}</span>
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
            <span className="crece"><Explicado valor={`Costo ${pesos(p.costo)}`} pasos={pasosDeCosto(producto, p.costo)} /></span>
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
    <Hoja titulo="¿Quién lleva a cuenta corriente?" alCerrar={alCerrar} testId="hoja-clientes">
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
function VincularParaEscanear({ vinculado, alVincular }: { vinculado: boolean; alVincular: (puestoId: string) => void }) {
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

  if (vinculado) {
    return (
      <span className="fila" data-testid="celular-vinculado">
        <Pastilla tipo="ok">Celular vinculado</Pastilla>
        <Boton tam="chico" onClick={() => { guardarPuestoLocal(null); location.reload(); }}>Desvincular</Boton>
      </span>
    );
  }
  return (
    <>
      <Boton icono="celular" onClick={() => void generar()} data-testid="vincular-celular">Escanear con el celular</Boton>
      {abierta && (
        <Hoja titulo="Usar el celular para escanear" alCerrar={cerrar} testId="hoja-vincular">
          <div className="vender-vincular">
            <div className="vender-qr" data-testid="qr-vincular">
              {qr ? <img src={qr} alt="Código para vincular el celular" width={220} height={220} /> : vencido || error ? <Icono nombre="celular" tam={56} grosor={1.4} /> : <div className="esqueleto" aria-label="Generando el código" />}
            </div>
            <ol className="pasos">
              <li><span>Abrí la cámara del celular y apuntá al código.</span></li>
              <li><span>Tocá el enlace que aparece y entrá con tu cuenta.</span></li>
              <li><span>Listo: lo que escanees con el celular aparece en esta venta durante 12 horas.</span></li>
            </ol>
          </div>
          <Aviso tipo="error">{error}</Aviso>
          {vencido && <Aviso tipo="alerta" accion={<Boton tam="chico" onClick={() => void generar()}>Generar otro</Boton>}>El código venció a los 5 minutos.</Aviso>}
          {qr && <p className="detalle">El código vence en 5 minutos. No hace falta instalar nada en el celular.</p>}
        </Hoja>
      )}
    </>
  );
}
