// Lo que el servidor responde sobre los pedidos a los proveedores. Solo tipos: el cliente web
// los toma al compilar (ADR-018), así que acá no va código ni nombres de tablas. Las
// cantidades y los costos llegan como texto, con sus decimales.

export type EstadoDePedido = "borrador" | "enviado" | "recibido_parcial" | "recibido" | "cancelado" | "cerrado_incompleto";

// Un renglón, con el código del producto para ese proveedor. El costo estimado lo ve solo
// quien arma el pedido.
export type ItemDePedido = { producto_id: string; descripcion: string; marca: string | null; unidad: string; codigo_proveedor: string | null; cantidad: string; costo_estimado: string | null; recibido: string };

// GET /pedidos (los últimos 100; con `todos`, también los cerrados) y GET /pedidos/:id
export type Pedido = {
  id: string; estado: EstadoDePedido;
  proveedor_id: string; proveedor: string; whatsapp: string | null; creado_en: string; enviado_en: string | null; cerrado_en: string | null;
  enviado_por: string | null; cerrado_por: string | null; items: ItemDePedido[];
};

// PUT /pedidos/:id: guarda el borrador entero; lo crea si no existe.
export type BorradorDePedido = { proveedor_id?: string; items?: { producto_id: string; cantidad: number }[] };
export type BorradorGuardado = { id: string };

// POST /pedidos/:id/enviar: con el WhatsApp del proveedor, si se lo manda por ahí.
export type EnvioDePedido = { whatsapp?: string };
