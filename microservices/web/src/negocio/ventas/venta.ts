import type { MedioDePago } from "@servidor/ventas";
import { CONSULTAS, ventasCambiaron } from "./ventas-del-dia";
import { IVA_SI_NO_SE_SABE, precioDelProducto } from "../catalogo/precio";
import { consultas } from "../../consultas";
import { useCallback, useEffect, useMemo, useState } from "react";
import { margenReal, precioDeVenta, subtotalDeRenglon } from "../precios/vista-previa";
import { ErrorApi, subirFoto } from "../../api";
import { borrarAnterioresA, guardar } from "../../almacen";
import { traerPorCodigo, useCatalogo } from "../../catalogo";
import { enviarOEncolar, enviarPendientes } from "../../cola";
import { contarAlEspejo, useEspejar } from "../../espejo";
import { pesos, pesosCortos } from "../../formato";
import type { Producto } from "../../producto";
import { cantidadValida, unidadDe, type Unidad } from "../../unidades";
import { renglonesDelEspejo, ventaParaElEspejo, type VentaEnEspejo } from "./venta-en-espejo";

// La venta, una sola vez para el celular y la computadora (RNF-60). Acá están los renglones,
// el precio de cada uno, cómo se paga, cobrar y «no llevó». Las pantallas solo muestran y
// reciben lo que la persona toca: qué tecla, qué hoja y qué texto son cosa de cada interfaz.
export type Medio = MedioDePago;
export const NOMBRE_DE_MEDIO: Record<Medio, string> = { efectivo: "Efectivo", mercado_pago: "Mercado Pago", tarjeta: "Tarjeta", cuenta_corriente: "Cuenta corriente" };
export const MEDIOS = Object.keys(NOMBRE_DE_MEDIO) as Medio[];
// Para un medio que llega como texto suelto (el registro de acciones): su nombre, o el texto tal cual.
export const nombreDeMedio = (medio: string): string => (NOMBRE_DE_MEDIO as Record<string, string>)[medio] ?? medio;

export type Item = {
  clave: string; producto: Producto | null; descripcion: string; cantidad: number;
  unidad: Unidad; // por unidades enteras o por kilo, metro o litro (con un decimal)
  precioManual: number | null; // precio tipeado para esta venta; pisa al margen y no se guarda en el producto
  abierto: boolean; // el margen y el precio a mano desplegados (lo decide la pantalla)
};

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

// Lo que quedó de una venta recién cobrada, para que cada pantalla lo cuente con sus palabras.
export type Cobro = { total: number; encolado: boolean; medio: Medio; cliente: string | null; productos: number; fecha: string };

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

const MEDIO_DE_ARRANQUE: Medio = "efectivo"; // lo más común, y muestra que los medios se tocan

export function useVenta(opciones: OpcionesDeVenta) {
  const { catalogo, catalogoCompleto, clientes, actualizarProducto, ajustarStockLocal, enElServidor } = useCatalogo();
  const [items, setItems] = useState<Item[]>([]);
  const [medio, setMedio] = useState<Medio | null>(MEDIO_DE_ARRANQUE);
  const [clienteId, setClienteId] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codigoDesconocido, setCodigoDesconocido] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [cobro, setCobro] = useState<Cobro | null>(null);

  // En espejo con el otro dispositivo (decisión 60): la venta es una sola, la arme quien la arme.
  useEspejar<VentaEnEspejo>("venta", useMemo(() => ventaParaElEspejo(items, medio, clienteId), [items, medio, clienteId]), (v) => {
    setItems((previos) => renglonesDelEspejo(v, catalogo ?? [], previos));
    setMedio(v.medio as Medio | null); setClienteId(v.clienteId);
  }, catalogo !== null && catalogoCompleto !== false); // con el catálogo a medio cargar no se reconocerían los productos

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
  const total = items.reduce((s, it) => s + subtotalDeRenglon({ precioUnitario: precioDe(it).unitario ?? 0, cantidad: it.cantidad }).valor, 0);
  const sinPrecio = items.some((it) => precioDe(it).unitario === null);
  const cliente = clientes.find((c) => c.id === clienteId);

  const { alCambiar } = opciones;
  const agregar = useCallback((p: Producto | null, descripcionLibre?: string) => {
    setItems((lista) => {
      if (p) {
        const ya = lista.find((it) => it.producto?.id === p.id);
        if (ya) return lista.map((it) => (it === ya ? { ...it, cantidad: it.cantidad + 1 } : it));
        return [...lista, { clave: crypto.randomUUID(), producto: p, descripcion: p.descripcion, cantidad: 1, unidad: unidadDe(p), precioManual: null, abierto: p.margen_elegido === null }];
      }
      return [...lista, { clave: crypto.randomUUID(), producto: null, descripcion: descripcionLibre ?? "", cantidad: 1, unidad: "unidad", precioManual: null, abierto: false }];
    });
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
  function elegirMedio(valor: Medio) {
    setMedio(valor);
    if (valor === "cuenta_corriente" && !clienteId) opciones.alFaltarCliente?.();
  }
  const vaciar = () => { setItems([]); setMedio(MEDIO_DE_ARRANQUE); setClienteId(""); };

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
      cliente_id: medio === "cuenta_corriente" ? clienteId : null,
      dispositivo_id: opciones.dispositivo(),
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
      contarAlEspejo(`Venta de ${pesosCortos(total)} cobrada en ${opciones.lado === "computadora" ? "la computadora" : "el celular"}`);
      const hecho: Cobro = { total, encolado, medio, cliente: cliente?.nombre ?? null, productos: items.length, fecha: cuerpo.fecha };
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
    enviarOEncolar("consulta", "POST", "/consultas", { items: consultaItems, dispositivo_id: opciones.dispositivo() }).then(({ encolado }) => { if (!encolado) void consultas.invalidateQueries({ queryKey: CONSULTAS }); }).catch(() => undefined);
    vaciar();
    setMensaje(aviso);
    alCambiar?.("no-llevo");
  }

  return {
    items, medio, setMedio, clienteId, setClienteId, cliente, total, sinPrecio,
    mensaje, setMensaje, error, setError, ocupado, codigoDesconocido, setCodigoDesconocido,
    cobro, cerrarCobro: () => setCobro(null),
    agregar, agregarPorCodigo, cambiarItem, cambiarUnidad, quitar, elegirMargen, subirFotoDe, elegirSugerencia, elegirMedio, cobrar, noLlevo,
  };
}
