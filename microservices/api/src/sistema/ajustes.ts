import * as datos from "./datos.js";
import { TRAMOS_DE_SESION, TRAMOS_DEL_CELULAR } from "./esquemas.js";

// Los dos tiempos que fija quien administra, para todos (specs/020, RF-133 y RF-134). El servidor
// los lee al arrancar y los tiene en memoria: la sesión los consulta en cada pedido. Al guardarlos
// cambian en la base y acá a la vez. Si no se pueden leer, valen los de arranque.
export type Tiempos = { sesion_segundos: number; celular_segundos: number };
export const DE_ARRANQUE: Tiempos = { sesion_segundos: 60, celular_segundos: 60 };
export const CLAVES = { sesion_segundos: "sesion.recordar_segundos", celular_segundos: "celular.pregunta_segundos" } as const;
const TRAMOS = { sesion_segundos: TRAMOS_DE_SESION, celular_segundos: TRAMOS_DEL_CELULAR } as const;

let actuales: Tiempos = { ...DE_ARRANQUE };

export const tiempos = (): Tiempos => actuales;
export const segundosDeSesion = (): number => actuales.sesion_segundos;

export async function leerTiempos(): Promise<Tiempos> {
  const guardados = await datos.leer(Object.values(CLAVES)).catch(() => new Map<string, string>());
  const de = (k: keyof Tiempos) => { const n = Number(guardados.get(CLAVES[k])); return (TRAMOS[k] as readonly number[]).includes(n) ? n : DE_ARRANQUE[k]; };
  actuales = { sesion_segundos: de("sesion_segundos"), celular_segundos: de("celular_segundos") };
  return actuales;
}

export async function guardarTiempos(cambios: Partial<Tiempos>): Promise<Tiempos> {
  for (const k of Object.keys(CLAVES) as (keyof Tiempos)[]) {
    const v = cambios[k];
    if (v !== undefined) await datos.guardar(CLAVES[k], v);
  }
  actuales = { ...actuales, ...Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined)) };
  return actuales;
}

// Para las pruebas: como al arrancar.
export function ponerParaPrueba(t: Partial<Tiempos> = {}) { actuales = { ...DE_ARRANQUE, ...t }; }
