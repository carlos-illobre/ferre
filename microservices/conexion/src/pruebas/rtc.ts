// Un WebRTC de mentira para las pruebas: las conexiones creadas con la misma red se encuentran
// cuando las dos tienen la oferta y la respuesta, y abren el canal si la red lo deja.
type Desc = { type: string; sdp: string; toJSON(): { type: string; sdp: string } };
const desc = (type: string): Desc => ({ type, sdp: type, toJSON: () => ({ type, sdp: type }) });

export class CanalDePrueba {
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  otro: CanalDePrueba | null = null;
  enviados: string[] = [];
  send(t: string) { this.enviados.push(t); this.otro?.onmessage?.({ data: t }); }
  cerrarDesdeAfuera() { this.onclose?.(); }
}

export function redRTC({ deja = true, fallaEn = "" as "" | "oferta" | "remota" } = {}) {
  const conexiones: ConexionDePrueba[] = [];
  class ConexionDePrueba {
    onicecandidate: ((ev: { candidate: { toJSON(): object } | null }) => void) | null = null;
    ondatachannel: ((ev: { channel: CanalDePrueba }) => void) | null = null;
    onconnectionstatechange: (() => void) | null = null;
    connectionState = "new";
    localDescription: Desc | null = null;
    remota = false;
    canal: CanalDePrueba | null = null;
    cerrada = false;
    candidatos: object[] = [];
    constructor(public config: object) { conexiones.push(this); }
    createDataChannel() { return (this.canal = new CanalDePrueba()); }
    createOffer() { return fallaEn === "oferta" ? Promise.reject(new Error("oferta")) : Promise.resolve(desc("offer")); }
    createAnswer() { return Promise.resolve(desc("answer")); }
    async setLocalDescription(d: Desc) {
      this.localDescription = desc(d.type);
      this.onicecandidate?.({ candidate: { toJSON: () => ({ candidate: "local" }) } });
      this.onicecandidate?.({ candidate: null });
      this.encontrarse();
    }
    async setRemoteDescription() {
      if (fallaEn === "remota") throw new Error("remota");
      this.remota = true;
      this.encontrarse();
    }
    async addIceCandidate(c: object) { this.candidatos.push(c); }
    close() { this.cerrada = true; }
    cambiarEstado(estado: string) { this.connectionState = estado; this.onconnectionstatechange?.(); }
    // Con las dos descripciones de los dos lados, si la red deja, se abre el canal.
    encontrarse() {
      const vivas = conexiones.filter((c) => !c.cerrada);
      const a = vivas.find((c) => c.canal);
      const b = vivas.find((c) => c !== a);
      if (!deja || !a || !b || !a.localDescription || !b.localDescription || !a.remota || !b.remota) return;
      const del_otro = new CanalDePrueba();
      a.canal!.otro = del_otro; del_otro.otro = a.canal;
      setTimeout(() => { a.canal!.onopen?.(); b.ondatachannel?.({ channel: del_otro }); del_otro.onopen?.(); }, 0);
    }
  }
  return { Conexion: ConexionDePrueba as unknown as typeof RTCPeerConnection, conexiones };
}
