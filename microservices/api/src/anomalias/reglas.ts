import { base } from "../base.js";
import * as datos from "./datos.js";

// Anomalías (RF-59): el registro de cada vez que el sistema y la realidad no coincidieron. Se
// anotan solas y no se editan ni se borran: son una auditoría. De a 50, las más nuevas primero.
const POR_PAGINA = 50;
export async function pagina(numero: unknown) {
  const pagina = Math.max(1, Math.floor(Number(numero ?? 1)) || 1);
  // Se pide una de más para saber si hay otra página.
  const filas = await datos.pagina(base, POR_PAGINA + 1, (pagina - 1) * POR_PAGINA);
  return { pagina, hay_mas: filas.length > POR_PAGINA, anomalias: filas.slice(0, POR_PAGINA) };
}
