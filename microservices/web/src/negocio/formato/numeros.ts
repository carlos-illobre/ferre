// Números como los lee el empleado: $1.649,14 y 12,5 %. El formato de pesos es el de la
// librería compartida, así se ve igual en la explicación y en la pantalla.
import { pesos as pesosLib } from "../precios";

export function pesos(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return pesosLib(Number(valor));
}

export function porcentaje(valor: number): string {
  return `${valor > 0 ? "+" : ""}${valor.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`;
}

// Un importe sin centavos, con el punto de los miles: $12.000. Es como se dice en el mostrador.
// Los importes de pantalla van así; con centavos, solo en explicaciones y costos.
export function pesosCortos(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return "$" + Math.round(Number(valor)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Una cantidad con hasta un decimal: 12,5.
export const numero = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
