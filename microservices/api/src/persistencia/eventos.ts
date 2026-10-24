import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Ejecutor } from "./transaccion.js";

// Registro de eventos de dominio (ADR-003). Es también la auditoría: quién, cuándo, desde dónde y
// qué. Toda escritura de negocio pasa por acá. La hora es la de la base: los eventos de una misma
// transacción comparten la hora de la transacción.
export type Evento = {
  tipo: string;
  contenido: Record<string, unknown>;
  usuarioId: string | null;
  dispositivoId?: string | null;
  version?: number;
};

export async function anotarEvento(e: Ejecutor, evento: Evento): Promise<string> {
  const id = randomUUID();
  await e.insertInto("evento").values({
    id, tipo: evento.tipo, version: evento.version ?? 1, fecha: sql`now()`, dispositivo_id: evento.dispositivoId ?? null, usuario_id: evento.usuarioId, contenido: JSON.stringify(evento.contenido),
  }).execute();
  return id;
}
