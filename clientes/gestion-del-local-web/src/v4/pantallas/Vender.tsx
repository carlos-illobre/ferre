import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { margenReal, precioDeVenta, subtotalDeRenglon } from "@ferre/calculo-de-precios";
import { borrarAnterioresA, guardar } from "../../almacen";
import { api, ErrorApi } from "../../api";
import { useCatalogo, type Cliente } from "../../catalogo";
import { enviarOEncolar } from "../../cola";
import type { Producto } from "../../pantallas/Productos";
import { enviarCodigoAlPuesto, escucharPuesto, guardarPuestoLocal, puestoLocal, puestoRemoto } from "../../puesto";
import { cantidadValida, UNIDADES, unidadDe, type Unidad } from "../../unidades";
import { describirDispositivo } from "../dispositivo";
import { MEDIOS_DE_PAGO, nombreDeUnidad, pesos, pesosConCentavos, porUnidad, vaConDecimal, type MedioDePago } from "../formato";
import {
  Aviso, avisar, BarraDeAccion, Boton, Buscador, Campo, Cantidad, Cargando, clases, DURACION_DEL_AVISO, ErrorDeCarga, Escaner, Exito, Explicado, Hoja, Icono,
  Iniciales, leerPesos, Lista, Margenes, Pagina, Pastilla, Qr, Renglon, Segmentos, Vacio,
} from "../piezas";
import { useEsCelular } from "../rutas";
import "../estilos/vender.css";

// La venta, en el orden del mostrador: buscar → cantidad → cómo paga → cobrar. En la
// computadora todo sale con el teclado: Enter agrega, F5 a F8 eligen cómo paga, F2 (o Enter
// con la búsqueda vacía) cobra.

type RenglonDeVenta = {
  clave: string;
  /** `null` cuando es «algo que no está en productos». */
  producto: Producto | null;
  descripcion: string;
  cantidad: number;
  unidad: Unidad;
  /** Precio puesto a mano, solo para esta venta; no se guarda en el producto. */
  precioAMano: number | null;
  /** Entró sin precio: sigue mostrando los márgenes aunque ya se haya elegido uno. */
  conMargenes: boolean;
};

type VentaEnCurso = { renglones: RenglonDeVenta[]; medio: MedioDePago | null; clienteId: string };

const TECLAS_DE_MEDIO: Record<string, MedioDePago> = { F5: "efectivo", F6: "mercado_pago", F7: "tarjeta", F8: "cuenta_corriente" };
const MAXIMO_DE_RESULTADOS = 8;

// La venta que se está armando dura aunque se pase por otra pantalla (mirar un producto,
// el stock) y se vuelva. Se pierde al recargar.
const VENTA_VACIA: VentaEnCurso = { renglones: [], medio: null, clienteId: "" };
let enCurso: VentaEnCurso = VENTA_VACIA;

// «No llevó» se puede deshacer mientras dura el aviso: recién después se manda. Vive fuera de
// la pantalla para que salga igual si se cambia de pantalla o se cierra la pestaña antes.
let consultaPorMandar: { mandar: () => void; reloj: number } | null = null;
function mandarConsultaPendiente() {
  if (!consultaPorMandar) return;
  window.clearTimeout(consultaPorMandar.reloj);
  const { mandar } = consultaPorMandar;
  consultaPorMandar = null;
  mandar();
}
if (typeof window !== "undefined") window.addEventListener("pagehide", mandarConsultaPendiente);

/** Para las pruebas: deja la venta en curso vacía y manda lo que estuviera esperando. */
export function reiniciarVenta() {
  mandarConsultaPendiente();
  enCurso = VENTA_VACIA;
}

type Cuenta = { unitario: number | null; subtotal: number | null; pasos: string[]; margen: number | null; costo: number | null; sinPrecio: boolean };

function cuentaDe(r: RenglonDeVenta): Cuenta {
  const p = r.producto;
  const costo = p?.costo_neto != null ? Number(p.costo_neto) : null;
  const iva = p?.iva != null ? Number(p.iva) : 0.21;
  let unitario: number | null = null;
  let pasos: string[] = [];
  let margen: number | null = null;
  if (r.precioAMano !== null) {
    unitario = r.precioAMano;
    pasos = costo !== null ? margenReal({ costoNeto: costo, iva, precio: unitario }).pasos : [`Precio puesto a mano, solo para esta venta: ${pesos(unitario)}`];
  } else if (p && costo !== null && p.margen_elegido !== null) {
    const calculo = precioDeVenta({ costoNeto: costo, margen: p.margen_elegido, iva });
    unitario = calculo.valor; pasos = calculo.pasos; margen = p.margen_elegido;
  }
  if (unitario === null) return { unitario: null, subtotal: null, pasos: [], margen, costo, sinPrecio: true };
  // Cada renglón se redondea para arriba a $1.000: toda venta es múltiplo de $1.000.
  const sub = subtotalDeRenglon({ precioUnitario: unitario, cantidad: r.cantidad, unidad: r.unidad });
  return { unitario, subtotal: sub.valor, pasos: [...pasos, ...sub.pasos], margen, costo, sinPrecio: false };
}

const precioDeLista = (p: Producto) => (p.costo_neto !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: Number(p.costo_neto), margen: p.margen_elegido, iva: Number(p.iva ?? 0.21) }).valor : null);
const debe = (c: Cliente) => (Number(c.deuda) > 0 ? `Debe ${pesos(c.deuda)}` : "Al día");

// ---------------------------------------------------------------- Pantalla

export function Vender() {
  // «Reintentar» vuelve a montar la venta: el catálogo se pide de nuevo.
  const [intento, setIntento] = useState(0);
  return <Venta key={intento} alReintentar={() => setIntento((n) => n + 1)} />;
}

function Venta({ alReintentar }: { alReintentar: () => void }) {
  const { catalogo, clientes, error: errorDelCatalogo, buscarProductos, actualizarProducto, ajustarStockLocal } = useCatalogo();
  const esCelular = useEsCelular();

  const [renglones, setRenglones] = useState<RenglonDeVenta[]>(() => enCurso.renglones);
  const [medio, setMedio] = useState<MedioDePago | null>(() => enCurso.medio);
  const [clienteId, setClienteId] = useState(() => enCurso.clienteId);
  useEffect(() => { enCurso = { renglones, medio, clienteId }; }, [renglones, medio, clienteId]);

  const [consulta, setConsulta] = useState("");
  const [marcado, setMarcado] = useState(0);
  const [recien, setRecien] = useState<string | null>(null);
  const [codigoSuelto, setCodigoSuelto] = useState<string | null>(null);
  const [intentoCobrar, setIntentoCobrar] = useState(false);
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [cobrada, setCobrada] = useState<{ total: number; comoPago: string; encolada: boolean } | null>(null);
  const [hoja, setHoja] = useState<"cliente" | "libre" | "escaner" | "celular" | null>(null);
  const [celularVinculado, setCelularVinculado] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState<string | null>(null);
  const buscador = useRef<HTMLInputElement>(null);
  const idResultados = useId();

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, MAXIMO_DE_RESULTADOS) : []), [buscarProductos, consulta]);
  const cuentas = renglones.map(cuentaDe);
  const total = cuentas.reduce((suma, c) => suma + (c.subtotal ?? 0), 0);
  const haySinPrecio = cuentas.some((c) => c.sinPrecio);
  const cliente = clientes.find((c) => c.id === clienteId);
  const hayRenglones = renglones.length > 0;
  const vinculadoALaComputadora = Boolean(puestoRemoto());

  useEffect(() => {
    // Las ventas confirmadas se conservan 7 días en el dispositivo.
    borrarAnterioresA("ventas", "fecha", new Date(Date.now() - 7 * 86400000).toISOString()).catch(() => undefined);
  }, []);

  // Lo que falta para poder cobrar. El aviso aparece al tocar «Cobrar» y se va solo al corregir.
  const falta =
    haySinPrecio ? { titulo: "Hay productos sin precio", detalle: "Elegí el margen o poné el precio a mano en el renglón marcado." }
    : medio === null ? { titulo: "Elegí cómo paga", detalle: null }
    : medio === "cuenta_corriente" && !cliente ? { titulo: "Cuenta corriente: elegí el cliente", detalle: null }
    : null;
  const queFalta = falta?.titulo ?? null;
  useEffect(() => { setIntentoCobrar(false); }, [queFalta]);
  useEffect(() => { setRechazo(null); }, [renglones, medio, clienteId]);
  // Si al cobrar falta un precio, se lleva la vista al renglón marcado.
  useEffect(() => {
    if (intentoCobrar && haySinPrecio) document.querySelector("[data-sin-precio]")?.scrollIntoView?.({ block: "center" });
  }, [intentoCobrar, haySinPrecio]);

  // ---- Agregar

  const agregar = useCallback((p: Producto) => {
    const clave = crypto.randomUUID();
    setRenglones((lista) => {
      const ya = lista.find((r) => r.producto?.id === p.id);
      if (ya) { setRecien(ya.clave); return lista.map((r) => (r === ya ? { ...r, cantidad: r.cantidad + 1 } : r)); }
      setRecien(clave);
      return [...lista, { clave, producto: p, descripcion: p.descripcion, cantidad: 1, unidad: unidadDe(p), precioAMano: null, conMargenes: precioDeLista(p) === null }];
    });
    setConsulta("");
    setMarcado(0);
    buscador.current?.focus();
  }, []);

  function agregarLibre(descripcion: string, precio: number) {
    const clave = crypto.randomUUID();
    setRenglones((lista) => [...lista, { clave, producto: null, descripcion, cantidad: 1, unidad: "unidad", precioAMano: precio, conMargenes: false }]);
    setRecien(clave);
    setConsulta("");
    buscador.current?.focus();
  }

  // Un código de barras, venga de la cámara, del celular vinculado o de un lector que lo
  // escribe y manda Enter: si es de un producto, se agrega; si no, se ofrece asociarlo.
  const leerCodigo = useCallback((codigo: string): boolean => {
    const c = codigo.trim();
    const exacto = (catalogo ?? []).find((p) => p.codigo_barras === c || p.codigo_proveedor === c);
    if (exacto) { agregar(exacto); setCodigoSuelto(null); return true; }
    setCodigoSuelto(c);
    setConsulta("");
    buscador.current?.focus();
    return false;
  }, [catalogo, agregar]);
  // El oyente del celular vinculado se crea una vez y tiene que ver siempre la versión nueva.
  const manejarCodigo = useRef(leerCodigo);
  useEffect(() => { manejarCodigo.current = leerCodigo; }, [leerCodigo]);

  function elegirResultado(p: Producto) {
    if (codigoSuelto) {
      // El código escaneado queda asociado al producto elegido: la próxima vez se agrega solo.
      actualizarProducto(p.id, { codigo_barras: codigoSuelto }).catch(() => undefined);
      agregar({ ...p, codigo_barras: codigoSuelto });
      avisar(`Código asociado a ${p.descripcion}`, { detalle: "La próxima vez se agrega al escanearlo." });
      setCodigoSuelto(null);
    } else agregar(p);
  }

  // ---- Celular vinculado (la computadora recibe lo que el celular escanea)

  const pararPuesto = useRef<(() => void) | null>(null);
  const alVincular = useCallback((puestoId: string) => {
    setCelularVinculado(true);
    pararPuesto.current?.();
    pararPuesto.current = escucharPuesto(puestoId, (codigo) => { manejarCodigo.current(codigo); }, (conectado) => { if (!conectado) setCelularVinculado(Boolean(puestoLocal())); });
  }, []);
  useEffect(() => { const p = puestoLocal(); if (p) alVincular(p.id); return () => pararPuesto.current?.(); }, [alVincular]);

  function desvincular() {
    pararPuesto.current?.();
    pararPuesto.current = null;
    guardarPuestoLocal(null);
    setCelularVinculado(false);
  }

  // Desde la cámara de este celular: se agrega acá y, si está vinculado, va también a la computadora.
  function alEscanear(codigo: string) {
    const conocido = leerCodigo(codigo);
    if (!vinculadoALaComputadora) return;
    setUltimoEscaneo(conocido ? `${codigo}: agregado` : `${codigo}: no está en el catálogo`);
    enviarCodigoAlPuesto(codigo).then((ok) => { if (ok) setUltimoEscaneo((u) => `${u ?? codigo}. Enviado a la computadora.`); }).catch(() => undefined);
  }

  // ---- Renglones

  function cambiarRenglon(clave: string, cambios: Partial<RenglonDeVenta>) {
    setRenglones((lista) => lista.map((r) => (r.clave === clave ? { ...r, ...cambios } : r)));
  }
  function quitar(clave: string) {
    setRenglones((lista) => lista.filter((r) => r.clave !== clave));
    buscador.current?.focus();
  }
  function elegirMargen(r: RenglonDeVenta, margen: number) {
    if (!r.producto) return;
    // El margen queda guardado en el producto: la próxima vez ya tiene precio.
    actualizarProducto(r.producto.id, { margen_elegido: margen }).catch(() => undefined);
    cambiarRenglon(r.clave, { precioAMano: null, producto: { ...r.producto, margen_elegido: margen } });
  }
  function cambiarUnidad(r: RenglonDeVenta, unidad: Unidad) {
    cambiarRenglon(r.clave, { unidad, cantidad: cantidadValida(String(r.cantidad), unidad) || 1 });
    // Queda guardado en el producto: la próxima vez ya se vende así.
    if (r.producto) actualizarProducto(r.producto.id, { unidad }).catch(() => undefined);
  }

  // ---- Cobrar

  function elegirComoPaga(valor: MedioDePago) {
    setMedio(valor);
    if (valor === "cuenta_corriente" && !cliente) setHoja("cliente");
  }

  async function cobrar() {
    if (!hayRenglones || ocupado) return;
    if (falta) {
      setIntentoCobrar(true);
      if (!haySinPrecio && medio === "cuenta_corriente") setHoja("cliente");
      return;
    }
    if (!medio) return;
    setOcupado(true);
    setRechazo(null);
    const id = crypto.randomUUID();
    const cuerpo = {
      id,
      fecha: new Date().toISOString(),
      medio_pago: medio,
      cliente_id: medio === "cuenta_corriente" ? clienteId : null,
      dispositivo_id: describirDispositivo(),
      items: renglones.map((r, i) => {
        const c = cuentas[i]!;
        return {
          producto_id: r.producto?.id ?? null, descripcion: r.descripcion, cantidad: r.cantidad, precio_unitario: c.unitario ?? 0,
          costo_neto: c.costo, margen_aplicado: c.margen, explicacion: { pasos: c.pasos, costo: r.producto?.explicacion_costo ?? [] },
        };
      }),
    };
    try {
      const { encolado } = await enviarOEncolar("venta", "POST", "/ventas", cuerpo);
      // Copia local de la venta (7 días) y stock que ve el mostrador.
      guardar("ventas", { id, fecha: cuerpo.fecha, total, medio_pago: medio, items: cuerpo.items, enviada: !encolado }).catch(() => undefined);
      for (const r of renglones) if (r.producto) ajustarStockLocal(r.producto.id, -r.cantidad);
      const frase = MEDIOS_DE_PAGO.find((m) => m.clave === medio)?.frase ?? "";
      setCobrada({ total, encolada: encolado, comoPago: medio === "cuenta_corriente" && cliente ? `${frase} de ${cliente.nombre}` : frase });
      setRenglones([]); setMedio(null); setClienteId("");
      window.scrollTo(0, 0);
    } catch (e) {
      if (!(e instanceof ErrorApi)) throw e;
      setRechazo(e.message);
    } finally {
      setOcupado(false);
    }
  }

  function noLlevo() {
    if (!hayRenglones) return;
    mandarConsultaPendiente();
    const anterior: VentaEnCurso = { renglones, medio, clienteId };
    const cuerpo = {
      items: renglones.map((r, i) => ({ producto_id: r.producto?.id ?? null, descripcion: r.descripcion, precio_ofrecido: cuentas[i]!.unitario })),
      dispositivo_id: describirDispositivo(),
    };
    consultaPorMandar = {
      mandar: () => { enviarOEncolar("consulta", "POST", "/consultas", cuerpo).catch(() => undefined); },
      reloj: window.setTimeout(mandarConsultaPendiente, DURACION_DEL_AVISO),
    };
    const estaConsulta = consultaPorMandar;
    setRenglones([]); setMedio(null); setClienteId("");
    avisar("Anotado como «No llevó»", {
      detalle: "Qué pidió y a cuánto se le ofreció.",
      accion: {
        texto: "Deshacer",
        alTocar: () => {
          if (consultaPorMandar !== estaConsulta) return; // ya salió
          window.clearTimeout(estaConsulta.reloj);
          consultaPorMandar = null;
          setRenglones(anterior.renglones); setMedio(anterior.medio); setClienteId(anterior.clienteId);
        },
      },
    });
    buscador.current?.focus();
  }

  function nuevaVenta() {
    setCobrada(null);
    window.setTimeout(() => buscador.current?.focus(), 0);
  }

  // ---- Teclado

  function teclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((m) => Math.min(m + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((m) => Math.max(m - 1, 0)); }
    else if (e.key === "Escape" && consulta !== "") { e.preventDefault(); setConsulta(""); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const texto = consulta.trim();
      const elegido = resultados[Math.min(marcado, resultados.length - 1)];
      if (elegido) elegirResultado(elegido);
      // Un lector de códigos «escribe» los números y aprieta Enter.
      else if (/^\d{8,14}$/.test(texto)) leerCodigo(texto);
      else if (texto) setHoja("libre");
      else void cobrar(); // con la venta armada, el Enter final la cierra
    }
  }

  const hayVentana = hoja !== null || cobrada !== null;
  useEffect(() => {
    const tecla = (e: globalThis.KeyboardEvent) => {
      if (hayVentana) return;
      const medioDeLaTecla = TECLAS_DE_MEDIO[e.key];
      if (medioDeLaTecla) { e.preventDefault(); if (hayRenglones) elegirComoPaga(medioDeLaTecla); }
      else if (e.key === "F2") { e.preventDefault(); void cobrar(); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  // ---- Pantalla de éxito

  if (cobrada) {
    return (
      <Pagina titulo="Nueva venta" ancho="completo" testId="vender">
        {cobrada.encolada ? (
          <Exito tipo="pendiente" titulo="Venta guardada sin conexión" importe={pesos(cobrada.total)} detalle={`${cobrada.comoPago}. Se envía sola cuando vuelva internet.`} boton="Nueva venta" alSeguir={nuevaVenta} />
        ) : (
          <Exito titulo="Venta registrada" importe={pesos(cobrada.total)} detalle={cobrada.comoPago} boton="Nueva venta" alSeguir={nuevaVenta} />
        )}
      </Pagina>
    );
  }

  // ---- Venta

  const buscando = consulta.trim() !== "";

  return (
    <Pagina titulo="Nueva venta" ancho="completo" testId="vender">
      <div className="vender">
        <section className="vender__buscar" aria-label="Agregar productos">
          {!catalogo && !errorDelCatalogo && <Cargando texto="Bajando el catálogo…" detalle="Es solo la primera vez. Después se busca al instante, también sin internet." />}
          {!catalogo && errorDelCatalogo && <ErrorDeCarga titulo="No se pudo bajar el catálogo" alReintentar={alReintentar}>{errorDelCatalogo}</ErrorDeCarga>}

          {catalogo && (
            <>
              <Buscador
                ref={buscador}
                valor={consulta}
                alCambiar={(texto) => { setConsulta(texto); setMarcado(0); }}
                alTeclear={teclear}
                alEscanear={() => setHoja(esCelular ? "escaner" : "celular")}
                etiqueta="Buscar un producto para agregarlo a la venta"
                placeholder={esCelular ? "Buscá por nombre o código" : "Escribí el nombre del producto o el código"}
                controla={idResultados}
                activo={resultados.length > 0 ? `${idResultados}-${Math.min(marcado, resultados.length - 1)}` : undefined}
                autoFocus={!esCelular}
              />

              {errorDelCatalogo && <Aviso tipo="alerta" titulo="No se pudo actualizar el catálogo">{errorDelCatalogo}. Se usa el que está guardado en este dispositivo.</Aviso>}

              {codigoSuelto && (
                <Aviso tipo="alerta" titulo={`El código ${codigoSuelto} no está en el catálogo`} accion={{ texto: "Descartar", alTocar: () => setCodigoSuelto(null) }} testId="codigo-desconocido">
                  Buscá el producto para asociarlo: la próxima vez se agrega solo.
                </Aviso>
              )}

              {buscando && (
                <div className="vender__resultados" id={idResultados} role="listbox" aria-label="Productos encontrados" data-testid="sugerencias">
                  {resultados.map((p, i) => {
                    const precio = precioDeLista(p);
                    return (
                      <button key={p.id} type="button" role="option" id={`${idResultados}-${i}`} aria-selected={i === marcado} className={clases("vender__resultado", i === marcado && "vender__resultado--marcado")} onClick={() => elegirResultado(p)} onMouseEnter={() => setMarcado(i)} data-testid="sugerencia">
                        <span className="vender__resultado-texto"><strong>{p.descripcion}</strong><span>{p.marca ?? p.proveedor ?? ""}</span></span>
                        {precio !== null ? <span className="vender__resultado-precio"><strong className="cifra">{pesos(precio)}</strong>{vaConDecimal(p.unidad) && <span>{porUnidad(p.unidad)}</span>}</span> : <Pastilla tipo="alerta">Sin precio</Pastilla>}
                        <span className="vender__sumar" aria-hidden="true"><Icono nombre="mas" tam={20} /></span>
                      </button>
                    );
                  })}
                  {resultados.length === 0 && (
                    <div className="vender__sin-resultados">
                      <p>No hay productos con «{consulta.trim()}».</p>
                      <Boton icono="mas" onClick={() => setHoja("libre")} data-testid="agregar-libre">Agregarlo igual, con el precio a mano</Boton>
                    </div>
                  )}
                  {resultados.length > 0 && !esCelular && <p className="vender__teclas" data-testid="teclas">Enter agrega el marcado · las flechas cambian cuál</p>}
                </div>
              )}

              {!buscando && (
                <div className="vender__atajos">
                  <div className="vender__otros">
                    <Boton variante="texto" tam="chico" icono="mas" onClick={() => setHoja("libre")}>Agregar algo que no está en productos</Boton>
                    {!esCelular && (celularVinculado
                      ? <span className="vender__vinculado" data-testid="celular-vinculado"><Pastilla tipo="bien" icono="celular">Celular vinculado</Pastilla><Boton tam="chico" onClick={desvincular}>Desvincular</Boton></span>
                      : <Boton icono="celular" onClick={() => setHoja("celular")} data-testid="vincular-celular">Escanear con el celular</Boton>)}
                    {esCelular && vinculadoALaComputadora && <Pastilla tipo="bien" icono="computadora" testId="celular-vinculado-remoto">Vinculado a la computadora</Pastilla>}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="vender__venta" aria-label="Esta venta">
          <header className="vender__cabeza">
            <h2>Esta venta</h2>
            {hayRenglones && <Pastilla>{renglones.length === 1 ? "1 producto" : `${renglones.length} productos`}</Pastilla>}
            {hayRenglones && <Boton tam="chico" className="vender__no-llevo" onClick={noLlevo} data-testid="no-llevo">No llevó</Boton>}
          </header>

          {!hayRenglones && catalogo && (
            <Vacio icono="vender" titulo="Todavía no hay nada en la venta" testId="venta-vacia">
              {esCelular ? "Escribí el nombre del producto o escaneá el código." : "Escribí el nombre del producto o escaneá el código con el celular."}
            </Vacio>
          )}

          {hayRenglones && (
            <>
              <ul className="vender__renglones" data-testid="venta">
                {renglones.map((r, i) => (
                  <RenglonDeLaVenta
                    key={r.clave}
                    renglon={r}
                    cuenta={cuentas[i]!}
                    recien={recien === r.clave}
                    alCambiar={(cambios) => cambiarRenglon(r.clave, cambios)}
                    alQuitar={() => quitar(r.clave)}
                    alElegirMargen={(m) => elegirMargen(r, m)}
                    alCambiarUnidad={(u) => cambiarUnidad(r, u)}
                  />
                ))}
              </ul>

              <div className="vender__pago" data-testid="cobro">
                <Segmentos forma="grilla" etiqueta="Cómo paga" opciones={MEDIOS_DE_PAGO} elegido={medio} alElegir={elegirComoPaga} testId="medio" />
                {medio === "cuenta_corriente" && (cliente ? (
                  <div className="vender__cliente" data-testid="cliente">
                    <Iniciales nombre={cliente.nombre} tono="verde" forma="cuadrada" />
                    <span><strong>{cliente.nombre}</strong><span>{debe(cliente)}</span></span>
                    <Boton tam="chico" onClick={() => setHoja("cliente")}>Cambiar</Boton>
                  </div>
                ) : (
                  <Boton icono="usuario" ancho onClick={() => setHoja("cliente")} data-testid="cliente">Elegir el cliente</Boton>
                ))}
              </div>

              <BarraDeAccion className="vender__cobro">
                {rechazo && <Aviso tipo="error" titulo="No se pudo cobrar" testId="error-cobro">{rechazo}. La venta sigue armada: corregila y cobrá de nuevo.</Aviso>}
                {!rechazo && intentoCobrar && falta && <Aviso tipo="alerta" titulo={falta.titulo} testId="error-cobro">{falta.detalle}</Aviso>}
                <p className="vender__total"><span>Total</span><strong className="cifra" data-testid="total">{pesos(total)}</strong></p>
                <Boton variante="principal" tam="grande" iconoFinal="flecha" className="vender__cobrar" disabled={ocupado} aria-keyshortcuts="F2" onClick={() => void cobrar()} data-testid="cobrar">
                  {ocupado ? "Cobrando…" : <>Cobrar<span className="vender__cobrar-importe"> {pesos(total)}</span></>}
                </Boton>
              </BarraDeAccion>
            </>
          )}
        </section>
      </div>

      <ElegirCliente abierta={hoja === "cliente"} clientes={clientes} alCerrar={() => setHoja(null)} alElegir={(id) => { setClienteId(id); setMedio("cuenta_corriente"); setHoja(null); }} />
      <AlgoQueNoEsta abierta={hoja === "libre"} sugerido={resultados.length === 0 ? consulta.trim() : ""} alCerrar={() => setHoja(null)} alAgregar={agregarLibre} />
      <Escaner abierto={hoja === "escaner"} alCerrar={() => { setHoja(null); setUltimoEscaneo(null); }} alLeer={alEscanear} seguido={vinculadoALaComputadora} ultimo={ultimoEscaneo} />
      <EscanearConElCelular abierta={hoja === "celular"} alCerrar={() => setHoja(null)} alVincular={(puestoId) => { alVincular(puestoId); setHoja(null); avisar("Celular vinculado", { detalle: "Lo que escanees con el celular aparece en esta venta." }); }} />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Renglón de la venta

type PropsDeRenglon = {
  renglon: RenglonDeVenta;
  cuenta: Cuenta;
  /** Recién agregado: se destaca un instante. */
  recien: boolean;
  alCambiar: (cambios: Partial<RenglonDeVenta>) => void;
  alQuitar: () => void;
  alElegirMargen: (margen: number) => void;
  alCambiarUnidad: (unidad: Unidad) => void;
};

function RenglonDeLaVenta({ renglon, cuenta, recien, alCambiar, alQuitar, alElegirMargen, alCambiarUnidad }: PropsDeRenglon) {
  const producto = renglon.producto;
  const detalle = cuenta.unitario === null ? null : !producto ? "No está en productos · precio a mano" : `${pesos(cuenta.unitario)} ${porUnidad(renglon.unidad)}`;
  const conMargenes = producto !== null && (renglon.conMargenes || cuenta.sinPrecio);

  return (
    <li className={clases("vender__renglon", cuenta.sinPrecio && "vender__renglon--sin-precio", recien && "vender__renglon--recien")} data-sin-precio={cuenta.sinPrecio || undefined} data-testid="item">
      <div className="vender__renglon-nombre">
        <strong>{renglon.descripcion}</strong>
        {cuenta.sinPrecio ? <Pastilla tipo="alerta" icono="alerta" testId="sin-precio">Sin precio</Pastilla> : <span>{detalle}</span>}
      </div>
      <div className="vender__renglon-cuenta">
        <Cantidad valor={renglon.cantidad} decimal={vaConDecimal(renglon.unidad)} etiqueta={`Cantidad de ${renglon.descripcion}`} alCambiar={(valor) => alCambiar({ cantidad: valor })} />
        {/* Cómo se vende queda guardado en el producto: por unidad, kilo, metro o litro. */}
        {producto && (
          <select className="vender__unidad vender__unidad--elegir" value={renglon.unidad} aria-label={`Cómo se vende ${renglon.descripcion}: por unidad, kilo, metro o litro`} onChange={(e) => alCambiarUnidad(e.target.value as Unidad)} data-testid="unidad">
            {UNIDADES.map((u) => <option key={u.valor} value={u.valor}>{u.valor === "unidad" ? "c/u" : nombreDeUnidad(u.valor, 2)}</option>)}
          </select>
        )}
        {cuenta.subtotal !== null && <span className="vender__subtotal-caja" data-testid="subtotal"><Explicado className="cifra vender__subtotal" valor={pesos(cuenta.subtotal)} pasos={cuenta.pasos} titulo={renglon.descripcion} /></span>}
        <Boton variante="texto" tam="chico" icono="basura" className="vender__quitar" aria-label={`Quitar ${renglon.descripcion} de la venta`} onClick={alQuitar} data-testid="quitar" />
      </div>

      {conMargenes && producto && (
        <div className="vender__precio">
          {cuenta.costo !== null ? (
            <>
              <p>{cuenta.sinPrecio ? "Elegí el margen:" : "Margen elegido:"} <span className="detalle">costo {pesosConCentavos(cuenta.costo)}</span></p>
              <Margenes etiqueta={`Margen de ${renglon.descripcion}`} elegido={renglon.precioAMano === null ? producto.margen_elegido : null} alElegir={alElegirMargen} />
            </>
          ) : <p>Todavía no tiene costo en ninguna lista de precios.</p>}
          <Campo
            className="vender__a-mano"
            etiqueta={cuenta.costo !== null ? "O el precio a mano, solo para esta venta" : "Poné el precio a mano, solo para esta venta"}
            prefijo="$"
            inputMode="numeric"
            value={renglon.precioAMano === null ? "" : pesos(renglon.precioAMano).slice(1)}
            onChange={(e) => alCambiar({ precioAMano: leerPesos(e.target.value) || null })}
            data-testid="precio-manual"
          />
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- Hojas

function ElegirCliente({ abierta, clientes, alCerrar, alElegir }: { abierta: boolean; clientes: Cliente[]; alCerrar: () => void; alElegir: (id: string) => void }) {
  const [consulta, setConsulta] = useState("");
  useEffect(() => { if (abierta) setConsulta(""); }, [abierta]);
  const palabras = consulta.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const conCuenta = clientes.filter((c) => c.cuenta_corriente !== false);
  const encontrados = conCuenta.filter((c) => palabras.every((p) => c.nombre.toLowerCase().includes(p)));
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="¿A la cuenta de quién?" testId="hoja-clientes">
      {conCuenta.length === 0 ? (
        <Vacio icono="usuario" titulo="Todavía no hay clientes con cuenta corriente">Por ahora, cobrá con otro medio de pago.</Vacio>
      ) : (
        <>
          <Buscador valor={consulta} alCambiar={setConsulta} etiqueta="Buscar cliente por nombre" placeholder="Escribí el nombre del cliente" autoFocus testId="buscar-cliente"
            alTeclear={(e) => { if (e.key === "Enter" && encontrados[0]) { e.preventDefault(); alElegir(encontrados[0].id); } }} />
          {encontrados.length > 0 ? (
            <Lista>
              {encontrados.map((c) => (
                <Renglon key={c.id} inicio={<Iniciales nombre={c.nombre} tono="verde" forma="cuadrada" />} titulo={c.nombre} detalle={debe(c)} alTocar={() => alElegir(c.id)} testId="cliente-opcion" />
              ))}
            </Lista>
          ) : (
            <Aviso tipo="info" titulo={`No hay clientes con «${consulta.trim()}»`}>Probá con otra parte del nombre.</Aviso>
          )}
        </>
      )}
    </Hoja>
  );
}

function AlgoQueNoEsta({ abierta, sugerido, alCerrar, alAgregar }: { abierta: boolean; sugerido: string; alCerrar: () => void; alAgregar: (descripcion: string, precio: number) => void }) {
  const [que, setQue] = useState("");
  const [cuanto, setCuanto] = useState<number | null>(null);
  const [revisado, setRevisado] = useState(false);
  useEffect(() => { if (abierta) { setQue(sugerido); setCuanto(null); setRevisado(false); } }, [abierta, sugerido]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (que.trim() === "" || !cuanto) return;
    alAgregar(que.trim(), cuanto);
    alCerrar();
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Algo que no está en productos" testId="hoja-libre">
      <form className="vender__libre" onSubmit={enviar} noValidate>
        <Campo etiqueta="¿Qué es?" value={que} onChange={(e) => setQue(e.target.value)} placeholder="Por ejemplo: corte de chapa" error={revisado && que.trim() === "" ? "Escribí qué se lleva." : null} autoFocus={sugerido === ""} data-testid="descripcion-libre" />
        <Campo etiqueta="¿A cuánto?" prefijo="$" inputMode="numeric" value={cuanto === null ? "" : pesos(cuanto).slice(1)} onChange={(e) => setCuanto(leerPesos(e.target.value))} placeholder="Por ejemplo 5.000" error={revisado && !cuanto ? "Poné el precio." : null} autoFocus={sugerido !== ""} data-testid="precio-libre" />
        <Boton type="submit" variante="principal" tam="grande" ancho data-testid="agregar-a-la-venta">Agregar a la venta</Boton>
      </form>
    </Hoja>
  );
}

// En la computadora: un QR que el celular lee con su cámara. Queda vinculado unas horas y lo
// que escanea aparece en esta venta.
function EscanearConElCelular({ abierta, alCerrar, alVincular }: { abierta: boolean; alCerrar: () => void; alVincular: (puestoId: string) => void }) {
  const [enlace, setEnlace] = useState<string | null>(null);
  const [vencido, setVencido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const vincular = useRef(alVincular);
  vincular.current = alVincular;

  useEffect(() => {
    if (!abierta) return;
    let vigente = true;
    let reloj: number | null = null;
    setEnlace(null); setVencido(false); setError(null);
    (async () => {
      try {
        const { id, codigo, expiraEnSegundos } = await api<{ id: string; codigo: string; expiraEnSegundos: number }>("/puestos", { method: "POST", body: JSON.stringify({ nombre: "computadora del mostrador" }) });
        if (!vigente) return;
        const direccion = `${location.origin}${location.pathname}#/vincular-celular?codigo=${encodeURIComponent(codigo)}`;
        setEnlace(direccion);
        // Para las pruebas automáticas: el enlace que el celular abriría.
        (window as unknown as { __enlaceVinculacion?: string }).__enlaceVinculacion = direccion;
        const fin = Date.now() + expiraEnSegundos * 1000;
        reloj = window.setInterval(async () => {
          if (Date.now() > fin) { if (reloj !== null) window.clearInterval(reloj); setEnlace(null); setVencido(true); return; }
          const estado = await api<{ vinculado_en: string | null; expira_en: string }>(`/puestos/${id}`).catch(() => null);
          if (vigente && estado?.vinculado_en) {
            if (reloj !== null) window.clearInterval(reloj);
            guardarPuestoLocal({ id, expira_en: estado.expira_en });
            vincular.current(id);
          }
        }, 2000);
      } catch (e) {
        if (vigente) setError(e instanceof ErrorApi ? e.message : "Para vincular el celular hace falta internet. Revisá la conexión y probá de nuevo.");
      }
    })();
    return () => { vigente = false; if (reloj !== null) window.clearInterval(reloj); };
  }, [abierta, vuelta]);

  const otraVez = () => setVuelta((n) => n + 1);
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Escanear con el celular" testId="hoja-vincular">
      {error && <Aviso tipo="error" titulo="No se pudo armar el código" accion={{ texto: "Reintentar", alTocar: otraVez }}>{error}</Aviso>}
      {vencido && <Aviso tipo="alerta" titulo="El código venció" accion={{ texto: "Generar otro", alTocar: otraVez }}>Vale 5 minutos.</Aviso>}
      {!error && !vencido && (
        <>
          <div className="vender__vincular">
            {enlace ? <Qr texto={enlace} lado={190} etiqueta="Código para vincular el celular" testId="qr-vincular" /> : <Cargando texto="Armando el código…" />}
            <ol>
              <li><span>Abrí la cámara del celular y apuntá a este código.</span></li>
              <li><span>Tocá el enlace que aparece.</span></li>
              <li><span>Listo: lo que escanees con el celular aparece en esta venta.</span></li>
            </ol>
          </div>
          <p className="detalle">El código vence en 5 minutos. No hace falta instalar nada en el celular.</p>
        </>
      )}
    </Hoja>
  );
}
