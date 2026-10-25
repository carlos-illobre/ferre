import type { Linea } from "../../motor/tabla";
import { enLaBusquedaYFuera } from "../ayudas";

// Productos: ↑ ↓ eligen (y la ficha sigue), Enter entra a la ficha, Esc vuelve a la búsqueda (o la
// borra), «+» agrega a la venta, Mayús + 1 a 5 fijan el margen, F1 pliega «Así se calcula», Alt F
// abre los filtros y Alt E le pide el lector al celular. Todo vale también con el cursor en la búsqueda.
export const DE_PRODUCTOS: Linea[] = [
  ...enLaBusquedaYFuera("ArrowDown", "productos.siguiente"),
  ...enLaBusquedaYFuera("ArrowUp", "productos.anterior"),
  ...enLaBusquedaYFuera("Enter", "productos.abrir"),
  ...enLaBusquedaYFuera("Escape", "productos.volver"),
  ...enLaBusquedaYFuera("+", "productos.agregar"),
  ...[1, 2, 3, 4, 5].flatMap((n) => enLaBusquedaYFuera(`Mayús+${n}`, `productos.margen.${n}`, `Mayúsculas + ${n}`)),
  ...enLaBusquedaYFuera("F1", "productos.calculo"),
  ...enLaBusquedaYFuera("Alt+F", "productos.filtros", "Alt F"),
  ...enLaBusquedaYFuera("Alt+E", "productos.lector", "Alt E"),
];

// Lo que se muestra junto a varias teclas a la vez.
export const ETIQUETAS_DE_PRODUCTOS = { "productos.margenes": "Mayús|1–5" };
