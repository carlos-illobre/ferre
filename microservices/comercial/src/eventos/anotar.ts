import * as datos from "../persistencia/eventos.js";
import type { Ejecutor } from "../persistencia/transaccion.js";
import { enPalabras, personasDelDetalle } from "./en-palabras.js";

// Toda escritura de negocio anota qué pasó, quién, cuándo y desde dónde (constitución, principio V).
// El evento va a Auditoría con sus palabras y el nombre de la persona en ese momento (specs/027).
export type Evento = {
  tipo: string;
  contenido: Record<string, unknown>;
  usuarioId: string | null;
  dispositivoId?: string | null;
};

export async function anotarEvento(e: Ejecutor, evento: Evento): Promise<void> {
  if (!datos.bandeja.encendida) return;
  const ids = [...new Set([evento.usuarioId, ...personasDelDetalle(evento.tipo, evento.contenido)].filter((id): id is string => Boolean(id)))];
  const nombres = await datos.nombres(e, ids);
  const persona = (id: unknown) => nombres.get(id as string) ?? "un usuario";
  const quien = evento.usuarioId ? { id: evento.usuarioId, nombre: persona(evento.usuarioId) } : null;
  await datos.anotar(e, {
    tipo: evento.tipo, quien, dispositivo: evento.dispositivoId ?? null, contenido: evento.contenido,
    ...enPalabras(evento.tipo, evento.contenido, persona),
  });
}
