import type { z } from "zod";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { diasDeVinculo } from "../acceso/vinculo.js";
import { olvidarSesiones } from "../acceso/sesiones.js";
import { guardarDiasDeVinculo } from "../acceso/datos.js";
import { guardarTiempos, tiempos } from "./ajustes.js";
import { TRAMOS_DE_SESION, type cambiosDeAjustes } from "./esquemas.js";
import type { AjustesDelSistema, ValoresDelSistema } from "../contratos/sistema.js";

// Más → Sistema (specs/020, RF-135): lo que vale para todos los dispositivos. Lo ve y lo cambia
// quien tiene «Administrar el sistema» (la ruta lo pide). Cada cambio queda en «Quién hizo qué»,
// con lo de antes y lo nuevo.
const valores = async (): Promise<ValoresDelSistema> => ({ ...tiempos(), vinculo_dias: await diasDeVinculo(pool) });
const conTramos = (v: ValoresDelSistema): AjustesDelSistema => ({ ...v, tramos: { sesion_segundos: [...TRAMOS_DE_SESION] } });

export const ajustes = async (): Promise<AjustesDelSistema> => conTramos(await valores());

export async function cambiar(cambios: z.output<typeof cambiosDeAjustes>, actorId: string): Promise<AjustesDelSistema> {
  const antes = await valores();
  const { vinculo_dias, ...demas } = cambios;
  await guardarTiempos(demas);
  // Lo recordado con el tiempo de antes no tiene que durar más que el nuevo (E16).
  if (demas.sesion_segundos !== undefined) olvidarSesiones();
  if (vinculo_dias !== undefined) await guardarDiasDeVinculo(vinculo_dias);
  const despues = await valores();
  const cambiados = (Object.keys(despues) as (keyof ValoresDelSistema)[]).filter((k) => antes[k] !== despues[k]);
  if (cambiados.length) {
    await registrarEvento(pool, {
      tipo: "sistema.ajustes_cambiados", usuarioId: actorId,
      contenido: { antes: Object.fromEntries(cambiados.map((k) => [k, antes[k]])), despues: Object.fromEntries(cambiados.map((k) => [k, despues[k]])) },
    });
  }
  return conTramos(despues);
}
