import type { Linea } from "../motor/tabla";

// Lo de cualquier pantalla, en las dos interfaces. Primero lo del lugar donde está el foco (una
// lista con su búsqueda, un campo, una cantidad) y después lo de arriba de todo (cerrar la hoja o
// el menú abierto).
export const DE_CUALQUIER_PANTALLA: Linea[] = [
  // Una lista con su búsqueda: ↑ ↓ marcan, Enter elige la marcada, Esc sale.
  { tecla: "ArrowDown", accion: "lista.siguiente", lugar: true, enCampos: true },
  { tecla: "ArrowUp", accion: "lista.anterior", lugar: true, enCampos: true },
  { tecla: "Enter", accion: "lista.elegir", lugar: true, enCampos: true },
  { tecla: "Escape", accion: "lista.salir", lugar: true, enCampos: true },
  // Un campo que se confirma o se deshace.
  { tecla: "Enter", accion: "campo.listo", lugar: true, enCampos: true },
  { tecla: "Escape", accion: "campo.deshacer", lugar: true, enCampos: true },
  // Una cantidad: sumar y restar uno.
  { tecla: "ArrowUp", accion: "cantidad.subir", lugar: true, enCampos: true },
  { tecla: "ArrowDown", accion: "cantidad.bajar", lugar: true, enCampos: true },
  // Cerrar lo que está abierto arriba de todo (una hoja, un menú).
  { tecla: "Escape", accion: "cerrar", enCampos: true },
];
