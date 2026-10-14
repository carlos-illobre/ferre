// Lo que el servidor responde sobre las compras (el ingreso de mercadería). Solo tipos: el
// cliente web los toma al compilar (ADR-018), así que acá no va código ni nombres de tablas.
// Los importes y las cantidades que salen de la base llegan como texto, con sus decimales.

export type TipoDeComprobante = "factura" | "remito" | "sin_comprobante";

// POST /compras/fotos (multipart: foto): el nombre con que quedó guardada.
export type FotoDeComprobante = { foto: string };

// POST /compras. Un renglón sin producto da de alta uno nuevo para ese proveedor. Si la compra
// ya estaba (mismo id), responde la registrada con `repetida`.
export type ItemDeCompraEntrada = { producto_id?: string | null; descripcion: string; marca?: string | null; cantidad: number; costo_unitario: number };
export type CompraEntrada = { id?: string; proveedor_id: string; fecha?: string; comprobante_tipo: TipoDeComprobante; comprobante_numero?: string | null; foto?: string | null; nota?: string | null; pedido_id?: string | null; items: ItemDeCompraEntrada[] };
export type CompraRegistrada = { id: string; total: number; productos_nuevos: number; costos_actualizados: number; pedido?: string };
export type CompraRepetida = { id: string; total: number; repetida: true };

// GET /compras: las últimas 50.
export type CompraReciente = {
  id: string; fecha: string; comprobante_tipo: string; comprobante_numero: string | null; total: string; estado: string; nota: string | null; creado_en: string;
  proveedor: string; foto: string | null; renglones: string; items: { descripcion: string; cantidad: string; costo_unitario: string }[];
};

// GET /compras/semana: lo gastado en los últimos 7 días, por proveedor.
export type GastosDeLaSemana = { desde: string; por_proveedor: { proveedor: string; compras: string; total: string }[]; total: number };

// GET /compras/:id: los renglones.
export type RenglonDeCompra = { orden: number; cantidad: string; costo_unitario: string; descripcion: string; marca: string | null };

// POST /compras/:id/anular
export type AnulacionDeCompra = { motivo?: string };
