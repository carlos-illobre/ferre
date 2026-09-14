import type { Producto } from "./pantallas/Productos";

// Cómo se vende (y se compra) un producto: por unidad, con cantidades enteras, o a
// granel por kilo, metro o litro, con hasta un decimal. Queda guardado en el producto.
export const UNIDADES = [
  { valor: "unidad", nombre: "un." }, { valor: "kg", nombre: "kg" }, { valor: "m", nombre: "m" }, { valor: "l", nombre: "l" },
] as const;
export type Unidad = (typeof UNIDADES)[number]["valor"];
export const unidadDe = (p: Producto | null | undefined): Unidad => (UNIDADES.some((u) => u.valor === p?.unidad) ? (p!.unidad as Unidad) : "unidad");
export const enteras = (u: Unidad) => u === "unidad";

// La cantidad tipeada, ajustada a la unidad: enteros para "un.", un decimal para el resto.
// Vacío o inválido es 0 (la caja queda vacía, sin cero a la izquierda).
export function cantidadValida(texto: string, unidad: Unidad): number {
  const n = Number(texto.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return enteras(unidad) ? Math.floor(n) : Math.round(n * 10) / 10;
}
