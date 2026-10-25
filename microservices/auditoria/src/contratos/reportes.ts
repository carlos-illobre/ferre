// Lo que Auditoría responde en sus reportes (specs/027). Solo tipos: el cliente web los toma al
// compilar, así que acá no va código.

export type Importancia = "normal" | "revisar" | "anulacion";

// Una acción, con el texto para personas que mandó el servicio que la conoce.
export type Evento = {
  id: string; servicio: string; tipo: string; fecha: string; dispositivo: string | null;
  quien: { id: string; nombre: string } | null;
  titulo: string; detalle: string | null; grupo: string; importancia: Importancia;
  referencias: { cosa: string; id: string }[]; contenido: Record<string, unknown>;
};

// GET /auditoria?pagina=N[&usuario=…&grupo=…&tipo=…&desde=…&hasta=…]: de a 10, de la más nueva a
// la más vieja. `usuario` es el id de quien la hizo; `tipo` compara el comienzo («venta.» trae
// todo lo de ventas); `desde` y `hasta` son momentos (ISO).
export type PaginaDeEventos = { eventos: Evento[]; total: number; pagina: number; por_pagina: number };

// GET /auditoria/grupos: los grupos que hay, para el filtro «qué».
export type Grupos = { grupos: string[] };
