import { CABECERA_A_CUESTAS, type ACuestas } from "../comun/temas.js";

// Lo permanente que el servidor dice en cada respuesta, sin que nadie lo pregunte (ADR-030): la
// versión, por ejemplo. Cada tema tiene quien da su valor; agregar uno es una línea.
export function crearACuestas() {
  const temas = new Map<string, () => unknown>();
  const valores = (): ACuestas => Object.fromEntries([...temas].map(([tema, dar]) => [tema, dar()]));
  return {
    // Desde ahora, cada respuesta dice el valor de este tema. Devuelve cómo dejar de decirlo.
    agregar(tema: string, dar: () => unknown) {
      temas.set(tema, dar);
      return () => temas.delete(tema);
    },
    valores,
    // La cabecera que va en cada respuesta: nombre y valor.
    cabecera: (): [string, string] => [CABECERA_A_CUESTAS, JSON.stringify(valores())],
  };
}

export type LoQueVaACuestas = ReturnType<typeof crearACuestas>;
