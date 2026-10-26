import * as datos from "../persistencia/sistema.js";
import { TRAMOS_DE_SESION } from "./esquemas.js";

// El tiempo que fija quien administra, para todos (specs/020, RF-133; el del celular emparejado
// se sacó con specs/023, RF-138). El servidor
// los lee al arrancar y los tiene en memoria: la sesión los consulta en cada pedido. Al guardarlos
// cambian en la base y acá a la vez. Si no se pueden leer, valen los de arranque.
export type Tiempos = { sesion_segundos: number };
export const DE_ARRANQUE: Tiempos = { sesion_segundos: 60 };
export const CLAVES = { sesion_segundos: "sesion.recordar_segundos" } as const;
const TRAMOS = { sesion_segundos: TRAMOS_DE_SESION } as const;

let actuales: Tiempos = { ...DE_ARRANQUE };

export const tiempos = (): Tiempos => actuales;
export const segundosDeSesion = (): number => actuales.sesion_segundos;

export async function leerTiempos(): Promise<Tiempos> {
  const guardados = await datos.leer(Object.values(CLAVES)).catch(() => new Map<string, string>());
  const de = (k: keyof Tiempos) => { const n = Number(guardados.get(CLAVES[k])); return (TRAMOS[k] as readonly number[]).includes(n) ? n : DE_ARRANQUE[k]; };
  actuales = { sesion_segundos: de("sesion_segundos") };
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
