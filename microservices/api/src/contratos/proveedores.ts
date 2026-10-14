// Lo que el servidor responde sobre los proveedores. Solo tipos: el cliente web los toma al
// compilar (ADR-018), así que acá no va código ni nombres de tablas.

// GET /proveedores: todos, también los que ya no se usan, por nombre. Los descuentos llegan
// como texto, en fracción (0.1 es 10 %).
export type Proveedor = { id: string; nombre: string; precios_incluyen_iva: boolean; descuento_general: string; descuento_contado: string; lector: string | null; activo: boolean; whatsapp: string | null };

// POST /proveedores (alta, con el nombre obligatorio) y PATCH /proveedores/:id. Los descuentos
// van en fracción.
export type ProveedorEntrada = { nombre?: string; precios_incluyen_iva?: boolean; descuento_general?: number; descuento_contado?: number; lector?: string | null; activo?: boolean };
export type ProveedorCreado = { id: string };
