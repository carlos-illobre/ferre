import { cuandoCorto } from "../apartados";
import { diasAbierto, type Pendiente, type Ticket } from "./tickets";

// Lo que se dice de un ticket en la lista y abierto, igual en el celular y en la computadora.
export const fueEnviado = (x: Ticket | Pendiente): x is Ticket => "estado" in x;

// Quién, cuándo y desde dónde; lo que no se mandó todavía, «por enviar».
export function quienYCuando(x: Ticket | Pendiente, porEnviar: string, { dispositivo = true, version = false } = {}): string {
  if (!fueEnviado(x)) return porEnviar;
  return [x.usuario, cuandoCorto(x.creado_en), dispositivo && x.dispositivo, version && x.version ? `versión ${x.version}` : null].filter(Boolean).join(" · ");
}

// Los días que lleva abierto (los resueltos y los por enviar, cero).
export const diasEsperando = (x: Ticket | Pendiente) => (fueEnviado(x) && x.estado === "abierto" ? diasAbierto(x) : 0);

export function cuantoHaceQueEstaAbierto(x: Ticket, hoy: string, hace: string): string {
  const dias = diasAbierto(x);
  return dias === 0 ? hoy : `${hace} ${dias === 1 ? "1 día" : `${dias} días`}.`;
}

// Quién lo resolvió, cuándo y con qué nota.
export const comoSeResolvio = (x: Ticket): [string, string] => [x.resuelto_en ? ` ${cuandoCorto(x.resuelto_en)}` : "", x.nota ? `: ${x.nota}` : ""];

export function sinTicketsQueVer(viendo: "abierto" | "resuelto", hayAlguno: boolean, primeroDonde: string): string {
  if (viendo === "resuelto") return "Todavía no se resolvió ninguno.";
  return hayAlguno ? "No queda ningún ticket abierto." : `Todavía no hay tickets. El primero lo escribís ${primeroDonde}.`;
}
