// Lo que el servidor responde sobre las listas de precios de los proveedores. Solo tipos: el
// cliente web los toma al compilar (ADR-018), así que acá no va código ni nombres de tablas.
// Los importes llegan como texto, con sus decimales.

// Una fila de la planilla, como la deja el lector: con el costo neto calculado y explicado.
export type FilaDeLista = {
  codigo_proveedor: string; descripcion: string; marca: string | null; grupo: string | null; codigo_barras: string | null;
  precio_lista: string; costo_neto: string; iva: string; descuentos: { tipo: string; porcentaje: string }[]; explicacion: string[];
  cantidad_bulto: number | null; precio_bulto: string | null; precio_sugerido: string | null;
};
// Una fila que el lector no pudo leer, con su número y lo que tenía.
export type Salteada = { fila: number; motivo: string; contenido: string[] };

// Lo que dejó la carga contra los costos vigentes del proveedor. Mientras se aplica, lleva el
// avance; si se interrumpió, el error.
export type ResumenDeLista = {
  leidas: number; salteadas: number; ofertas?: number;
  nuevos: number; modificados: number; sin_cambio: number; dados_de_baja: number; variacion_promedio: number;
  salteadas_detalle?: Salteada[];
  progreso?: { procesadas: number; total: number | null; etapa?: string }; error?: string;
};

// GET /listas: las últimas 100 cargadas, de la más nueva a la más vieja.
export type ListaEnHistorial = { id: string; archivo_nombre: string; fecha_lista: string; estado: string; resumen: ResumenDeLista; avisos: string[]; importada_en: string | null; creado_en: string; proveedor_id: string; proveedor: string };

// POST /listas (multipart: archivo, proveedor_id, fecha_lista): queda pendiente, para revisar.
export type ListaCargada = { id: string; proveedor: string; fecha_lista: string; resumen: ResumenDeLista; avisos: string[]; salteadas: Salteada[] };

// GET /listas/:id/filas?desde=N: de a 200, primero las que cambian de precio.
export type FilasDeLista = { total: number; filas: (FilaDeLista & { costo_anterior: string | null })[] };

// POST /listas/:id/aplicar: se aplica en segundo plano.
export type ListaAplicandose = { id: string; estado: "aplicando" };

// GET /listas/:id: cómo va.
// GET /listas/:id/origen: de qué lista sale el costo de un producto (specs/016, RF-115), para la
// ficha. Pide «Ver costos», no «Cargar listas».
export type OrigenDeLista = { id: string; archivo_nombre: string; proveedor: string; fecha_lista: string; productos: number };

export type EstadoDeLista = { id: string; estado: string; resumen: ResumenDeLista; avisos: string[]; fecha_lista: string; archivo_nombre: string; proveedor: string };
