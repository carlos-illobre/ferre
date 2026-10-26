// Lo que Tickets responde (specs/028; lo mismo que respondía Comercial, RF-80). Solo tipos: el
// cliente web los toma al compilar, así que acá no va código ni nombres de tablas.

// GET /tickets: los últimos 200, del más nuevo al más viejo, con la dirección de cada foto.
export type Ticket = {
  id: string; tipo: "error" | "mejora"; descripcion: string; dispositivo: string | null; version: string | null; creado_en: string;
  estado: "abierto" | "resuelto"; resuelto_en: string | null; nota: string | null; usuario: string; resuelto_por: string | null; fotos: string[];
};

// POST /tickets (multipart: id, tipo, descripcion, dispositivo, version y hasta 5 fotos). El id
// lo pone el dispositivo: si ya estaba, responde `repetido`.
export type TicketCreado = { id: string; repetido?: true };

// POST /tickets/:id/resolver: con una nota de qué se hizo, de hasta 2.000 letras.
export type ResolucionDeTicket = { nota?: string };
