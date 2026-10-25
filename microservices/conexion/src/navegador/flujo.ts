import type { Esperar } from "./reloj.js";

// Escuchar un flujo de eventos (server-sent events) con `fetch`, que, a diferencia de
// `EventSource`, deja mandar cabeceras (la sesión). Entrega los datos de cada evento; los
// comentarios (los latidos) no. Si se corta, vuelve a conectar sola a los 3 segundos; si sigue
// sin poder, espera el doble cada vez, hasta un minuto (un servidor caído o lleno no recibe un
// pedido cada 3 segundos de cada dispositivo). Si el servidor dice que no (401, 403 o 404), no
// insiste, y pasa lo que contestó (qué rechazó).
export const ESPERA_PARA_RECONECTAR_MS = 3_000;
export const ESPERA_MAXIMA_MS = 60_000;
const RECHAZOS = [401, 403, 404];

export type OpcionesDelFlujo = {
  url: string;
  cabeceras: () => Record<string, string>;
  fetch: typeof fetch;
  esperar: Esperar;
  alAbrir: () => void;
  alEvento: (datos: string) => void;
  alCortar: () => void;
  alRechazar: (estado: number, cuerpo: string) => void;
};

export type Flujo = { reconectar(): void; cerrar(): void };

export function escucharFlujo(o: OpcionesDelFlujo): Flujo {
  let activo = true;
  let control = new AbortController();
  let cancelarEspera = () => {};
  let espera = ESPERA_PARA_RECONECTAR_MS;

  async function conectar() {
    control = new AbortController();
    try {
      const r = await o.fetch(o.url, { headers: o.cabeceras(), signal: control.signal });
      // Se cerró mientras se esperaba la respuesta: lo que contestó ya no le importa a nadie.
      if (!activo) return;
      if (RECHAZOS.includes(r.status)) return rechazar(r.status, await r.text());
      if (!r.ok || !r.body) throw new Error(`flujo ${r.status}`);
      espera = ESPERA_PARA_RECONECTAR_MS;
      o.alAbrir();
      await leerEventos(r.body, o.alEvento);
    } catch {
      // Se cortó: abajo se vuelve a conectar.
    }
    if (activo) cortado();
  }
  function rechazar(estado: number, cuerpo: string) {
    activo = false;
    o.alRechazar(estado, cuerpo);
  }
  function cortado() {
    o.alCortar();
    cancelarEspera = o.esperar(espera, () => void conectar());
    espera = Math.min(espera * 2, ESPERA_MAXIMA_MS);
  }

  void conectar();
  return {
    // Cortar la conexión de ahora: se vuelve a conectar como en cualquier corte.
    reconectar: () => control.abort(),
    cerrar() {
      activo = false;
      cancelarEspera();
      control.abort();
    },
  };
}

// Lee el cuerpo y entrega los datos de cada evento completo (los bloques terminan en una línea vacía).
async function leerEventos(cuerpo: ReadableStream<Uint8Array>, alEvento: (datos: string) => void) {
  const lector = cuerpo.getReader();
  const decodificador = new TextDecoder();
  let resto = "";
  for (let r = await lector.read(); !r.done; r = await lector.read()) {
    const bloques = (resto + decodificador.decode(r.value, { stream: true })).split("\n\n");
    resto = bloques.pop()!;
    for (const bloque of bloques) {
      const datos = bloque.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
      if (datos.length) alEvento(datos.join("\n"));
    }
  }
}
