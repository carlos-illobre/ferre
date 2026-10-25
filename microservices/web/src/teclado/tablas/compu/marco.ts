import type { Linea } from "../../motor/tabla";

// El menú: Alt + número abre cada pantalla en el orden en que se ven; Ctrl+B lo achica. Y «Listo»
// después de cobrar o de registrar.
export const DEL_MARCO: Linea[] = [
  ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((n, i) => ({ tecla: `Alt+${n}`, accion: `menu.${i + 1}`, enCampos: true })),
  { tecla: "Ctrl+B", accion: "menu.plegar", enCampos: true },
  { tecla: "Enter", accion: "exito.seguir" },
];
