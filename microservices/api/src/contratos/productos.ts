// Lo que el servidor responde sobre los productos. Solo tipos: el cliente web los toma al
// compilar (ADR-018), así que acá no va código ni nombres de tablas.

// Cada proveedor que tiene el producto, con su último costo.
export type CostoDeProveedor = { proveedor_id: string; proveedor: string; costo_neto: string; fecha_lista: string; codigo_proveedor: string };

// GET /productos: cada producto activo con el costo de su proveedor preferido (o el último) y el
// precio ya calculado en el servidor: el del margen elegido, con su explicación y el margen para
// el que se calculó, y el de cada uno de los cinco márgenes. Los importes que salen de la base
// llegan como texto, con sus decimales.
export type ProductoDelCatalogo = {
  id: string; descripcion: string; marca: string | null; codigo_barras: string | null; unidad: string;
  margen_elegido: number | null;
  sector_id: string | null; foto_url: string | null; modificado_en: string;
  proveedor_id: string | null; proveedor: string | null; codigo_proveedor: string | null;
  costo_neto: string | null; iva: string | null; fecha_lista: string | null; lista_importada_id: string | null; explicacion_costo: string[];
  proveedores: CostoDeProveedor[];
  precio: number | null; explicacion_precio: string[]; margen_del_precio: number | null; precios: Record<string, number> | null;
};

// PATCH /productos/:id: lo único que se cambia de un producto desde la aplicación.
export type CambiosDeProducto = { margen_elegido?: number | null; unidad?: string; codigo_barras?: string | null; proveedor_preferido_id?: string | null; foto_url?: string | null };

// POST /productos/:id/foto
export type FotoSubida = { foto_url: string };
