// Lo que el servidor responde sobre las ventas. Solo tipos: el cliente web los toma al
// compilar (ADR-018), así que acá no va código ni nombres de tablas.
export type MedioDePago = "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente";
export type EstadoDeVenta = "confirmada" | "anulada";

// Los importes y las cantidades salen de la base como texto, con sus decimales.
export type ItemDeVenta = { descripcion: string; cantidad: string; precio_unitario: string; margen_aplicado: string | null; explicacion: string | null };
export type VentaDelDia = { id: string; fecha: string; medio_pago: MedioDePago; total: string; estado: EstadoDeVenta; pagada_en: string | null; cliente: string | null; items: ItemDeVenta[] };

// GET /ventas[?dia=AAAA-MM-DD]
export type VentasDelDia = { dia: string; ventas: VentaDelDia[]; totales: Partial<Record<MedioDePago, number>>; total: number };
