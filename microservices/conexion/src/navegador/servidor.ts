import { crearAvisos } from "../comun/avisos.js";
import { escucharFlujo } from "./flujo.js";
import type { Esperar } from "./reloj.js";

// El camino por el servidor: escucha la sala con un flujo de eventos y manda con `POST` a la misma
// dirección. Se manda de a un pedido por vez, y lo que se junta mientras hay uno en camino va en el
// siguiente: así llega en orden. Si un `POST` falla, se descarta lo que esperaba y se reconecta el
// flujo: al volver, los dos se saludan y se reenvía lo que no se confirmó (ADR-027).
export const MAXIMO_POR_POST = 900_000;

export type OpcionesDelServidor = {
  url: string;
  cabeceras: () => Record<string, string>;
  fetch: typeof fetch;
  esperar: Esperar;
};

// `conectado`: el flujo está abierto. `otro`: hay alguien del otro lado escuchando.
export type EstadoDelServidor = { conectado: boolean; otro: boolean };

export function crearCaminoServidor(o: OpcionesDelServidor) {
  const estado = crearAvisos<EstadoDelServidor>();
  const mensajes = crearAvisos<string>();
  const cerrada = crearAvisos<void>();
  const rechazado = crearAvisos<number>();
  const cola: string[] = [];
  let enCamino = false;

  // Lo que manda la central: presencia, un mensaje del otro lado, o que la sala se cerró.
  function alEvento(datos: string) {
    const evento = JSON.parse(datos) as { p?: boolean; m?: string; c?: boolean };
    if (evento.m !== undefined) mensajes.avisar(evento.m);
    if (evento.p !== undefined) estado.avisar({ conectado: true, otro: evento.p });
    if (evento.c) {
      flujo.cerrar();
      cerrada.avisar();
    }
  }

  const flujo = escucharFlujo({
    ...o,
    alAbrir: () => estado.avisar({ conectado: true, otro: false }),
    alEvento,
    alCortar: () => estado.avisar({ conectado: false, otro: false }),
    alRechazar: (codigo) => rechazado.avisar(codigo),
  });

  function enviar() {
    if (enCamino || cola.length === 0) return;
    enCamino = true;
    const tanda = sacarTanda(cola);
    o.fetch(o.url, { method: "POST", headers: { ...o.cabeceras(), "Content-Type": "application/json" }, body: JSON.stringify(tanda) })
      .then((r) => { if (!r.ok) throw new Error(`post ${r.status}`); })
      .catch(() => { cola.length = 0; flujo.reconectar(); })
      .finally(() => { enCamino = false; enviar(); });
  }

  return {
    estado, mensajes, cerrada, rechazado,
    mandar(texto: string) {
      cola.push(texto);
      enviar();
    },
    cerrar: () => flujo.cerrar(),
  };
}

export type CaminoServidor = ReturnType<typeof crearCaminoServidor>;

// Saca de la cola lo que entra en un pedido (siempre al menos uno).
function sacarTanda(cola: string[]): string[] {
  let total = cola[0]!.length;
  let cuantos = 1;
  while (cuantos < cola.length && total + cola[cuantos]!.length <= MAXIMO_POR_POST) total += cola[cuantos++]!.length;
  return cola.splice(0, cuantos);
}
