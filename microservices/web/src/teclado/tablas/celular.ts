import type { Linea } from "../motor/tabla";

// Las teclas del celular (un teclado conectado, o el de la pantalla en un campo): qué tecla pide
// cada acción (ADR-029).
export const TABLA_DEL_CELULAR: Linea[] = [
  // Lo de cualquier pantalla: cerrar lo que está abierto arriba (una hoja, un menú) y, en una
  // cantidad, sumar y restar uno.
  { tecla: "Escape", accion: "cerrar", enCampos: true },
  { tecla: "ArrowUp", accion: "cantidad.subir", lugar: true, enCampos: true },
  { tecla: "ArrowDown", accion: "cantidad.bajar", lugar: true, enCampos: true },
];
