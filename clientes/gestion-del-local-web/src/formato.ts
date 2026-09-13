// Números como los lee el empleado: $1.649,14 y 12,5 %. El formato de pesos es el de la
// librería compartida, así se ve igual en la explicación y en la pantalla.
import { pesos as pesosLib } from "@ferre/calculo-de-precios";

export function pesos(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return pesosLib(Number(valor));
}

export function porcentaje(valor: number): string {
  return `${valor > 0 ? "+" : ""}${valor.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`;
}

export function fecha(valor: string | null | undefined): string {
  if (!valor) return "—";
  const d = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
