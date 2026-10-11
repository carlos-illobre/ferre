// El estado de la conexión, uno solo para toda la v4: si hay internet y cuántos cambios hechos
// acá esperan para enviarse. Al volver la conexión (y cada minuto, porque el aviso del
// navegador no siempre llega tras un microcorte) se reintenta enviar lo pendiente.
import { useSyncExternalStore } from "react";
import { alCambiarLaCola, enviarPendientes, pendientes } from "../cola";

export type Conexion = { enLinea: boolean; porEnviar: number };

let estado: Conexion = { enLinea: typeof navigator === "undefined" ? true : navigator.onLine, porEnviar: 0 };
const oyentes = new Set<() => void>();
let apagar: (() => void) | null = null;

function poner(cambio: Partial<Conexion>) {
  const nuevo = { ...estado, ...cambio };
  if (nuevo.enLinea === estado.enLinea && nuevo.porEnviar === estado.porEnviar) return;
  estado = nuevo;
  for (const oyente of oyentes) oyente();
}

const reintentar = () => { enviarPendientes().catch(() => undefined); };

function encender(): () => void {
  let vigente = true;
  const contar = () => { pendientes().then((lista) => { if (vigente) poner({ porEnviar: lista.length }); }).catch(() => undefined); };
  const alConectar = () => { poner({ enLinea: true }); reintentar(); };
  const alDesconectar = () => poner({ enLinea: false });
  poner({ enLinea: navigator.onLine });
  contar();
  const quitar = alCambiarLaCola(contar);
  window.addEventListener("online", alConectar);
  window.addEventListener("offline", alDesconectar);
  const cada = window.setInterval(() => { if (navigator.onLine) reintentar(); }, 60_000);
  if (navigator.onLine) reintentar();
  return () => { vigente = false; quitar(); window.removeEventListener("online", alConectar); window.removeEventListener("offline", alDesconectar); window.clearInterval(cada); };
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  if (!apagar) apagar = encender();
  return () => {
    oyentes.delete(oyente);
    if (oyentes.size === 0) { apagar?.(); apagar = null; }
  };
}

/** `enLinea`: si el dispositivo tiene internet. `porEnviar`: cambios guardados acá que todavía no llegaron al servidor. */
export function useConexion(): Conexion {
  return useSyncExternalStore(suscribir, () => estado);
}
