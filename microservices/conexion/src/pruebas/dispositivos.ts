// Dos dispositivos de prueba, cada uno con su central y su enlace, unidos por canales de verdad.
// El `fetch` de cada uno le pasa los pedidos a los canales, con el lado en una cabecera.
import { crearCanales } from "../servidor/index.js";
import { leerTemas } from "../comun/temas.js";
import { crearCentral, crearEnlace, type Enlace, type EstadoDelEnlace } from "../navegador/index.js";
import { almacenEnMemoria } from "../navegador/memoria.js";
import { relojDePrueba } from "./red.js";
import { vistaDePrueba } from "./vista.js";

export const TEMA = "vinculo:1";

export function canalesDePrueba() {
  const canales = crearCanales({ cadaTanto: () => () => {} });
  const posts: string[] = [];
  const flujos: Array<{ cortar(): void }> = [];
  let caida = false;
  const fetch = (async (_url: string, init: RequestInit = {}) => {
    if (caida) throw new Error("sin red");
    const cabeceras = init.headers as Record<string, string>;
    const lado = cabeceras.lado!;
    if (init.method === "POST") {
      posts.push(init.body as string);
      return new Response(null, { status: canales.recibir(TEMA, lado, init.body as string) });
    }
    const temas = leerTemas(cabeceras["X-Temas"])!.map((p) => ({ tema: p.t, lado: p.l }));
    const lector = canales.abrir(lado, lado, temas).body!.getReader();
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
    canales, posts, fetch,
    // Se cae la conexión con el servidor (los flujos abiertos se cortan) o vuelve.
    caer() { caida = true; flujos.splice(0).forEach((f) => f.cortar()); },
    volver() { caida = false; },
  };
}

export function dispositivos(Conexion: { compu?: typeof RTCPeerConnection; celu?: typeof RTCPeerConnection }) {
  const red = canalesDePrueba();
  const reloj = relojDePrueba();
  const almacenes = { computadora: almacenEnMemoria(), celular: almacenEnMemoria() };
  let epocas = 0;
  const abrir = (lado: "computadora" | "celular") => {
    const vista = vistaDePrueba();
    const entorno = { fetch: red.fetch, esperar: reloj.esperar, vista, red: { alCambiar: () => () => {} } };
    const central = crearCentral({ url: "/canal", cabeceras: () => ({ lado }), entorno });
    const enlace = crearEnlace({
      central, tema: TEMA, lado, url: "/canal/vinculo", inicia: lado === "computadora", almacen: almacenes[lado],
      red: { Conexion: lado === "computadora" ? Conexion.compu : Conexion.celu, ahora: reloj.ahora, esperar: reloj.esperar, epoca: `${lado}-${epocas++}` },
    });
    const recibido: unknown[] = [];
    const estados: EstadoDelEnlace[] = [];
    enlace.recibidos.escuchar((d) => recibido.push(d));
    enlace.cambios.escuchar((e) => estados.push(e));
    return { enlace, central, vista, recibido, estados, conexion: () => enlace.estado().conexion };
  };
  return { red, reloj, almacenes, abrir };
}
export type Dispositivo = { enlace: Enlace; recibido: unknown[]; estados: EstadoDelEnlace[]; conexion: () => string };
