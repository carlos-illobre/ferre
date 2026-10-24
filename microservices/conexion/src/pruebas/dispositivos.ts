// Dos dispositivos de prueba, cada uno con su enlace, unidos por una central de verdad. El `fetch`
// de cada uno le pasa los pedidos a la central, con el lado en una cabecera.
import { crearCentral } from "../servidor/index.js";
import { crearEnlace, type Enlace, type EstadoDelEnlace } from "../navegador/index.js";
import { almacenEnMemoria } from "../navegador/memoria.js";
import { relojDePrueba } from "./red.js";

export function centralDePrueba() {
  const central = crearCentral({ cadaTanto: () => () => {} });
  const posts: string[] = [];
  const flujos: Array<{ cortar(): void }> = [];
  let caida = false;
  const fetch = (async (url: string, init: RequestInit = {}) => {
    if (caida) throw new Error("sin red");
    const lado = (init.headers as Record<string, string>).lado!;
    if (init.method === "POST") {
      posts.push(init.body as string);
      return new Response(null, { status: central.recibir(url, lado, init.body as string) });
    }
    const lector = central.escuchar(url, lado).body!.getReader();
    let control!: ReadableStreamDefaultController<Uint8Array>;
    const cuerpo = new ReadableStream<Uint8Array>({
      start: (c) => { control = c; },
      async pull(c) { const r = await lector.read(); if (r.done) c.close(); else c.enqueue(r.value); },
    });
    const cortar = () => { void lector.cancel(); control.error(new Error("corte")); };
    init.signal?.addEventListener("abort", cortar);
    flujos.push({ cortar });
    return new Response(cuerpo, { status: 200 });
  }) as unknown as typeof globalThis.fetch;
  return {
    central, posts, fetch,
    // Se cae la conexión con el servidor (los flujos abiertos se cortan) o vuelve.
    caer() { caida = true; flujos.splice(0).forEach((f) => f.cortar()); },
    volver() { caida = false; },
  };
}

export function dispositivos(Conexion: { compu?: typeof RTCPeerConnection; celu?: typeof RTCPeerConnection }) {
  const red = centralDePrueba();
  const reloj = relojDePrueba();
  const almacenes = { computadora: almacenEnMemoria(), celular: almacenEnMemoria() };
  let epocas = 0;
  const abrir = (lado: "computadora" | "celular") => {
    const enlace = crearEnlace({
      url: "/sala", inicia: lado === "computadora", cabeceras: () => ({ lado }), almacen: almacenes[lado],
      red: { fetch: red.fetch, Conexion: lado === "computadora" ? Conexion.compu : Conexion.celu, ahora: reloj.ahora, esperar: reloj.esperar, epoca: `${lado}-${epocas++}` },
    });
    const recibido: unknown[] = [];
    const estados: EstadoDelEnlace[] = [];
    enlace.recibidos.escuchar((d) => recibido.push(d));
    enlace.cambios.escuchar((e) => estados.push(e));
    return { enlace, recibido, estados, conexion: () => enlace.estado().conexion };
  };
  return { red, reloj, almacenes, abrir };
}
export type Dispositivo = { enlace: Enlace; recibido: unknown[]; estados: EstadoDelEnlace[]; conexion: () => string };
