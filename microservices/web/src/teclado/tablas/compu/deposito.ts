import type { Linea } from "../../motor/tabla";

// Inventario: «/» va a la búsqueda, C a «¿Cuántas hay?» del elegido y ↑ ↓ eligen (en la búsqueda
// también, como en cualquier lista con su búsqueda). Contar: Alt C cierra el sector y Alt E le pide
// el lector al celular. Etiquetas, todavía sin hacer, tendrá Alt E.
export const DEL_DEPOSITO: Linea[] = [
  { tecla: "/", accion: "inventario.buscar" },
  { tecla: "C", accion: "inventario.corregir" },
  { tecla: "ArrowDown", accion: "inventario.siguiente" },
  { tecla: "ArrowUp", accion: "inventario.anterior" },
  { tecla: "Alt+E", accion: "inventario.etiquetas", etiqueta: "Alt E" },
  { tecla: "Alt+C", accion: "conteo.cerrar", etiqueta: "Alt C" },
  { tecla: "Alt+E", accion: "conteo.lector", etiqueta: "Alt E" },
];
