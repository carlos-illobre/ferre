import { crearEnlace, type Enlace, type EstadoDelEnlace } from "conexion-entre-dispositivos/navegador";
import { avisos, urlApi } from "../conexion";
import { EVENTO_EMPAREJAMIENTO, guardarPuestoLocal, guardarPuestoRemoto, puestoLocal, puestoRemoto } from "./puesto";
import { EVENTO_SESION_ABIERTA } from "../sesion";

// La conexión entre el celular y la computadora emparejados (specs/023, ADR-027). Un solo enlace
// por aplicación, el del vínculo que tenga este dispositivo: directo entre los dos si la red lo
// deja, por el servidor si no. Por acá viajan el lector, el espejo y los pedidos de foto. Qué
// significa cada mensaje lo decide quien lo escucha (el espejo, el lector, la foto).
export type Lado = "computadora" | "celular";

// Lo que Ferrebress se manda entre los dos dispositivos.
export type MensajeDelEnlace =
  | { tipo: "codigo"; codigo: string }                                  // el celular escaneó (RF-08)
  | { tipo: "pedir-lector" }                                            // la computadora quiere escanear (decisión 59)
  | { tipo: "pedir-foto"; id: string; para: string }                    // la computadora pide una foto (RF-50)
  | { tipo: "foto"; id: string; imagen: string }                        // la foto, como data URL
  | { tipo: "espejo"; cambio: string; datos: unknown }                  // un cambio del espejo (RF-77)
  | { tipo: "estado"; docs: Record<string, { datos: unknown; haceMs: number }>; pausado: boolean } // lo que tiene cada lado al encontrarse
  | { tipo: "pausa"; pausado: boolean }
  | { tipo: "aviso"; texto: string };                                   // algo que terminó del otro lado
type Tipo = MensajeDelEnlace["tipo"];

// `sala`: el vínculo; si cambia, es otro emparejamiento.
export type EstadoDelVinculo = (EstadoDelEnlace & { lado: Lado; sala: string }) | null;

let enlace: Enlace | null = null;
let sala: string | null = null;
let estado: EstadoDelVinculo = null;
const oyentesDeEstado = new Set<() => void>();
const oyentesDeMensajes = new Set<(m: MensajeDelEnlace) => void>();
const avisarEstado = () => oyentesDeEstado.forEach((o) => o());

// Lo que llega del otro lado tiene que ser un objeto con un tipo conocido; cada oyente valida el resto.
const TIPOS: Tipo[] = ["codigo", "pedir-lector", "pedir-foto", "foto", "espejo", "estado", "pausa", "aviso"];
const esMensaje = (m: unknown): m is MensajeDelEnlace => typeof m === "object" && m !== null && TIPOS.includes((m as { tipo: Tipo }).tipo);

// Se arma (o se cambia) el enlace según el vínculo que tenga este dispositivo.
// El vínculo de este dispositivo: de qué lado está y cuál es (o nada, si no está emparejado).
function vinculoDeEsteDispositivo(): { lado: Lado; id: string } | null {
  const local = puestoLocal();
  if (local) return { lado: "computadora", id: local.id };
  const remoto = puestoRemoto();
  return remoto ? { lado: "celular", id: remoto.id } : null;
}

// Se arma (o se cambia) el enlace según el vínculo que tenga este dispositivo.
function conectar() {
  const v = vinculoDeEsteDispositivo();
  const id = v?.id ?? null;
  if (id === sala && (id === null || enlace)) return;
  soltarEnlace();
  sala = id;
  if (v) armar(v.id, v.lado);
  avisarEstado();
}
function soltarEnlace() {
  enlace?.cerrar();
  enlace = null; sala = null; estado = null;
}

// El enlace del vínculo, con lo que pasa con él: cada cambio de estado, cada mensaje, y el cierre.
function armar(id: string, lado: Lado) {
  // El vínculo es un tema del canal único del dispositivo (ADR-030): el servidor sirve para
  // encontrarse y de respaldo; armada la directa, el canal se suelta.
  const tema = `vinculo:${id}`;
  const e = crearEnlace({
    central: avisos,
    tema,
    lado,
    url: urlApi(`/canal/${tema}`),
    inicia: lado === "computadora",
    almacen: almacenSeguro(),
    clave: `ferre.enlace.${id}`,
  });
  e.cambios.escuchar((nuevo) => { estado = { ...nuevo, lado, sala: id }; avisarEstado(); });
  e.recibidos.escuchar((m) => { if (esMensaje(m)) oyentesDeMensajes.forEach((o) => o(m)); });
  // El vínculo ya no existe (se soltó, venció, cerraron la sesión): acá deja de figurar.
  e.cerrada.escuchar(soltarLocal);
  // 404: el vínculo no existe. 401: la sesión no vale; se vuelve a probar al abrir una sesión.
  e.rechazado.escuchar((codigo) => { if (codigo === 404) soltarLocal(); else { soltarEnlace(); avisarEstado(); } });
  enlace = e;
  estado = { ...e.estado(), lado, sala: id };
}
function soltarLocal() { guardarPuestoLocal(null); guardarPuestoRemoto(null); }

// `localStorage` puede no estar (navegación privada): entonces se recuerda solo mientras está abierta.
function almacenSeguro(): Storage | undefined {
  try { localStorage.getItem("ferre.enlace"); return localStorage; } catch { return undefined; }
}

let arrancado = false;
export function arrancarEnlace() {
  if (arrancado || typeof window === "undefined") return;
  arrancado = true;
  window.addEventListener(EVENTO_EMPAREJAMIENTO, conectar);
  window.addEventListener(EVENTO_SESION_ABIERTA, conectar);
  // Al cerrar la página se cierra el enlace: así el otro se entera en el momento (si no, tarda lo
  // que el navegador tarde en notar que el canal se cayó). Si la página vuelve (el navegador la
  // guardó), se conecta de nuevo.
  window.addEventListener("pagehide", () => { enlace?.cerrar(); enlace = null; sala = null; });
  window.addEventListener("pageshow", (e) => { if (e.persisted) conectar(); });
  conectar();
}

export const estadoDelVinculo = (): EstadoDelVinculo => estado;
export function alCambiarElVinculo(oyente: () => void): () => void {
  oyentesDeEstado.add(oyente);
  return () => { oyentesDeEstado.delete(oyente); };
}
export function alMensajeDelOtro(oyente: (m: MensajeDelEnlace) => void): () => void {
  oyentesDeMensajes.add(oyente);
  return () => { oyentesDeMensajes.delete(oyente); };
}

// Mandar al otro dispositivo; la promesa se cumple cuando lo recibió. Sin vínculo, no se manda.
export function mandarAlOtro(m: MensajeDelEnlace): Promise<void> | null {
  arrancarEnlace();
  return enlace ? enlace.mandar(m) : null;
}
// «Probar conexión directa», desde el detalle del indicador.
export const probarDirecta = () => enlace?.probarDirecta();
// El otro está abierto y se pueden hablar (directo o por el servidor).
export const elOtroEsta = () => estado?.conexion === "directa" || estado?.conexion === "servidor";

// Para las pruebas: como al abrir la aplicación.
export function olvidarEnlace() {
  enlace?.cerrar();
  enlace = null; sala = null; estado = null; arrancado = false;
  oyentesDeEstado.clear(); oyentesDeMensajes.clear();
}
