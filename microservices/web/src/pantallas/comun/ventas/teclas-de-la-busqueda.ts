import type { TablaDeTeclas } from "../../../plataforma/teclado";

// ↑ ↓ eligen un producto de los encontrados; sin resultados a la vista no son para eso: recorren
// la pantalla (flechas.ts).
export function flechasDeLaBusqueda(hayResultados: boolean, mover: (paso: 1 | -1) => void): TablaDeTeclas {
  return { ArrowDown: () => (hayResultados ? mover(1) : false), ArrowUp: () => (hayResultados ? mover(-1) : false) };
}
