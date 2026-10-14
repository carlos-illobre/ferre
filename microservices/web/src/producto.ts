// El producto tal como lo devuelve la API (/productos) y lo guarda el catálogo.
export type Producto = {
  id: string; descripcion: string; marca: string | null; codigo_barras: string | null; unidad: string;
  margen_elegido: number | null;
  proveedor: string | null; codigo_proveedor: string | null;
  costo_neto: string | null; iva: string | null; fecha_lista: string | null; lista_importada_id?: string | null; explicacion_costo: string[];
  sector_id?: string | null;
  foto_url?: string | null;
  // El precio que calculó el servidor (ADR-018): el del margen elegido, con su explicación y el
  // margen para el que se calculó, y el de cada uno de los cinco botones. Un catálogo guardado
  // antes de que existieran no los trae.
  precio?: number | null; explicacion_precio?: string[]; margen_del_precio?: number | null; precios?: Record<string, number> | null;
  proveedores?: { proveedor_id: string; proveedor: string; costo_neto: string; fecha_lista: string; codigo_proveedor: string }[];
};
