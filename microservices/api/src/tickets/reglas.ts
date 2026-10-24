import { base } from "../persistencia/conexion.js";
import { anotarEvento } from "../persistencia/eventos.js";
import * as datos from "../persistencia/tickets.js";
import type { Ticket } from "../contratos/tickets.js";
import type { Enviable } from "../enviable.js";


// Tickets (RF-80): errores y mejoras que reporta quien usa el sistema, con texto y fotos.
// Todos los usuarios ven todos.
const EXTENSION: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const MAXIMO_DE_FOTOS = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ultimos = (): Promise<Enviable<Ticket>[]> => datos.ultimos(base);

export type TicketEntrada = { id: string; tipo: string; descripcion: string; dispositivo: string; version: string; fotos: File[] };
export type Rechazo = { error: string; estado: 400 | 413 };

export function validar(t: TicketEntrada): Rechazo | null {
  if (!UUID.test(t.id)) return { error: "Falta el identificador del ticket", estado: 400 };
  if (t.tipo !== "error" && t.tipo !== "mejora") return { error: "Decí si es un error o una mejora", estado: 400 };
  if (t.descripcion.length < 3) return { error: "Contá qué pasó o qué te gustaría, aunque sea en una línea", estado: 400 };
  if (t.descripcion.length > 5000) return { error: "El texto es demasiado largo: resumilo en menos de 5.000 letras", estado: 400 };
  if (t.fotos.length > MAXIMO_DE_FOTOS) return { error: `Son hasta ${MAXIMO_DE_FOTOS} fotos por ticket`, estado: 400 };
  for (const f of t.fotos) {
    if (!EXTENSION[f.type]) return { error: "Las fotos tienen que ser jpeg, png o webp", estado: 400 };
    if (f.size > 10 * 1024 * 1024) return { error: "Una foto pesa más de 10 MB", estado: 413 };
  }
  return null;
}

// Crea un ticket ya validado. Si ya había llegado (un reenvío), no se guarda nada de nuevo.
export async function crear(t: TicketEntrada, usuarioId: string): Promise<"creado" | "repetido"> {
  const nuevo = await datos.insertar(base, { id: t.id, tipo: t.tipo as "error" | "mejora", descripcion: t.descripcion, dispositivo: t.dispositivo.slice(0, 80) || null, version: t.version.slice(0, 80) || null, usuario_id: usuarioId });
  if (!nuevo) return "repetido";
  for (const [orden, f] of t.fotos.entries()) await datos.guardarFoto(base, t.id, orden, Buffer.from(await f.arrayBuffer()), EXTENSION[f.type]!);
  await anotarEvento(base, { tipo: "ticket.creado", usuarioId, contenido: { id: t.id, tipo: t.tipo, fotos: t.fotos.length } });
  return "creado";
}

export async function resolver(id: string, nota: string | undefined, usuarioId: string): Promise<boolean> {
  if (!(await datos.resolver(base, id, usuarioId, nota?.trim().slice(0, 2000) || null))) return false;
  await anotarEvento(base, { tipo: "ticket.resuelto", usuarioId, contenido: { id } });
  return true;
}

export async function reabrir(id: string, usuarioId: string): Promise<boolean> {
  if (!(await datos.reabrir(base, id))) return false;
  await anotarEvento(base, { tipo: "ticket.reabierto", usuarioId, contenido: { id } });
  return true;
}

// Las fotos se piden con sesión: son capturas de pantalla y pueden mostrar datos del negocio.
export async function foto(nombre: string): Promise<{ contenido: NonNullable<Awaited<ReturnType<typeof datos.leerFoto>>>; tipo: string } | null> {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre)) return null;
  const contenido = await datos.leerFoto(nombre);
  if (!contenido) return null;
  return { contenido, tipo: nombre.endsWith(".png") ? "image/png" : nombre.endsWith(".webp") ? "image/webp" : "image/jpeg" };
}
