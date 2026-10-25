import type { Linea } from "../motor/tabla";
import { enLaBusquedaYFuera } from "./ayudas";
import { DE_CUALQUIER_PANTALLA } from "./comunes";

// Las teclas del celular (un teclado conectado, o el de la pantalla en un campo): qué tecla pide
// cada acción (ADR-029).
// Vender, con un teclado conectado: F5 a F8 eligen cómo paga y F2 cobra; fuera de la búsqueda,
// ↑ ↓ siguen eligiendo lo encontrado.
const DE_VENDER: Linea[] = [
  { tecla: "F5", accion: "vender.medio.efectivo", enCampos: true },
  { tecla: "F6", accion: "vender.medio.mercado_pago", enCampos: true },
  { tecla: "F7", accion: "vender.medio.tarjeta", enCampos: true },
  { tecla: "F8", accion: "vender.medio.cuenta_corriente", enCampos: true },
  { tecla: "F2", accion: "vender.cobrar", enCampos: true },
  { tecla: "ArrowDown", accion: "vender.busqueda.siguiente" },
  { tecla: "ArrowUp", accion: "vender.busqueda.anterior" },
];

// Productos: ↑ ↓ eligen, Enter abre, Esc limpia la búsqueda y Mayús + 1 a 5 fijan el margen.
const DE_PRODUCTOS: Linea[] = [
  ...enLaBusquedaYFuera("ArrowDown", "productos.siguiente"),
  ...enLaBusquedaYFuera("ArrowUp", "productos.anterior"),
  ...enLaBusquedaYFuera("Enter", "productos.abrir"),
  ...enLaBusquedaYFuera("Escape", "productos.volver"),
  ...[1, 2, 3, 4, 5].flatMap((n) => enLaBusquedaYFuera(`Mayús+${n}`, `productos.margen.${n}`, `Shift+${n}`)),
];

export const TABLA_DEL_CELULAR: Linea[] = [...DE_CUALQUIER_PANTALLA, ...DE_VENDER, ...DE_PRODUCTOS];

// Cómo se usan las teclas, dicho en una frase, para quien tiene un teclado conectado.
export const ETIQUETAS_DEL_CELULAR: Record<string, string> = {
  "productos.ayuda.elegir": "Flechas para elegir · Enter abre",
  "productos.ayuda.margen": "Shift+1 a Shift+5 fijan el margen (300, 200, 100, 50, 25 %)",
  "productos.ayuda.limpiar": "Esc limpia",
};
