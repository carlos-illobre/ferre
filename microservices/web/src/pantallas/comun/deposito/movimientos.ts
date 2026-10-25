import { nombreDeMovimiento, type Movimiento } from "../../../negocio/deposito";
import { pesos } from "../../../negocio/formato";
import type { NombreDeIcono } from "../../../ui/iconos";

// Cómo se ve cada movimiento de stock, igual en el celular y la computadora: su nombre, su ícono y
// su color (las compras y los ajustes tienen el suyo).
const ICONOS: Record<string, { icono: NombreDeIcono; clase: string }> = {
  Venta: { icono: "shopping-cart", clase: "" }, Compra: { icono: "truck", clase: "compra" }, Ajuste: { icono: "square-pen", clase: "ajuste" }, Conteo: { icono: "clipboard-list", clase: "ajuste" },
};
export function comoSeVe(m: Movimiento) {
  const nombre = nombreDeMovimiento(m);
  return { nombre, ...(ICONOS[nombre] ?? ICONOS.Ajuste!) };
}

// El dinero invertido, en pesos enteros.
export const pesosEnteros = (n: number) => pesos(Math.round(n)).replace(/,00$/, "");
