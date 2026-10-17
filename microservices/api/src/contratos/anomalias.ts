// Lo que el servidor responde sobre las anomalías (cuando el sistema y la realidad no
// coinciden). Solo tipos: el cliente web los toma al compilar (ADR-018), así que acá no va
// código ni nombres de tablas.

// Una anomalía. La cantidad llega como texto.
export type Anomalia = { id: string; tipo: string; cantidad: string; detalle: string; creado_en: string; venta_id: string | null; producto_id: string; producto: string; unidad: string | null; usuario: string | null };

// GET /anomalias?pagina=N: las más nuevas primero.
export type PaginaDeAnomalias = { pagina: number; hay_mas: boolean; anomalias: Anomalia[] };
