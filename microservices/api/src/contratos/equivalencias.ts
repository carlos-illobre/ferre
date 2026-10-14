// Lo que el servidor responde sobre los duplicados (el mismo artículo en varias listas). Solo
// tipos: el cliente web los toma al compilar (ADR-018), así que acá no va código ni nombres de
// tablas.

// Un producto de una sugerencia, con su último costo.
export type ProductoAUnir = { id: string; descripcion: string; marca: string | null; codigo_barras: string | null; proveedor: string | null; costo_neto: string | null; fecha_lista: string | null };

// GET /equivalencias: las sugerencias pendientes, de la más nueva a la más vieja.
export type Sugerencia = { id: string; motivo: string; creado_en: string; a: ProductoAUnir; b: ProductoAUnir };

// POST /equivalencias/buscar
export type BusquedaDeDuplicados = { nuevas: number };

// POST /equivalencias/:id/unir y /:id/rechazar: qué producto se conserva.
export type ResolverSugerencia = { conservar?: "a" | "b" };
// POST /equivalencias/unir: unir dos productos a mano.
export type UnirAMano = { conservar_id?: string; absorber_id?: string };

// GET /equivalencias/unidos: lo ya unido, que se puede separar.
export type Union = { absorbido_id: string; absorbido: string; conservado_id: string; conservado: string; unido_en: string; proveedores: string | null };
// POST /equivalencias/separar
export type Separar = { absorbido_id?: string };
