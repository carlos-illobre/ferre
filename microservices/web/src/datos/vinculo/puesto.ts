import { api } from "../conexion";
import type { VinculoDeLaSesion, VinculosDeLaSesion } from "@servidor/puestos";
import { deEsteAmbiente } from "../../plataforma/ambiente";

// Emparejamiento computadora–celular (issue #52, decisión 58). La computadora es un "puesto";
// el celular emparejado le manda cada código escaneado y recibe sus pedidos de foto, por el
// enlace entre los dos (`enlace.ts` y `codigos-del-celular.ts`, specs/023). Nace solo
// cuando el celular deja entrar a la computadora, o leyendo el código de Vender. Ambos guardan
// su lado en el dispositivo y lo ponen al día con el servidor al abrir la aplicación.
export type PuestoLocal = Pick<VinculoDeLaSesion, "id" | "expira_en">; // en la laptop
export type PuestoRemoto = VinculoDeLaSesion;                          // en el celular

const CLAVE_LOCAL = deEsteAmbiente("ferre.puesto");
const CLAVE_REMOTO = deEsteAmbiente("ferre.puesto-remoto");

function leer<T>(clave: string): T | null {
  try { const v = localStorage.getItem(clave); if (!v) return null; const p = JSON.parse(v) as T & { expira_en: string }; return new Date(p.expira_en).getTime() > Date.now() ? p : null; } catch { return null; }
}
// El identificador de este dispositivo: lo guarda el navegador y no se borra al salir. Con él
// el servidor reconoce un dispositivo ya vinculado cuando el mismo usuario vuelve a entrar (decisión 73).
const CLAVE_DISPOSITIVO = "ferre.dispositivo";
export function dispositivoId(): string {
  try {
    let id = localStorage.getItem(CLAVE_DISPOSITIVO);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(CLAVE_DISPOSITIVO, id); }
    return id;
  } catch { return ""; }
}
export const puestoLocal = () => leer<PuestoLocal>(CLAVE_LOCAL);
export const puestoRemoto = () => leer<PuestoRemoto>(CLAVE_REMOTO);
// Quien muestre el emparejamiento (Vender, Productos, el aviso de fotos) se entera cuando cambia.
export const EVENTO_EMPAREJAMIENTO = "ferre:emparejamiento";
let cambios = 0; // cada vez que cambia lo guardado: para no pisarlo con una respuesta que salió antes
function guardarLado(clave: string, p: object | null) {
  const antes = localStorage.getItem(clave);
  if (p) localStorage.setItem(clave, JSON.stringify(p)); else localStorage.removeItem(clave);
  if (antes !== localStorage.getItem(clave)) { cambios += 1; window.dispatchEvent(new Event(EVENTO_EMPAREJAMIENTO)); }
}
export const guardarPuestoLocal = (p: PuestoLocal | null) => guardarLado(CLAVE_LOCAL, p);
export const guardarPuestoRemoto = (p: PuestoRemoto | null) => guardarLado(CLAVE_REMOTO, p);

// Lo que dice el servidor manda sobre lo guardado: si del otro lado soltaron el emparejamiento
// o cerraron la sesión, acá deja de figurar. Sin conexión, queda lo guardado.
export async function sincronizarEmparejamiento(): Promise<{ comoComputadora: PuestoLocal | null; comoCelular: PuestoRemoto | null } | null> {
  try {
    const alPedir = cambios;
    const r = await api<VinculosDeLaSesion>(`/puestos/mio?dispositivo=${encodeURIComponent(dispositivoId())}`);
    // Si mientras tanto se vinculó o desvinculó acá, esta respuesta es vieja: no pisa lo nuevo.
    if (alPedir !== cambios) return r;
    guardarPuestoLocal(r.comoComputadora ? { id: r.comoComputadora.id, expira_en: r.comoComputadora.expira_en } : null);
    guardarPuestoRemoto(r.comoCelular);
    return r;
  } catch { return null; }
}

// Soltar el emparejamiento, desde cualquiera de los dos lados.
export async function soltarEmparejamiento(): Promise<void> {
  const id = puestoLocal()?.id ?? puestoRemoto()?.id;
  if (id) await api(`/puestos/${id}`, { method: "DELETE" }).catch(() => undefined);
  guardarPuestoLocal(null); guardarPuestoRemoto(null);
}
