// Lo que el servidor responde sobre las ventas. Solo tipos: el cliente web los toma al
// compilar (ADR-018), así que acá no va código ni nombres de tablas. Lo que manda el front sale
// de la validación del servidor (decisión 89).
import type { z } from "zod";
import type { anulacionDeVenta, cambioDeVenta, consultaNueva, correccionDeVenta, MEDIOS, ventaNueva } from "../ventas/esquemas.js";

export type MedioDePago = (typeof MEDIOS)[number];
export type EstadoDeVenta = "confirmada" | "anulada";

// Los importes y las cantidades salen de la base como texto, con sus decimales.
// El subtotal del renglón lo calcula el servidor (precio × cantidad, redondeado como se cobró).
// La foto y la unidad son las del producto, si el renglón tiene producto (sin producto, «unidad»).
// Para corregir y cambiar (019): el `id` y el producto del renglón, cuánto ya volvió por cambios
// (`devuelto`), el cliente, la `version` de la venta (la marca de modificación) y cuántas correcciones tuvo.
export type ItemDeVenta = { id?: string; producto_id?: string | null; devuelto?: string; descripcion: string; cantidad: string; precio_unitario: string; margen_aplicado: string | null; explicacion: string | null; foto_url: string | null; unidad?: string; subtotal: number };
export type VentaDelDia = { id: string; fecha: string; medio_pago: MedioDePago; total: string; estado: EstadoDeVenta; pagada_en: string | null; cliente: string | null; cliente_id?: string | null; version?: string; correcciones?: number; items: ItemDeVenta[] };

// POST /ventas/:id/corregir (019)
export type CorreccionEntrada = z.input<typeof correccionDeVenta>;
export type VentaCorregida = { id: string; total: number; diferencia: number; resuelta: "cobrada" | "devuelta" | "cuenta_corriente" | "sin_diferencia"; version: string };

// GET /ventas/para-cambio?q=… (019, E11): las ventas confirmadas de los últimos 15 días que tienen un
// producto que coincide, de la más nueva a la más vieja, de a 20; cada renglón con lo que queda por
// devolver (`por_devolver`) y el precio por unidad que se pagó (`pagado`).
export type RenglonParaCambio = { id: string; producto_id: string | null; descripcion: string; cantidad: string; por_devolver: number; pagado: number; foto_url: string | null; unidad?: string };
export type VentaParaCambio = { id: string; fecha: string; medio_pago: MedioDePago; cliente: string | null; total: string; items: RenglonParaCambio[] };
// POST /ventas/:id/cambio (019)
export type CambioEntrada = z.input<typeof cambioDeVenta>;
export type CambioRegistrado = { id: string; venta_id: string; vuelve: number; se_lleva: number; diferencia: number; resuelto: "cobrado" | "devuelto" | "cuenta_corriente" | "sin_diferencia" };

// GET /ventas[?dia=AAAA-MM-DD]
// `movimientos`: lo cobrado (+) y lo devuelto (−) ese día por correcciones y cambios (019). `suma`: si
// entra en los totales (una corrección del mismo día ya está en el total corregido de la venta).
export type MovimientoDeDinero = { id: string; fecha: string; tipo: "cobro_diferencia" | "devolucion"; medio_pago: MedioDePago; importe: number; venta_id: string; correccion_id: string | null; cambio_id: string | null; suma: boolean };
export type VentasDelDia = { dia: string; ventas: VentaDelDia[]; totales: Partial<Record<MedioDePago, number>>; total: number; movimientos?: MovimientoDeDinero[] };

// POST /ventas. El id lo genera el cliente: una venta hecha sin conexión se reenvía y no se
// duplica (si ya estaba, responde la registrada con `repetida`). Cada renglón lleva lo que se
// cobró: precio, costo, margen y explicación de ese momento (decisión 86).
export type VentaEntrada = z.input<typeof ventaNueva>;
export type VentaRegistrada = { id: string; total: number; estado: string; repetida?: true };

// POST /ventas/:id/anular
export type AnulacionDeVenta = z.input<typeof anulacionDeVenta>;

// POST /consultas: «no llevó», cada producto consultado con lo que se le ofreció.
export type ConsultaEntrada = z.input<typeof consultaNueva>;
// GET /consultas: las últimas 200. El precio ofrecido llega como texto.
export type Consulta = { id: string; fecha: string; descripcion: string; precio_ofrecido: string | null; motivo: string | null };

// GET /ventas/ultimos-productos: los productos de las últimas ventas, del más reciente al más viejo (decisión 133).
export type UltimosProductos = { productos: string[] };
