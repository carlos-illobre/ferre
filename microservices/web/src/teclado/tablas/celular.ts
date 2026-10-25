import type { Linea } from "../motor/tabla";
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

export const TABLA_DEL_CELULAR: Linea[] = [...DE_CUALQUIER_PANTALLA, ...DE_VENDER];
