// Cómo se escriben los números, las unidades y los momentos en la v4. Los pesos con centavos
// y los márgenes son los de siempre (`../formato`, `@ferre/calculo-de-precios`): así la cuenta
// explicada y la pantalla dicen lo mismo.
import { MARGENES } from "@ferre/calculo-de-precios";
import { pesos as pesosExactos } from "../formato";
import { enteras, UNIDADES, type Unidad } from "../unidades";

export { MARGENES };
export { fecha, porcentaje } from "../formato";
export type { Unidad };

const SIN_CENTAVOS = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const UN_DECIMAL = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

type Importe = number | string | null | undefined;
const falta = (valor: Importe): valor is null | undefined | "" => valor === null || valor === undefined || valor === "";

/** Importe sin centavos: `pesos(4000)` → "$4.000". Para precios de venta y totales. Sin valor, «—». */
export function pesos(valor: Importe): string {
  if (falta(valor)) return "—";
  const n = Math.round(Number(valor));
  return `${n < 0 ? "−" : ""}$${SIN_CENTAVOS.format(Math.abs(n))}`;
}

/** Importe con centavos: `pesosConCentavos(1649.14)` → "$1.649,14". Para costos. Sin valor, «—». */
export function pesosConCentavos(valor: Importe): string {
  return pesosExactos(valor).replace("-", "−");
}

/** Número con coma y a lo sumo un decimal: `numero(2.5)` → "2,5". */
export function numero(valor: number | string): string {
  return UN_DECIMAL.format(Number(valor)).replace("-", "−");
}

// La API guarda la unidad como "unidad", "kg", "m" o "l" (`../unidades`).
const NOMBRES_DE_UNIDAD: Record<Unidad, [uno: string, varios: string]> = {
  unidad: ["unidad", "unidades"],
  kg: ["kilo", "kilos"],
  m: ["metro", "metros"],
  l: ["litro", "litros"],
};

/** La unidad de la API, o "unidad" si viene otra cosa. */
export function unidadValida(unidad: string | null | undefined): Unidad {
  return UNIDADES.some((u) => u.valor === unidad) ? (unidad as Unidad) : "unidad";
}

/** El nombre de la unidad: `nombreDeUnidad("kg")` → "kilo"; `nombreDeUnidad("kg", 2.5)` → "kilos". */
export function nombreDeUnidad(unidad: string | null | undefined, valor = 1): string {
  const [uno, varios] = NOMBRES_DE_UNIDAD[unidadValida(unidad)];
  return valor === 1 ? uno : varios;
}

/** Cantidad con su unidad: `cantidad(2.5, "kg")` → "2,5 kilos"; `cantidad(1)` → "1 unidad". */
export function cantidad(valor: number | string, unidad?: string | null): string {
  return `${numero(valor)} ${nombreDeUnidad(unidad, Number(valor))}`;
}

/** Cómo se dice el precio de una unidad: "c/u", "el kilo", "el metro", "el litro". */
export function porUnidad(unidad: string | null | undefined): string {
  const u = unidadValida(unidad);
  return u === "unidad" ? "c/u" : `el ${NOMBRES_DE_UNIDAD[u][0]}`;
}

/** `true` si se vende fraccionado (kilo, metro o litro) y la cantidad lleva un decimal. */
export function vaConDecimal(unidad: string | null | undefined): boolean {
  return !enteras(unidadValida(unidad));
}

const momento = (m: Date | string) => (typeof m === "string" ? new Date(m.length === 10 ? `${m}T00:00:00` : m) : m);

/** Hora de un momento (fecha o texto de la API): "10:32". */
export function hora(m: Date | string): string {
  return momento(m).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Día en palabras: "9 de octubre". */
export function dia(m: Date | string): string {
  return momento(m).toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

/** Hace cuánto pasó algo: "recién", "hace 5 min", "hace 3 h", "hace 2 días". */
export function haceCuanto(m: Date | string): string {
  const min = Math.floor((Date.now() - momento(m).getTime()) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} días`;
}

/** Las dos primeras letras en mayúscula, para los círculos de iniciales: "Carlos" → "CA". */
export function iniciales(nombre: string): string {
  return nombre.trim().slice(0, 2).toUpperCase();
}

/** Los medios de pago, con la clave de la API. */
export type MedioDePago = "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente";

export const MEDIOS_DE_PAGO: { clave: MedioDePago; nombre: string; frase: string }[] = [
  { clave: "efectivo", nombre: "Efectivo", frase: "Pagó en efectivo" },
  { clave: "mercado_pago", nombre: "Mercado Pago", frase: "Pagó con Mercado Pago" },
  { clave: "tarjeta", nombre: "Tarjeta", frase: "Pagó con tarjeta" },
  { clave: "cuenta_corriente", nombre: "Cuenta corriente", frase: "Va a la cuenta corriente" },
];

export function nombreDelMedio(medio: string): string {
  return MEDIOS_DE_PAGO.find((m) => m.clave === medio)?.nombre ?? medio;
}
