import { crearAvisos } from "../comun/avisos.js";
import { CABECERA_DE_TEMAS, leerEvento, leerRechazo, type EventoDelCanal, type PedidoDeTema } from "../comun/temas.js";
import type { Vista } from "./entorno.js";
import { escucharFlujo, type Flujo } from "./flujo.js";
import type { Esperar } from "./reloj.js";

// El canal del dispositivo (ADR-030): la única conexión abierta con el servidor. Se abre con los
// temas que le pidan y solo si la página está a la vista; sin temas, u oculta, se cierra
// (025-E03, E05). Si los temas cambian, se vuelve a abrir con los nuevos (un pedido chico). Los
// cambios del mismo momento se juntan en uno solo. Lo que llega se valida antes de entregarlo
// (025-E34).
export type EstadoDelCanal = "abriendo" | "abierto" | "cortado" | "cerrado";
export type RechazoDelCanal = { estado: number; temas: string[] };

export type OpcionesDelCanal = {
  url: string;
  cabeceras: () => Record<string, string>;
  fetch: typeof fetch;
  esperar: Esperar;
  vista: Vista;
};

export function crearCanal(o: OpcionesDelCanal) {
  const eventos = crearAvisos<EventoDelCanal>();
  const estado = crearAvisos<EstadoDelCanal>();
  const rechazos = crearAvisos<RechazoDelCanal>();
  let pedidos: PedidoDeTema[] = [];
  // Con qué temas está abierto el flujo ("" si está cerrado).
  let abiertoCon = "";
  let flujo: Flujo | null = null;
  let programado = false;

  // Cerrado si no hay temas o la página está oculta; si no, abierto con los temas de ahora. Si
  // estaba abierto, primero se dice que se cerró: para el servidor este dispositivo se fue y
  // vuelve, y quien esperaba algo con el de antes (la directa a medio armar) empieza de nuevo.
  function aplicar() {
    programado = false;
    const quiere = pedidos.length > 0 && o.vista.visible() ? JSON.stringify(pedidos) : "";
    if (quiere === abiertoCon) return;
    if (abiertoCon) { flujo!.cerrar(); estado.avisar("cerrado"); }
    flujo = null;
    abiertoCon = quiere;
    if (quiere) abrir(quiere);
  }

  function abrir(temas: string) {
    estado.avisar("abriendo");
    flujo = escucharFlujo({
      url: o.url,
      fetch: o.fetch,
      esperar: o.esperar,
      cabeceras: () => ({ ...o.cabeceras(), [CABECERA_DE_TEMAS]: temas }),
      alAbrir: () => estado.avisar("abierto"),
      alEvento: (texto) => entregar(leerEvento(texto)),
      alCortar: () => estado.avisar("cortado"),
      // El servidor no da algunos temas: no se insiste hasta que los temas cambien.
      alRechazar: (codigo, cuerpo) => {
        flujo = null;
        abiertoCon = "";
        rechazos.avisar({ estado: codigo, temas: leerRechazo(cuerpo) ?? pedidos.map((p) => p.t) });
      },
    });
  }
  const entregar = (evento: EventoDelCanal | null) => evento && eventos.avisar(evento);

  // Se juntan los cambios del mismo momento (sin reloj: al terminar lo que se está haciendo).
  function programar() {
    if (programado) return;
    programado = true;
    queueMicrotask(aplicar);
  }
  o.vista.alCambiar(programar);

  return {
    // Lo que llega por el canal, ya validado.
    eventos,
    // Cada vez que se abre, se corta (y vuelve a intentar solo) o se cierra.
    estado,
    // Lo que el servidor no dio, con su estado (401, 403 o 404).
    rechazos,
    // Los temas que hay que escuchar: la lista entera de ahora.
    poner(lista: PedidoDeTema[]) {
      pedidos = lista;
      programar();
    },
    // Cortar y volver a abrir con los mismos temas (por ejemplo, si un envío falló).
    reconectar: () => flujo?.reconectar(),
  };
}

export type Canal = ReturnType<typeof crearCanal>;
