import type { ProductoDelCatalogo } from "@servidor/productos";

// El producto tal como lo devuelve la API (/productos, contrato del servidor) y lo guarda el
// catálogo. Un catálogo guardado antes de que el servidor mandara el precio, la foto, el
// sector o los demás proveedores no los trae: por eso esos van opcionales acá.
type QuePuedeFaltar = "precio" | "explicacion_precio" | "margen_del_precio" | "precios" | "proveedores" | "sector_id" | "foto_url" | "lista_importada_id" | "modificado_en" | "proveedor_id";
export type Producto = Omit<ProductoDelCatalogo, QuePuedeFaltar> & Partial<Pick<ProductoDelCatalogo, QuePuedeFaltar>>;
