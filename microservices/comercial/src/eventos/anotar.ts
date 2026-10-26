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

// El contrato pone topes (docs/auditoria/contrato-v1.md): 120 letras el nombre y el dispositivo,
// 16 KB el contenido. Una acción no puede fallar ni quedar sin registro por eso: lo largo se corta.
// Del contenido grande (corregir una venta de muchos renglones) las listas quedan como cuántas
// eran y los textos largos, cortados; si aun así no entra, quedan solo los datos sueltos de arriba
// (el id, el total, el motivo). Siempre se marca que se recortó. El detalle completo sigue en la
// tabla de la acción.
const BYTES_DEL_CONTENIDO = 16 * 1024;
const cortar = (t: string, hasta: number) => (t.length <= hasta ? t : `${t.slice(0, hasta - 1)}…`);
const achicar = (v: unknown, texto: number): unknown => Array.isArray(v) ? `${v.length} elementos`
  : typeof v === "string" ? cortar(v, texto)
  : v !== null && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, achicar(x, texto)])) : v;
const entra = (c: unknown) => Buffer.byteLength(JSON.stringify(c)) <= BYTES_DEL_CONTENIDO;
export function contenidoQueEntra(c: Record<string, unknown>): Record<string, unknown> {
  if (entra(c)) return c;
  const chico = { ...(achicar(c, 500) as Record<string, unknown>), recortado: true };
  if (entra(chico)) return chico;
  const sueltos = Object.entries(chico).filter(([, v]) => v === null || typeof v !== "object").map(([k, v]) => [k, achicar(v, 200)]);
  return { ...Object.fromEntries(sueltos.slice(0, 40)), recortado: true };
}

export async function anotarEvento(e: Ejecutor, evento: Evento): Promise<void> {
  if (!datos.bandeja.encendida) return;
  const ids = [...new Set([evento.usuarioId, ...personasDelDetalle(evento.tipo, evento.contenido)].filter((id): id is string => Boolean(id)))];
  const nombres = await datos.nombres(e, ids);
  const persona = (id: unknown) => nombres.get(id as string) ?? "un usuario";
  const quien = evento.usuarioId ? { id: cortar(evento.usuarioId, 120), nombre: cortar(persona(evento.usuarioId), 120) } : null;
  const palabras = enPalabras(evento.tipo, evento.contenido, persona);
  await datos.anotar(e, {
    tipo: evento.tipo, quien, dispositivo: evento.dispositivoId ? cortar(evento.dispositivoId, 120) : null, contenido: contenidoQueEntra(evento.contenido),
    ...palabras, titulo: cortar(palabras.titulo, 120), detalle: palabras.detalle && cortar(palabras.detalle, 300),
  });
}
