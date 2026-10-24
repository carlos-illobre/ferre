import { crearAvisos, type Avisos } from "../comun/avisos.js";
import type { Motivo } from "../comun/mensajes.js";
import type { Esperar } from "./reloj.js";

// Un intento de conexión directa entre los dos dispositivos, con WebRTC y un canal de datos
// ordenado y confiable (ADR-027). Sin servidores STUN ni TURN: solo la red local (E31). El que
// arma (`inicia`) crea el canal y la oferta; el otro responde. Las señales (la oferta, la
// respuesta y los candidatos) las lleva el servidor. Si no hay WebRTC, falla enseguida por el
// navegador; si a los 5 segundos el canal no abrió, falla por la red.
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

type Senal = { sdp?: RTCSessionDescriptionInit; candidato?: RTCIceCandidateInit };
export type IntentoDirecto = { recibirSenal(senal: object): void; cancelar(): void };

export function intentarDirecta(o: OpcionesDeLaDirecta): IntentoDirecto {
  if (!o.Conexion) {
    o.alFallar("navegador");
    return { recibirSenal: () => {}, cancelar: () => {} };
  }
  const pc = new o.Conexion({ iceServers: [] });
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
  const usar = (dc: RTCDataChannel) => { dc.onopen = () => terminar(() => o.alAbrir(canalDe(pc, dc))); };

  pc.onicecandidate = (ev) => { if (ev.candidate) o.mandarSenal({ candidato: ev.candidate.toJSON() }); };
  if (o.inicia) {
    usar(pc.createDataChannel("enlace"));
    cola = pc.createOffer().then((oferta) => pc.setLocalDescription(oferta)).then(() => o.mandarSenal({ sdp: pc.localDescription!.toJSON() })).catch(fallar);
  } else pc.ondatachannel = (ev) => usar(ev.channel);

  // Las señales se atienden de a una, en el orden en que llegan: un candidato no se puede agregar
  // antes de la oferta o la respuesta.
  async function atender(s: Senal) {
    if (s.sdp) {
      await pc.setRemoteDescription(s.sdp);
      if (s.sdp.type === "offer") {
        await pc.setLocalDescription(await pc.createAnswer());
        o.mandarSenal({ sdp: pc.localDescription!.toJSON() });
      }
    }
    if (s.candidato) await pc.addIceCandidate(s.candidato);
  }

  return {
    recibirSenal(senal) {
      cola = cola.then(() => (terminado ? undefined : atender(senal as Senal))).catch(fallar);
    },
    cancelar: () => terminar(() => pc.close()),
  };
}

// El canal abierto. Se da por cerrado si se cierra el canal o si se cae la conexión de abajo.
function canalDe(pc: RTCPeerConnection, dc: RTCDataChannel): CanalDirecto {
  const mensajes = crearAvisos<string>();
  const cerrado = crearAvisos<void>();
  dc.onmessage = (ev: MessageEvent) => mensajes.avisar(String(ev.data));
  dc.onclose = () => cerrado.avisar();
  pc.onconnectionstatechange = () => { if (["failed", "disconnected", "closed"].includes(pc.connectionState)) cerrado.avisar(); };
  return { mandar: (texto) => dc.send(texto), mensajes, cerrado, cerrar: () => pc.close() };
}
