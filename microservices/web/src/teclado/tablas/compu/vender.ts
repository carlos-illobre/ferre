import type { Linea } from "../../motor/tabla";
import { enLaBusquedaYFuera } from "../ayudas";

// Vender: F5 a F8 eligen cómo paga, F2 cobra, F1 muestra el panel, F9 elige el cliente y F4 es
// «No llevó». Con la búsqueda vacía, + y − cambian la cantidad del renglón elegido y Supr lo quita
// (también con el cursor en la búsqueda). Fuera de la búsqueda, ↑ ↓ siguen eligiendo lo encontrado
// y Esc vuelve a ella.
export const DE_VENDER: Linea[] = [
  { tecla: "F5", accion: "vender.medio.efectivo", enCampos: true },
  { tecla: "F6", accion: "vender.medio.mercado_pago", enCampos: true },
  { tecla: "F7", accion: "vender.medio.tarjeta", enCampos: true },
  { tecla: "F8", accion: "vender.medio.cuenta_corriente", enCampos: true },
  { tecla: "F1", accion: "vender.panel", enCampos: true },
  { tecla: "F2", accion: "vender.cobrar", enCampos: true },
  { tecla: "F9", accion: "vender.cliente", enCampos: true },
  { tecla: "F4", accion: "vender.no-llevo", enCampos: true },
  ...enLaBusquedaYFuera("+", "vender.renglon.sumar"),
  ...enLaBusquedaYFuera("-", "vender.renglon.restar", "−"),
  ...enLaBusquedaYFuera("Delete", "vender.renglon.quitar"),
  { tecla: "ArrowDown", accion: "vender.busqueda.siguiente" },
  { tecla: "ArrowUp", accion: "vender.busqueda.anterior" },
  { tecla: "Escape", accion: "vender.busqueda.volver" },
];
