// Lo que el servidor responde sobre las ventas. Solo tipos: el cliente web los toma al
// compilar (ADR-018), así que acá no va código ni nombres de tablas. Lo que manda el front sale
// de la validación del servidor (decisión 89).
import type { z } from "zod";
import type { anulacionDeVenta, consultaNueva, MEDIOS, ventaNueva } from "../ventas/esquemas.js";

export type MedioDePago = (typeof MEDIOS)[number];
export type EstadoDeVenta = "confirmada" | "anulada";

// Los importes y las cantidades salen de la base como texto, con sus decimales.
// El subtotal del renglón lo calcula el servidor (precio × cantidad, redondeado como se cobró).
export type ItemDeVenta = { descripcion: string; cantidad: string; precio_unitario: string; margen_aplicado: string | null; explicacion: string | null; subtotal: number };
export type VentaDelDia = { id: string; fecha: string; medio_pago: MedioDePago; total: string; estado: EstadoDeVenta; pagada_en: string | null; cliente: string | null; items: ItemDeVenta[] };

// GET /ventas[?dia=AAAA-MM-DD]
export type VentasDelDia = { dia: string; ventas: VentaDelDia[]; totales: Partial<Record<MedioDePago, number>>; total: number };

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
