import { crearAvisos } from "../comun/avisos.js";
import type { Central, EstadoDelTema } from "./central.js";

// El camino por el servidor del enlace (ADR-027, ADR-030): escucha el tema del vínculo en el canal
// del dispositivo (una espera temporaria de la central) y manda con `POST`. Se manda de a un
// pedido por vez, y lo que se junta mientras hay uno en camino va en el siguiente: así llega en
// orden. Si un `POST` falla, se descarta lo que esperaba y se reconecta el canal: al volver, los
// dos se saludan y se reenvía lo que no se confirmó. `soltar` deja el tema (la directa ya anda) y
// `tomar` lo vuelve a pedir.
export const MAXIMO_POR_POST = 900_000;

export type OpcionesDelServidor = {
  central: Central;
  // El tema del vínculo en el canal, de qué lado está este dispositivo y dónde se manda.
  tema: string;
  lado: string;
  url: string;
};

export function crearCaminoServidor(o: OpcionesDelServidor) {
  const estado = crearAvisos<EstadoDelTema>();
  const mensajes = crearAvisos<string>();
  const cerrada = crearAvisos<void>();
  const rechazado = crearAvisos<number>();
  const cola: string[] = [];
  let enCamino = false;
  let dejar: (() => void) | null = null;

  // Devuelve si recién lo toma (si ya lo tenía, no cambia nada).
  function tomar(): boolean {
    if (dejar) return false;
    dejar = o.central.vigilar({
      tema: o.tema,
      temporaria: true,
      lado: o.lado,
      alAviso: (d) => typeof d === "string" && mensajes.avisar(d),
      alEstado: (e) => estado.avisar(e),
      // El tema se cerró (se soltó el vínculo) o el servidor no lo da: ya no se vuelve a pedir.
      alCerrar: () => { dejar = null; cerrada.avisar(); },
      alRechazo: (codigo) => { dejar = null; rechazado.avisar(codigo); },
    });
    return true;
  }
  function soltar() {
    dejar?.();
    dejar = null;
  }

  function enviar() {
    if (enCamino || cola.length === 0) return;
    enCamino = true;
    const tanda = sacarTanda(cola);
    o.central.mandar(o.url, JSON.stringify(tanda))
      .then((r) => { if (!r.ok) throw new Error(`post ${r.status}`); })
      .catch(() => { cola.length = 0; o.central.reconectar(); })
      .finally(() => { enCamino = false; enviar(); });
  }

  return {
    estado, mensajes, cerrada, rechazado, tomar, soltar,
    mandar(texto: string) {
      cola.push(texto);
      enviar();
    },
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
