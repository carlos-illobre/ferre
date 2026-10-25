import type { Linea } from "../../motor/tabla";

// «Ventas del día»: ↑ ↓ eligen la venta, / o Ctrl+K buscan, F cambia la fecha, E corrige y Supr
// o A anulan; corrigiendo, Ctrl+Enter guarda y Esc descarta. Anular se confirma con Ctrl+Enter.
export const DEL_DIA: Linea[] = [
  { tecla: "ArrowDown", accion: "hoy.siguiente" },
  { tecla: "ArrowUp", accion: "hoy.anterior" },
  { tecla: "/", accion: "hoy.buscar" },
  { tecla: "Ctrl+K", accion: "hoy.buscar", enCampos: true },
  { tecla: "F", accion: "hoy.otro-dia" },
  { tecla: "E", accion: "hoy.corregir" },
  { tecla: "Delete", accion: "hoy.anular" },
  { tecla: "A", accion: "hoy.anular" },
  { tecla: "Ctrl+Enter", accion: "hoy.guardar", enCampos: true, etiqueta: "Ctrl Enter" },
  { tecla: "Escape", accion: "hoy.descartar" },
  { tecla: "Ctrl+Enter", accion: "anular.confirmar", enCampos: true, etiqueta: "Ctrl Enter" },
];
