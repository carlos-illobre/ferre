import { crearAvisos, type Avisos } from "../comun/avisos.js";
import type { Motivo } from "../comun/mensajes.js";
import type { Esperar } from "./reloj.js";

// Un intento de conexión directa entre los dos dispositivos, con WebRTC y un canal de datos
// ordenado y confiable (ADR-027). Sin servidores STUN ni TURN: solo la red local (E31). El que
// arma (`inicia`) crea el canal y la oferta; el otro responde. Las señales (la oferta, la
// respuesta y los candidatos) las lleva el servidor. Si no hay WebRTC, falla enseguida por el
// navegador; si a los 5 segundos el canal no abrió, falla por la red.
//
// Cada intento tiene su número, que va en cada señal y siempre crece: el que arma lo elige y el
// otro contesta la oferta más nueva que le llegó. Las señales de otro intento (uno anterior que
// quedó en camino) se descartan: aplicarlas haría fallar a este.
export const PLAZO_DE_LA_DIRECTA_MS = 5_000;

// El canal ya abierto: mandar texto, escuchar lo que llega y enterarse si se cierra.
export type CanalDirecto = { mandar(texto: string): void; mensajes: Avisos<string>; cerrado: Avisos<void>; cerrar(): void };

export type OpcionesDeLaDirecta = {
  inicia: boolean;
  Conexion: typeof RTCPeerConnection | undefined;
  esperar: Esperar;
  mandarSenal: (senal: object) => void;
  alAbrir: (canal: CanalDirecto) => void;
  alFallar: (motivo: Motivo) => void;
};

type Senal = { i?: number; sdp?: RTCSessionDescriptionInit; candidato?: RTCIceCandidateInit };

// El número de un intento: crece siempre en la página, y al menos es la hora (una página nueva
// numera después que la anterior).
let ultimoNumero = 0;
const numeroNuevo = () => (ultimoNumero = Math.max(ultimoNumero + 1, Date.now()));
export type IntentoDirecto = { recibirSenal(senal: object): void; cancelar(): void };

export function intentarDirecta(o: OpcionesDeLaDirecta): IntentoDirecto {
  if (!o.Conexion) {
    o.alFallar("navegador");
    return { recibirSenal: () => {}, cancelar: () => {} };
  }
  const Conexion = o.Conexion;
  let pc!: RTCPeerConnection;
  let numero: number | null = null;
  const mandar = (s: Senal) => o.mandarSenal({ ...s, i: numero });
  let terminado = false;
  let cola = Promise.resolve();
  // Termina el intento una sola vez: o abrió, o falló, o se canceló.
  const terminar = (hacer: () => void) => {
    if (terminado) return;
    terminado = true;
    cancelarPlazo();
    hacer();
  };
  const fallar = () => terminar(() => { pc.close(); o.alFallar("red"); });
  const cancelarPlazo = o.esperar(PLAZO_DE_LA_DIRECTA_MS, fallar);
  // El canal escucha desde que existe: lo que llega antes de abrir (puede pasar) se guarda y se
  // entrega apenas quien lo usa empezó a escuchar.
  const usar = (dc: RTCDataChannel) => {
    const { canal, entregarLoGuardado } = canalDe(pc, dc);
    dc.onopen = () => terminar(() => { o.alAbrir(canal); entregarLoGuardado(); });
  };
  // La conexión de un intento (la del que contesta se vuelve a armar si llega una oferta más nueva).
  function armar(n: number) {
    pc?.close();
    pc = new Conexion({ iceServers: [] });
    numero = n;
    cola = Promise.resolve();
    pc.onicecandidate = (ev) => { if (ev.candidate) mandar({ candidato: ev.candidate.toJSON() }); };
  }

  if (o.inicia) {
    armar(numeroNuevo());
    usar(pc.createDataChannel("enlace"));
    cola = pc.createOffer().then((oferta) => pc.setLocalDescription(oferta)).then(() => mandar({ sdp: pc.localDescription!.toJSON() })).catch(fallar);
  }

  // Las señales se atienden de a una, en el orden en que llegan: un candidato no se puede agregar
  // antes de la oferta o la respuesta.
  async function atender(s: Senal) {
    if (s.sdp) {
      await pc.setRemoteDescription(s.sdp);
      if (s.sdp.type === "offer") {
        await pc.setLocalDescription(await pc.createAnswer());
        mandar({ sdp: pc.localDescription!.toJSON() });
      }
    }
    if (s.candidato) await pc.addIceCandidate(s.candidato);
  }

  return {
    recibirSenal(senal) {
      const s = senal as Senal;
      // El que contesta arma su conexión con cada oferta más nueva que la que tenía (una vieja
      // que llega tarde se descarta); después, solo atiende lo de ese intento.
      if (!o.inicia && s.sdp?.type === "offer" && (s.i ?? 0) > (numero ?? 0)) {
        armar(s.i!);
        pc.ondatachannel = (ev) => usar(ev.channel);
      }
      if (numero === null || s.i !== numero) return;
      cola = cola.then(() => (terminado ? undefined : atender(s))).catch(fallar);
    },
    cancelar: () => terminar(() => pc?.close()),
  };
}

// El canal directo. Se da por cerrado si se cierra el canal o si se cae la conexión de abajo. Lo
// que llega antes de `entregarLoGuardado` se guarda en orden.
function canalDe(pc: RTCPeerConnection, dc: RTCDataChannel) {
  const mensajes = crearAvisos<string>();
  const cerrado = crearAvisos<void>();
  let guardados: string[] | null = [];
  dc.onmessage = (ev: MessageEvent) => { if (guardados) guardados.push(String(ev.data)); else mensajes.avisar(String(ev.data)); };
  dc.onclose = () => cerrado.avisar();
  pc.onconnectionstatechange = () => { if (["failed", "disconnected", "closed"].includes(pc.connectionState)) cerrado.avisar(); };
  const canal: CanalDirecto = { mandar: (texto) => dc.send(texto), mensajes, cerrado, cerrar: () => pc.close() };
  function entregarLoGuardado() {
    const lista = guardados!;
    guardados = null;
    lista.forEach((texto) => mensajes.avisar(texto));
  }
  return { canal, entregarLoGuardado };
}
