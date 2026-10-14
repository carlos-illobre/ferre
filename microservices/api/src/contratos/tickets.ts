// Lo que el servidor responde sobre los tickets (errores y mejoras que reporta quien usa la
// app). Solo tipos: el cliente web los toma al compilar (ADR-018), así que acá no va código ni
// nombres de tablas. Lo que manda el front en JSON sale de la validación del servidor (decisión 89).
import type { z } from "zod";
import type { resolucionDeTicket } from "../tickets/esquemas.js";

// GET /tickets: los últimos 200, del más nuevo al más viejo, con la dirección de cada foto.
export type Ticket = {
  id: string; tipo: "error" | "mejora"; descripcion: string; dispositivo: string | null; version: string | null; creado_en: string;
  estado: "abierto" | "resuelto"; resuelto_en: string | null; nota: string | null; usuario: string; resuelto_por: string | null; fotos: string[];
};

// POST /tickets (multipart: id, tipo, descripcion, dispositivo, version y hasta 5 fotos). El id
// lo pone el dispositivo: si ya estaba, responde `repetido`.
export type TicketCreado = { id: string; repetido?: true };

// POST /tickets/:id/resolver
export type ResolucionDeTicket = z.input<typeof resolucionDeTicket>;
