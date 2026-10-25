// El contrato de auditoría, versión 1 (docs/auditoria/contrato-v1.md): la forma del evento y cómo
// se valida. Lo usan el kit, antes de anotar, y Auditoría, al recibir: una sola validación.

export type Importancia = "normal" | "revisar" | "anulacion";
export const IMPORTANCIAS: readonly Importancia[] = ["normal", "revisar", "anulacion"];

/** Lo que anota un servicio: lo que pasó, con su texto para personas. */
export type EventoDeAuditoria = {
  tipo: string;
  titulo: string;
  grupo: string;
  importancia: Importancia;
  quien?: { id: string; nombre: string } | null;
  dispositivo?: string | null;
  detalle?: string | null;
  referencias?: { cosa: string; id: string }[];
  contenido?: Record<string, unknown>;
};

/** Lo que se entrega: el evento con su id, el servicio que lo manda y cuándo pasó. */
export type EventoMandado = EventoDeAuditoria & { id: string; servicio: string; fecha: string };

export const MAXIMO_POR_LOTE = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPO = /^[a-z_]+\.[a-z_.]+$/;
const BYTES_DEL_CONTENIDO = 16 * 1024;

const texto = (v: unknown, desde: number, hasta: number) => typeof v === "string" && v.length >= desde && v.length <= hasta;
const opcional = (v: unknown, hasta: number) => v === undefined || v === null || texto(v, 0, hasta);
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// Qué campo no cumple, o null si cumple todo.
export function problemaDelEvento(e: unknown): string | null {
  if (!esObjeto(e)) return "el evento no es un objeto";
  const reglas: [boolean, string][] = [
    [typeof e.id === "string" && UUID.test(e.id), "id"],
    [texto(e.servicio, 1, 40), "servicio"],
    [texto(e.tipo, 3, 80) && TIPO.test(e.tipo as string), "tipo"],
    [typeof e.fecha === "string" && !Number.isNaN(Date.parse(e.fecha)), "fecha"],
    [e.quien === undefined || e.quien === null || (esObjeto(e.quien) && texto(e.quien.id, 1, 120) && texto(e.quien.nombre, 1, 120)), "quien"],
    [opcional(e.dispositivo, 120), "dispositivo"],
    [texto(e.titulo, 1, 120), "titulo"],
    [opcional(e.detalle, 300), "detalle"],
    [texto(e.grupo, 1, 60), "grupo"],
    [IMPORTANCIAS.includes(e.importancia as Importancia), "importancia"],
    [e.referencias === undefined || (Array.isArray(e.referencias) && e.referencias.length <= 20 && e.referencias.every((r) => esObjeto(r) && texto(r.cosa, 1, 40) && texto(r.id, 1, 120))), "referencias"],
    [e.contenido === undefined || (esObjeto(e.contenido) && Buffer.byteLength(JSON.stringify(e.contenido)) <= BYTES_DEL_CONTENIDO), "contenido"],
  ];
  const mal = reglas.find(([cumple]) => !cumple);
  return mal ? `el campo «${mal[1]}» no cumple el contrato` : null;
}
