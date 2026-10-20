import type { Producto } from "./producto";

// Cómo se vende (y se compra) un producto: por unidad, con cantidades enteras, o a
// granel por kilo, metro o litro, con hasta un decimal. Queda guardado en el producto.
export const UNIDADES = [
  { valor: "unidad", nombre: "un." }, { valor: "kg", nombre: "kg" }, { valor: "m", nombre: "m" }, { valor: "l", nombre: "L" },
] as const;
export type Unidad = (typeof UNIDADES)[number]["valor"];
// Cómo se escribe una unidad en pantalla: el litro siempre va con mayúscula (L).
export const escribirUnidad = (u: string): string => (u === "l" ? "L" : u);
// La unidad abreviada al lado de una cantidad («12 un.», «3,5 kg»): la misma en toda la
// aplicación (decisión 106).
export const abreviarUnidad = (u: string): string => (u === "unidad" ? "un." : escribirUnidad(u));
export const unidadDe = (p: Producto | null | undefined): Unidad => (UNIDADES.some((u) => u.valor === p?.unidad) ? (p!.unidad as Unidad) : "unidad");
export const enteras = (u: Unidad) => u === "unidad";

// La cantidad tipeada, ajustada a la unidad: enteros para "un.", un decimal para el resto.
// Vacío o inválido es 0 (la caja queda vacía, sin cero a la izquierda).
export function cantidadValida(texto: string, unidad: Unidad): number {
  const n = Number(texto.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return enteras(unidad) ? Math.floor(n) : Math.round(n * 10) / 10;
}

// Una cantidad con su unidad («3 un.», «1,5 kg»): siempre que se muestra una cantidad, va con su
// unidad, en el celular y en la computadora (decisión 144). Sin unidad conocida, «un.».
export const conUnidad = (n: number | string, u?: string | null): string =>
  `${Number(n).toLocaleString("es-AR", { maximumFractionDigits: 3 })} ${abreviarUnidad(u || "unidad")}`;
