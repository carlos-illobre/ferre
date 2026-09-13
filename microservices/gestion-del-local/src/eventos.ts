import { randomUUID } from "node:crypto";
import type pg from "pg";

// Registro de eventos de dominio (ADR-003). Es también la auditoría: quién, cuándo,
// desde dónde y qué. Toda escritura de negocio pasa por acá.
export type Evento = {
  tipo: string;
  contenido: Record<string, unknown>;
  usuarioId: string | null;
  dispositivoId?: string | null;
  version?: number;
};

export async function registrarEvento(ejecutor: pg.Pool | pg.PoolClient, evento: Evento): Promise<string> {
  const id = randomUUID();
  await ejecutor.query(
    `INSERT INTO evento (id, tipo, version, fecha, dispositivo_id, usuario_id, contenido)
     VALUES ($1, $2, $3, now(), $4, $5, $6)`,
    [id, evento.tipo, evento.version ?? 1, evento.dispositivoId ?? null, evento.usuarioId, JSON.stringify(evento.contenido)],
  );
  return id;
}
