import type { Linea } from "../../motor/tabla";

// Compras: Alt N registra una compra, Alt P arma un pedido y Supr anula la compra con el foco.
export const DE_COMPRAS: Linea[] = [
  { tecla: "Alt+N", accion: "compras.registrar", etiqueta: "Alt N" },
  { tecla: "Alt+P", accion: "compras.pedido", etiqueta: "Alt P" },
  { tecla: "Delete", accion: "compras.anular", lugar: true },
];
