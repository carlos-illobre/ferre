import type { Linea } from "../../motor/tabla";

// Duplicados: E son el mismo, D son distintos, J la siguiente y K la anterior, ← y → eligen qué
// lado se conserva; Alt B busca en todo, Alt U une a mano y Alt S muestra los unidos.
export const DE_DUPLICADOS: Linea[] = [
  { tecla: "E", accion: "duplicados.mismo" },
  { tecla: "D", accion: "duplicados.distintos" },
  { tecla: "J", accion: "duplicados.siguiente" },
  { tecla: "K", accion: "duplicados.anterior" },
  { tecla: "ArrowLeft", accion: "duplicados.conservar-a" },
  { tecla: "ArrowRight", accion: "duplicados.conservar-b" },
  { tecla: "Alt+B", accion: "duplicados.buscar", etiqueta: "Alt B" },
  { tecla: "Alt+U", accion: "duplicados.unir", etiqueta: "Alt U" },
  { tecla: "Alt+S", accion: "duplicados.unidos", etiqueta: "Alt S" },
];
