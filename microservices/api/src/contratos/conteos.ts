// Lo que el servidor responde sobre los sectores y los conteos. Solo tipos: el cliente web los
// toma al compilar (ADR-018), así que acá no va código ni nombres de tablas.

// GET /sectores. `productos` (cuántos tiene) llega como texto.
export type Sector = { id: string; nombre: string; orden: number; productos: string; ultimo_conteo: string | null; conteo_abierto: string | null };
// POST /sectores
export type SectorNuevo = { nombre?: string };
export type SectorCreado = { id: string; nombre: string };

// POST /conteos: abre el conteo del sector, o retoma el que está abierto.
export type ConteoNuevo = { sector_id?: string };
export type ConteoAbierto = { id: string; retomado: boolean };

// GET /conteos/:id. Las cantidades llegan como texto.
export type Contado = { producto_id: string; cantidad_contada: string; contado_en: string; descripcion: string; marca: string | null; stock_teorico: string };
export type SinContar = { producto_id: string; descripcion: string; marca: string | null; stock_teorico: string };
export type Conteo = { id: string; estado: string; abierto_en: string; cerrado_en: string | null; resumen: unknown; sector_id: string; sector: string; renglones: Contado[]; sin_contar: SinContar[] };

// PUT /conteos/:id/renglones/:productoId
export type RenglonContado = { cantidad?: number };

// POST /conteos/:id/cerrar
export type CierreDeConteo = { faltantes_en_cero?: boolean };
export type ConteoCerrado = { id: string; sector: string; contados: number; ajustados: number; sin_contar: number; puestos_en_cero: number; diferencia_unidades: number };
