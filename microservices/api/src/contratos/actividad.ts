// Lo que el servidor responde sobre «Quién hizo qué» (el registro de acciones). Solo tipos: el
// cliente web los toma al compilar (ADR-018), así que acá no va código ni nombres de tablas.

// Una acción: qué fue, cuándo, desde qué dispositivo, quién la hizo y su detalle.
export type Evento = { id: string; tipo: string; fecha: string; dispositivo_id: string | null; email: string | null; nombre: string | null; contenido: Record<string, unknown> };

// GET /auditoria?pagina=N[&usuario=…&tipo=…&desde=…&hasta=…]: de a 10, de la más nueva a la más
// vieja. `tipo` compara el comienzo («venta.» trae todo lo de ventas); `desde` y `hasta` son
// momentos (ISO).
export type PaginaDeEventos = { eventos: Evento[]; total: number; pagina: number; por_pagina: number };
