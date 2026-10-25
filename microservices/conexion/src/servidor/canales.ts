import { json, type ACuestas, type EventoDelCanal } from "../comun/temas.js";

// Los canales (ADR-030): cada dispositivo que espera algo tiene uno solo, un flujo de eventos
// (server-sent events) con los temas que pidió. El servidor le avisa por ahí lo que pasa en cada
// tema, sin guardar nada. Si el tema tiene lados (el vínculo entre el celular y la computadora),
// además le dice si hay alguien del otro lado, y le pasa lo que ese otro manda (ADR-027).
//
// No conoce sesiones ni usuarios: la aplicación decide qué temas puede escuchar cada dispositivo
// y recién ahí abre. Usa solo la API estándar de la web (Response, ReadableStream).

// Límites de lo que se acepta para pasar (023-E27).
export const MAXIMO_POR_MENSAJE = 65_536;
export const MAXIMO_POR_TANDA = 1_048_576;

// Un tema que la aplicación ya autorizó: su lado, si tiene, y lo que hay que contarle al abrir
// (cómo está lo que se espera: 025-E06).
export type TemaAbierto = { tema: string; lado?: string; inicial?: unknown };

export type OpcionesDeLosCanales = {
  // Cada cuánto se manda el latido que mantiene viva la conexión y descubre las muertas.
  latidoMs?: number;
  // Cuántos canales abiertos en total, y cuántos por grupo (la sesión, por ejemplo): 025-E33.
  maximo?: number;
  maximoPorGrupo?: number;
  // Lo que va a cuestas, que se cuenta también al abrir (025-E11).
  aCuestas?: () => ACuestas;
  // Repetir algo cada tanto; devuelve cómo parar. Se reemplaza en las pruebas.
  cadaTanto?: (ms: number, hacer: () => void) => () => void;
};

type Canal = { id: string; grupo: string; temas: Map<string, string | undefined>; escribir: (e: EventoDelCanal) => void; soltar: () => void; cortar: () => void };

const cadaTantoReal = (ms: number, hacer: () => void) => {
  const reloj = setInterval(hacer, ms);
  return () => clearInterval(reloj);
};
const codificador = new TextEncoder();
const FLUJO = { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" };

export function crearCanales({ latidoMs = 25_000, maximo = 1_000, maximoPorGrupo = 10, aCuestas = () => ({}), cadaTanto = cadaTantoReal }: OpcionesDeLosCanales = {}) {
  const canales = new Map<string, Canal>();
  const todos = () => [...canales.values()];
  const conTema = (tema: string) => todos().filter((c) => c.temas.has(tema));

  // A cada uno de los que escuchan un tema con lado le dice si hay alguien de otro lado.
  function avisarPresencia(tema: string) {
    const oyentes = conTema(tema).filter((c) => c.temas.get(tema) !== undefined);
    for (const c of oyentes) c.escribir({ t: tema, p: oyentes.some((o) => o.temas.get(tema) !== c.temas.get(tema)) });
  }
  function quitar(canal: Canal) {
    canales.delete(canal.id);
    canal.soltar();
    canal.temas.forEach((_lado, tema) => avisarPresencia(tema));
  }
  const lleno = (grupo: string) => canales.size >= maximo || todos().filter((c) => c.grupo === grupo).length >= maximoPorGrupo;

  // Abre el canal del dispositivo `id` con sus temas; si ya tenía uno, lo reemplaza.
  function abrir(id: string, grupo: string, temas: TemaAbierto[]): Response {
    const anterior = canales.get(id);
    if (anterior) { anterior.cortar(); quitar(anterior); }
    if (lleno(grupo)) return new Response(null, { status: 503 });
    let canal: Canal;
    const cuerpo = new ReadableStream<Uint8Array>({
      start(control) {
        const enviar = (texto: string) => control.enqueue(codificador.encode(texto));
        canal = {
          id, grupo,
          temas: new Map(temas.map((t) => [t.tema, t.lado])),
          escribir: (e) => enviar(`data: ${JSON.stringify(e)}\n\n`),
          soltar: cadaTanto(latidoMs, () => enviar(": latido\n\n")),
          cortar: () => control.close(),
        };
        canales.set(id, canal);
        canal.escribir({ a: aCuestas() });
        for (const t of temas) if (t.inicial !== undefined) canal.escribir({ t: t.tema, d: t.inicial });
        temas.forEach((t) => avisarPresencia(t.tema));
      },
      // El dispositivo se fue (cerró la pantalla o se cortó la red): los del otro lado se enteran.
      cancel: () => quitar(canal),
    });
    return new Response(cuerpo, { headers: FLUJO });
  }

  // Avisar algo de un tema a quien lo escuche (salvo a los de un lado). Si nadie, no pasa nada.
  function avisar(tema: string, datos: unknown, salvoLado?: string) {
    for (const c of conTema(tema)) if (salvoLado === undefined || c.temas.get(tema) !== salvoLado) c.escribir({ t: tema, d: datos });
  }

  // Una tanda (lista de textos) de un lado de un tema: se les pasa a los del otro lado, sin guardarla.
  function recibir(tema: string, lado: string, cuerpo: string): 204 | 400 | 413 {
    if (cuerpo.length > MAXIMO_POR_TANDA) return 413;
    const tanda = tandaDe(cuerpo);
    if (!tanda) return 400;
    if (tanda.some((texto) => texto.length > MAXIMO_POR_MENSAJE)) return 413;
    tanda.forEach((texto) => avisar(tema, texto, lado));
    return 204;
  }

  // El tema ya no vale (se soltó el vínculo, venció): se avisa y se lo saca de cada canal. El
  // canal que se queda sin temas se cierra.
  function cerrarTema(tema: string) {
    for (const c of conTema(tema)) {
      c.escribir({ t: tema, c: true });
      c.temas.delete(tema);
      if (c.temas.size === 0) { c.cortar(); quitar(c); }
    }
  }

  // Cierra los canales de un grupo (se cerró la sesión: 025-E32).
  function cerrarGrupo(grupo: string) {
    for (const c of todos()) if (c.grupo === grupo) { c.cortar(); quitar(c); }
  }

  return { abrir, avisar, recibir, cerrarTema, cerrarGrupo, cuantos: () => canales.size };
}

export type Canales = ReturnType<typeof crearCanales>;

// La respuesta para un canal que no se abre: con qué estado y qué temas no se dan (025-E30, E31).
export const rechazar = (estado: 401 | 403 | 404, rechazados: string[]) =>
  new Response(JSON.stringify({ rechazados }), { status: estado, headers: { "Content-Type": "application/json" } });

function tandaDe(cuerpo: string): string[] | null {
  const tanda = json(cuerpo);
  return Array.isArray(tanda) && tanda.every((t) => typeof t === "string") ? tanda : null;
}
