// La central: presenta a los dos lados de cada sala y les pasa lo que se mandan cuando no pueden
// hablarse directo (ADR-027). No guarda nada ni entiende lo que pasa: son textos. No conoce
// sesiones ni usuarios: la aplicación decide quién puede escuchar o mandar en cada sala, y
// recién ahí la llama.
//
// Cada lado escucha con un flujo de eventos (server-sent events). Lo que le llega es JSON:
//   {"p": true|false}  si hay alguien del otro lado escuchando (presencia)
//   {"m": "<texto>"}   un mensaje del otro lado
//   {"c": true}        la sala se cerró (se soltó el emparejamiento): no hay que volver
// Usa solo la API estándar de la web (Response, ReadableStream), que trae Node.

// Límites de lo que se acepta para pasar (E27).
export const MAXIMO_POR_MENSAJE = 65_536;
export const MAXIMO_POR_TANDA = 1_048_576;

// `soltar` deja de mandarle latidos; `cortar` le cierra el flujo.
type Oyente = { lado: string; escribir: (evento: object) => void; soltar: () => void; cortar: () => void };

export type OpcionesDeLaCentral = {
  // Cada cuánto se manda el latido que mantiene viva la conexión con los proxies.
  latidoMs?: number;
  // Repetir algo cada tanto; devuelve cómo parar. Se reemplaza en las pruebas.
  cadaTanto?: (ms: number, hacer: () => void) => () => void;
};

export type Central = {
  escuchar(sala: string, lado: string): Response;
  recibir(sala: string, lado: string, cuerpo: string): 204 | 400 | 413;
  cerrar(sala: string): void;
};

const cadaTantoReal = (ms: number, hacer: () => void) => {
  const reloj = setInterval(hacer, ms);
  return () => clearInterval(reloj);
};
const codificador = new TextEncoder();

export function crearCentral({ latidoMs = 25_000, cadaTanto = cadaTantoReal }: OpcionesDeLaCentral = {}): Central {
  const salas = new Map<string, Set<Oyente>>();
  const oyentesDe = (sala: string) => salas.get(sala) ?? new Set<Oyente>();

  // A cada uno le dice si hay alguien de otro lado escuchando.
  function avisarPresencia(sala: string) {
    const oyentes = [...oyentesDe(sala)];
    for (const o of oyentes) o.escribir({ p: oyentes.some((otro) => otro.lado !== o.lado) });
  }

  function quitar(sala: string, oyente: Oyente) {
    oyentesDe(sala).delete(oyente);
    if (oyentesDe(sala).size === 0) salas.delete(sala);
    oyente.soltar();
  }

  function escuchar(sala: string, lado: string): Response {
    let oyente: Oyente;
    const cuerpo = new ReadableStream<Uint8Array>({
      start(control) {
        const enviar = (texto: string) => control.enqueue(codificador.encode(texto));
        const parar = cadaTanto(latidoMs, () => enviar(": latido\n\n"));
        oyente = { lado, escribir: (evento) => enviar(`data: ${JSON.stringify(evento)}\n\n`), soltar: parar, cortar: () => control.close() };
        salas.set(sala, oyentesDe(sala).add(oyente));
        avisarPresencia(sala);
      },
      // El lado se fue (cerró la aplicación o se cortó la red): el otro se entera.
      cancel() {
        quitar(sala, oyente);
        avisarPresencia(sala);
      },
    });
    return new Response(cuerpo, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }

  // Una tanda es una lista de textos. Se le pasa a los oyentes de los otros lados, sin guardarla.
  function recibir(sala: string, lado: string, cuerpo: string): 204 | 400 | 413 {
    if (cuerpo.length > MAXIMO_POR_TANDA) return 413;
    const tanda = tandaDe(cuerpo);
    if (!tanda) return 400;
    if (tanda.some((texto) => texto.length > MAXIMO_POR_MENSAJE)) return 413;
    for (const o of oyentesDe(sala)) if (o.lado !== lado) for (const m of tanda) o.escribir({ m });
    return 204;
  }

  // Se soltó el emparejamiento: se les avisa a todos y se cortan sus flujos (E26).
  function cerrar(sala: string) {
    for (const o of oyentesDe(sala)) {
      o.escribir({ c: true });
      o.cortar();
      quitar(sala, o);
    }
  }

  return { escuchar, recibir, cerrar };
}

function tandaDe(cuerpo: string): string[] | null {
  try {
    const tanda = JSON.parse(cuerpo) as unknown;
    return Array.isArray(tanda) && tanda.every((t) => typeof t === "string") ? tanda : null;
  } catch {
    return null;
  }
}
