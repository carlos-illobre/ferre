import type { Producto } from "../../../negocio/catalogo";

// Lo que se puede cambiar de un producto desde el Catálogo.
export type Cambios = Partial<Pick<Producto, "margen_elegido" | "foto_url" | "codigo_barras">> & { proveedor_preferido_id?: string };
