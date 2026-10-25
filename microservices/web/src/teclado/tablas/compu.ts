import type { Linea } from "../motor/tabla";

// Las teclas de la computadora: qué tecla pide cada acción que ofrecen las pantallas (ADR-029).
// Se van sumando a medida que cada parte deja de manejar sus teclas (specs/024, T017 a T020); las
// teclas mismas se rehacen en T147.
export const TABLA_DE_LA_COMPU: Linea[] = [
  // Lo de cualquier pantalla: cerrar lo que está abierto arriba (una hoja, un menú) y, en una
  // cantidad, sumar y restar uno.
  { tecla: "Escape", accion: "cerrar", enCampos: true },
  { tecla: "ArrowUp", accion: "cantidad.subir", lugar: true, enCampos: true },
  { tecla: "ArrowDown", accion: "cantidad.bajar", lugar: true, enCampos: true },
  // El menú: Alt + número abre cada pantalla en el orden en que se ven; Ctrl+B lo achica.
  ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((n, i) => ({ tecla: `Alt+${n}`, accion: `menu.${i + 1}`, enCampos: true })),
  { tecla: "Ctrl+B", accion: "menu.plegar", enCampos: true },
  // «Listo» después de cobrar o de registrar.
  { tecla: "Enter", accion: "exito.seguir" },
  // Vender.
  { tecla: "F2", accion: "vender.cobrar", enCampos: true },
  // Productos.
  { tecla: "+", accion: "productos.agregar" },
];
