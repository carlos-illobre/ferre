import type { SesionActual } from "@servidor/sesiones";

// Lo que fija quien administra para todos los dispositivos (specs/020): cada cuánto pregunta el
// celular emparejado por los pedidos de la computadora. Llega con cada control de la sesión, así
// un cambio llega a los dispositivos abiertos en menos de un minuto. Hasta saberlo, 1 minuto.
const DE_ARRANQUE_S = 60;
let celularS = DE_ARRANQUE_S;
const oyentes = new Set<() => void>();

export function ponerAjustes(ajustes: SesionActual["ajustes"] | undefined): void {
  const s = ajustes?.celular_segundos;
  if (typeof s !== "number" || !(s > 0) || s === celularS) return;
  celularS = s;
  oyentes.forEach((o) => o());
}
export const celularCadaMs = (): number => celularS * 1000;
export function alCambiarAjustes(oyente: () => void): () => void { oyentes.add(oyente); return () => { oyentes.delete(oyente); }; }

// Para las pruebas: como al abrir la aplicación.
export function olvidarAjustes(): void { celularS = DE_ARRANQUE_S; oyentes.clear(); }
