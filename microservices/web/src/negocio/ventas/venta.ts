import type { ConsultaEntrada, MedioDePago, VentaEntrada } from "@servidor/ventas";
import { CONSULTAS, ventasCambiaron } from "./ventas-del-dia";
import { IVA_SI_NO_SE_SABE, precioDelProducto } from "../catalogo/precio";
import { consultas } from "../../consultas";
import { useCallback, useEffect, useState } from "react";
import { margenReal, precioDeVenta, subtotalDeRenglon } from "../precios/vista-previa";
import { ErrorApi, subirFoto } from "../../api";
import { borrarAnterioresA, guardar } from "../../almacen";
import { traerPorCodigo, useCatalogo } from "../../catalogo";
import { enviarOEncolar, enviarPendientes } from "../../cola";
import { contarAlEspejo } from "../../espejo";
import { pesos, pesosCortos } from "../../formato";
import type { Producto } from "../../producto";
import { cantidadValida, type Unidad } from "../../unidades";
import { agregarALaVenta, ponerCliente, ponerItems, ponerMedio, useVentaEnCurso, vaciarVenta, type Item } from "./venta-en-curso";
export type { Item };

// La venta, una sola vez para el celular y la computadora (RNF-60). Acá están los renglones,
// el precio de cada uno, cómo se paga, cobrar y «no llevó». Las pantallas solo muestran y
// reciben lo que la persona toca: qué tecla, qué hoja y qué texto son cosa de cada interfaz.
export type Medio = MedioDePago;
export const NOMBRE_DE_MEDIO: Record<Medio, string> = { efectivo: "Efectivo", mercado_pago: "Mercado Pago", tarjeta: "Tarjeta", cuenta_corriente: "Cuenta corriente" };
export const MEDIOS = Object.keys(NOMBRE_DE_MEDIO) as Medio[];
// Para un medio que llega como texto suelto (el registro de acciones): su nombre, o el texto tal cual.
export const nombreDeMedio = (medio: string): string => (NOMBRE_DE_MEDIO as Record<string, string>)[medio] ?? medio;


// El precio de un renglón y de dónde sale: del precio puesto a mano, o del costo con su margen.
export function precioDe(item: Item): { unitario: number | null; pasos: string[]; margen: number | null; costo: number | null; iva: number } {
  const p = item.producto;
  const costo = p?.costo_neto != null ? Number(p.costo_neto) : null;
  const iva = p?.iva != null ? Number(p.iva) : IVA_SI_NO_SE_SABE;
  if (item.precioManual !== null) {
    const real = costo !== null ? margenReal({ costoNeto: costo, iva, precio: item.precioManual }) : null;
    return { unitario: item.precioManual, pasos: real ? real.pasos : [`Precio puesto a mano ${pesos(item.precioManual)}`], margen: null, costo, iva };
  }
  const r = p ? precioDelProducto(p).calculo : null;
  if (p && r) return { unitario: r.valor, pasos: r.pasos, margen: p.margen_elegido, costo, iva };
  return { unitario: null, pasos: [], margen: null, costo, iva };
}

// Un renglón con precio a mano (tipeado, o un ítem libre) se cobra tal cual (decisión 128).
export const esAMano = (item: Item) => item.precioManual !== null || !item.producto;

// El subtotal de un renglón (precio × cantidad, redondeado como se cobra), con sus pasos; sin precio, ninguno.
export function subtotalDe(item: Item) {
  const unitario = precioDe(item).unitario;
  return unitario === null ? null : subtotalDeRenglon({ precioUnitario: unitario, cantidad: item.cantidad, unidad: item.unidad, aMano: esAMano(item) });
}

// «De dónde sale» en filas, como la maqueta de la v2 (decisión 127): cada paso con su importe,
// del costo al total del renglón. Sin permiso para ver costos, desde el precio.
export type FilaDeLaCuenta = { texto: string; valor: string };
export function cuentaDelRenglon(item: Item, veCostos: boolean): { filas: FilaDeLaCuenta[]; total: number } | null {
  const p = precioDe(item);
  const renglon = subtotalDe(item);
  if (p.unitario === null || !renglon) return null;
  const filas: FilaDeLaCuenta[] = [];
  const prod = item.producto;
  if (item.precioManual !== null) filas.push({ texto: "Precio a mano, solo esta venta", valor: pesosCortos(p.unitario) });
  else if (veCostos && p.costo !== null && p.margen !== null) {
    const origen = [prod?.proveedor, prod?.fecha_lista ? `lista del ${fechaCorta(prod.fecha_lista)}` : null].filter(Boolean).join(", ");
    const conMargen = p.costo * (1 + p.margen / 100);
    filas.push({ texto: `Costo${origen ? ` · ${origen}` : ""}`, valor: pesos(p.costo) });
    filas.push({ texto: `+ margen ${p.margen} %`, valor: pesosCortos(conMargen) });
    filas.push({ texto: `+ IVA ${Math.round(p.iva * 100)} %`, valor: pesosCortos(conMargen * (1 + p.iva)) });
    filas.push({ texto: "Precio, para arriba a $1.000", valor: pesosCortos(p.unitario) });
  } else filas.push({ texto: "Precio", valor: pesosCortos(p.unitario) });
  const bruto = Math.round(p.unitario * item.cantidad * 100) / 100;
  if (item.cantidad !== 1) filas.push({ texto: `× ${String(item.cantidad).replace(".", ",")}${item.unidad === "unidad" ? "" : ` ${item.unidad}`}`, valor: pesosCortos(bruto) });
  if (renglon.valor !== bruto) filas.push({ texto: "Para arriba a $1.000, para no dar vuelto", valor: pesosCortos(renglon.valor) });
  return { filas, total: renglon.valor };
}
const fechaCorta = (iso: string) => { const [, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}`; };

// Lo que quedó de una venta recién cobrada, para que cada pantalla lo cuente con sus palabras.
// `items` son los renglones tal como se cobraron, para mostrarlos en el éxito.
export type Cobro = { total: number; encolado: boolean; medio: Medio; cliente: string | null; productos: number; fecha: string; items: Item[] };

// Por qué no se pudo cobrar: cada interfaz tiene su texto para cada motivo.
export type MotivoDeNoCobrar = "sin-precio" | "sin-medio" | "sin-cliente";

export type MotivoDeCambio = "agregar" | "quitar" | "no-llevo";
export type OpcionesDeVenta = {
  // Desde dónde se vende: se le cuenta al otro dispositivo cuando están en espejo.
  lado: "computadora" | "celular";
  dispositivo: () => string;
  // Quién puede fijar márgenes deja el margen elegido guardado en el producto; si no, vale para esta venta.
  fijaMargen: boolean;
  textoDe: (motivo: MotivoDeNoCobrar) => string;
  // El servidor rechazó la venta: cómo se dice en esta interfaz.
  textoDeRechazo: (mensaje: string) => string;
  // La venta cambió por algo que la persona hizo (agregó, quitó, no llevó): la pantalla acomoda el foco.
  alCambiar?: (motivo: MotivoDeCambio) => void;
  alFaltarCliente?: () => void;
  alCobrar?: (cobro: Cobro) => void;
};

export function useVenta(opciones: OpcionesDeVenta) {
  const { catalogo, clientes, actualizarProducto, ajustarStockLocal, enElServidor } = useCatalogo();
  // La venta en curso no es de esta pantalla (ADR-022): la comparte la aplicación entera.
  const { items, medio, clienteId } = useVentaEnCurso();
  const setItems = ponerItems, setMedio = ponerMedio, setClienteId = ponerCliente;
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codigoDesconocido, setCodigoDesconocido] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [cobro, setCobro] = useState<Cobro | null>(null);

  // Un aviso («elegí el cliente», «elegí cómo paga») se va solo apenas se corrige su causa.
  useEffect(() => { setError(null); }, [items, medio, clienteId]);
  useEffect(() => {
    const reintentar = () => { enviarPendientes().catch(() => undefined); };
    window.addEventListener("online", reintentar);
    // Las ventas confirmadas se conservan 7 días en el dispositivo (ADR-002).
    borrarAnterioresA("ventas", "fecha", new Date(Date.now() - 7 * 86400000).toISOString()).catch(() => undefined);
    return () => window.removeEventListener("online", reintentar);
  }, []);

  // Cada renglón se redondea para arriba a $1.000: toda venta es múltiplo de $1.000.
  const total = items.reduce((s, it) => s + subtotalDeRenglon({ precioUnitario: precioDe(it).unitario ?? 0, cantidad: it.cantidad, aMano: esAMano(it) }).valor, 0);
  const sinPrecio = items.some((it) => precioDe(it).unitario === null);
  const cliente = clientes.find((c) => c.id === clienteId);

  const { alCambiar } = opciones;
  const agregar = useCallback((p: Producto | null, descripcionLibre?: string) => {
    agregarALaVenta(p, descripcionLibre);
    setMensaje(null);
    alCambiar?.("agregar");
  }, [alCambiar]);

  // Un código de barras, venga de la cámara, del celular vinculado o de un lector que tipea y
  // manda Enter: si es de un producto, se agrega; si no, se ofrece asociarlo. Devuelve si se
  // lo reconoció (o si se lo está buscando en el servidor).
  const agregarPorCodigo = useCallback((codigo: string): boolean => {
    const c = codigo.trim();
    const exacto = (catalogo ?? []).find((p) => p.codigo_barras === c || p.codigo_proveedor === c);
    if (exacto) { agregar(exacto); setCodigoDesconocido(null); return true; }
    // Buscando en el servidor (RF-85), el producto puede no estar en memoria: se lo pide por su código.
    if (enElServidor) {
      void traerPorCodigo(c).then((p) => { if (p) { agregar(p); setCodigoDesconocido(null); } else setCodigoDesconocido(c); }).catch((e: Error) => setError(e.message));
      return true;
    }
    setCodigoDesconocido(c);
    return false;
  }, [catalogo, agregar, enElServidor]);

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
    alCambiar?.("quitar");
  }
  function elegirMargen(item: Item, margen: number) {
    if (!item.producto) return;
    if (opciones.fijaMargen) actualizarProducto(item.producto.id, { margen_elegido: margen }).catch(() => undefined);
    cambiarItem(item.clave, { precioManual: null, producto: { ...item.producto, margen_elegido: margen } });
  }
  async function subirFotoDe(item: Item, archivo: File) {
    if (!item.producto) return;
    const foto_url = await subirFoto(item.producto.id, archivo);
    actualizarProducto(item.producto.id, { foto_url }).catch(() => undefined);
    cambiarItem(item.clave, { producto: { ...item.producto, foto_url } });
  }
  // Elegir un producto de la búsqueda. Si se venía de leer un código que nadie tenía, se le
  // asocia a este producto: la próxima vez se encuentra directo.
  function elegirSugerencia(p: Producto) {
    if (codigoDesconocido) {
      actualizarProducto(p.id, { codigo_barras: codigoDesconocido }).catch(() => undefined);
      agregar({ ...p, codigo_barras: codigoDesconocido });
      setCodigoDesconocido(null);
    } else agregar(p);
  }
  // El cliente de la venta, o ninguno ("").
  const elegirCliente = (id: string) => setClienteId(id);
  function elegirMedio(valor: Medio) {
    setMedio(valor);
    if (valor === "cuenta_corriente" && !clienteId) opciones.alFaltarCliente?.();
  }
  const vaciar = vaciarVenta;

  async function cobrar() {
    if (items.length === 0 || ocupado) return;
    if (sinPrecio) { setError(opciones.textoDe("sin-precio")); return; }
    if (!medio) { setError(opciones.textoDe("sin-medio")); return; }
    if (medio === "cuenta_corriente" && !clienteId) { setError(opciones.textoDe("sin-cliente")); opciones.alFaltarCliente?.(); return; }
    setOcupado(true);
    setError(null);
    const id = crypto.randomUUID();
    const cuerpo = {
      id,
      fecha: new Date().toISOString(),
      medio_pago: medio,
      // El cliente es opcional con cualquier medio (003, historia 4, escenario 8); con cuenta corriente, obligatorio.
      cliente_id: clienteId || null,
      dispositivo_id: opciones.dispositivo(),
      items: items.map((it) => {
        const p = precioDe(it);
        return {
          producto_id: it.producto?.id ?? null, descripcion: it.descripcion, cantidad: it.cantidad, precio_unitario: p.unitario ?? 0,
          costo_neto: p.costo, margen_aplicado: p.margen, explicacion: { pasos: p.pasos, costo: it.producto?.explicacion_costo ?? [] },
        };
      }),
    } satisfies VentaEntrada;
    try {
      const { encolado } = await enviarOEncolar("venta", "POST", "/ventas", cuerpo);
      // Copia local de la venta (7 días) y stock que ve el mostrador.
      guardar("ventas", { id, fecha: cuerpo.fecha, total, medio_pago: medio, items: cuerpo.items, enviada: !encolado }).catch(() => undefined);
      for (const it of items) if (it.producto) ajustarStockLocal(it.producto.id, -it.cantidad);
      contarAlEspejo(`Venta de ${pesosCortos(total)} cobrada en ${opciones.lado === "computadora" ? "la computadora" : "el celular"}`);
      const hecho: Cobro = { total, encolado, medio, cliente: cliente?.nombre ?? null, productos: items.length, fecha: cuerpo.fecha, items: [...items] };
      setCobro(hecho);
      if (!encolado) void ventasCambiaron();
      opciones.alCobrar?.(hecho);
    } catch (e) {
      setOcupado(false);
      if (e instanceof ErrorApi) { setError(opciones.textoDeRechazo(e.message)); return; }
      throw e;
    }
    vaciar(); setOcupado(false);
  }

  // «No llevó»: preguntó el precio y no compró. Queda anotado qué preguntó.
  function noLlevo(aviso: string) {
    if (items.length === 0) return;
    const consultaItems = items.map((it) => ({ producto_id: it.producto?.id ?? null, descripcion: it.descripcion, precio_ofrecido: precioDe(it).unitario }));
    enviarOEncolar("consulta", "POST", "/consultas", { items: consultaItems, dispositivo_id: opciones.dispositivo() } satisfies ConsultaEntrada).then(({ encolado }) => { if (!encolado) void consultas.invalidateQueries({ queryKey: CONSULTAS }); }).catch(() => undefined);
    vaciar();
    setMensaje(aviso);
    alCambiar?.("no-llevo");
  }

  return {
    items, medio, setMedio, clienteId, setClienteId, cliente, total, sinPrecio,
    mensaje, setMensaje, error, setError, ocupado, codigoDesconocido, setCodigoDesconocido,
    cobro, cerrarCobro: () => setCobro(null),
    agregar, agregarPorCodigo, cambiarItem, cambiarUnidad, quitar, elegirMargen, subirFotoDe, elegirSugerencia, elegirMedio, elegirCliente, cobrar, noLlevo, vaciar,
    // Volver a poner los renglones que se vaciaron o quitaron (Deshacer).
    devolver: (renglones: Item[]) => setItems(renglones),
  };
}
