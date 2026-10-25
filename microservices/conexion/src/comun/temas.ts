// La forma de lo que viaja entre el servidor y el canal de un dispositivo (ADR-030). Lo comparten
// los dos lados: el navegador lo escribe y lo lee, el servidor también.

// Lo que el dispositivo pide escuchar al abrir el canal, en la cabecera `X-Temas` (JSON, fuera de
// la dirección para que los secretos no queden en los registros): el tema, de qué lado está (para
// la presencia, como en el vínculo) y su secreto, si el tema lo pide (la entrada con código QR).
export const CABECERA_DE_TEMAS = "X-Temas";
export type PedidoDeTema = { t: string; l?: string; k?: string };

// Lo que va a cuestas en cada respuesta del servidor, en la cabecera `X-Avisos`: un objeto con un
// valor por tema (la versión, por ejemplo).
export const CABECERA_A_CUESTAS = "X-Avisos";
export type ACuestas = Record<string, unknown>;

// Lo que manda el servidor por el canal, un evento por vez:
//   {"t": tema, "d": datos}   un aviso de ese tema
//   {"t": tema, "p": bool}    si hay alguien de otro lado escuchando el tema (presencia)
//   {"t": tema, "c": true}    el tema se cerró (ya no vale): no hay que volver a pedirlo
//   {"a": {...}}              lo que va a cuestas, al abrir
export type EventoDelCanal = { t: string; d: unknown } | { t: string; p: boolean } | { t: string; c: true } | { a: ACuestas };

// Al rechazar un canal, el servidor dice qué temas no da (si no lo dice, son todos).
export type Rechazo = { rechazados?: string[] };

// Un texto JSON leído, o undefined si no lo es.
export const json = (texto: string | null | undefined): unknown => {
  try {
    return JSON.parse(texto ?? "");
  } catch {
    return undefined;
  }
};
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const opcional = (v: unknown) => v === undefined || typeof v === "string";
const esPedido = (v: unknown): v is PedidoDeTema => esObjeto(v) && typeof v.t === "string" && opcional(v.l) && opcional(v.k);

// Lo pedido por el dispositivo, o null si no tiene la forma (la aplicación lo rechaza).
export function leerTemas(texto: string | null | undefined): PedidoDeTema[] | null {
  const v = json(texto);
  return Array.isArray(v) && v.length > 0 && v.every(esPedido) ? v : null;
}

// Lo que va a cuestas, o null si no está o no tiene la forma.
export function leerACuestas(texto: string | null | undefined): ACuestas | null {
  const v = json(texto);
  return esObjeto(v) ? v : null;
}

// Un evento del canal, o null si no tiene la forma (se descarta: 025-E34).
export function leerEvento(texto: string): EventoDelCanal | null {
  const v = json(texto);
  if (!esObjeto(v)) return null;
  if (typeof v.t !== "string") return esObjeto(v.a) ? { a: v.a } : null;
  return "d" in v || typeof v.p === "boolean" || v.c === true ? (v as EventoDelCanal) : null;
}

// Los temas que el servidor rechazó, o null si son todos.
export function leerRechazo(texto: string): string[] | null {
  const v = json(texto);
  const lista = esObjeto(v) ? v.rechazados : undefined;
  return Array.isArray(lista) && lista.every((t) => typeof t === "string") ? lista : null;
}
