// El producto tal como lo devuelve la API (/productos) y lo guarda el catálogo local.
// La pantalla de productos vive en Catalogo.tsx.
export type Producto = {
  id: string; descripcion: string; marca: string | null; codigo_barras: string | null; unidad: string;
  margen_elegido: number | null;
  proveedor: string | null; codigo_proveedor: string | null;
  costo_neto: string | null; iva: string | null; fecha_lista: string | null; lista_importada_id?: string | null; explicacion_costo: string[];
  sector_id?: string | null;
  foto_url?: string | null;
  proveedores?: { proveedor_id: string; proveedor: string; costo_neto: string; fecha_lista: string; codigo_proveedor: string }[];
};
