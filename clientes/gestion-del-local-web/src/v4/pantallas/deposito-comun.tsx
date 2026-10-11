import { ErrorApi } from "../../api";
import type { Producto } from "../../pantallas/Productos";
import { dia, hora, numero } from "../formato";

// Lo que comparten Recibir, Stock, Contar y Duplicados: las pocas palabras y cuentas que las
// cuatro escriben igual.
export type { Producto };

/** Un error del servidor ya viene en castellano; cualquier otro es que no hubo conexión. */
export const mensajeDe = (e: unknown, sinConexion: string) => (e instanceof ErrorApi ? e.message : sinConexion);

/** `plural(2, "producto", "productos")` → "2 productos". */
export const plural = (n: number, uno: string, varios: string) => `${numero(n)} ${n === 1 ? uno : varios}`;

/** Un lector de códigos «escribe» los números y aprieta Enter. */
export const esCodigo = (texto: string) => /^\d{8,14}$/.test(texto.trim());

export function productoPorCodigo(catalogo: Producto[] | null, codigo: string): Producto | undefined {
  const c = codigo.trim();
  return (catalogo ?? []).find((p) => p.codigo_barras === c || p.codigo_proveedor === c);
}

const soloDia = (m: Date) => new Date(m.getFullYear(), m.getMonth(), m.getDate()).getTime();

/** El día, como se dice en el mostrador: "Hoy", "Ayer", "Hace 3 días" o "9 de octubre". Acepta "2026-10-09" o un momento de la API. */
export function queDia(m: string): string {
  const momento = new Date(m.length === 10 ? `${m}T00:00:00` : m);
  const dias = Math.round((soloDia(new Date()) - soloDia(momento)) / 86400000);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias > 1 && dias < 7) return `Hace ${dias} días`;
  return dia(momento);
}

/** Día y hora de un momento de la API: "Hoy, 10:32". */
export const cuando = (m: string) => `${queDia(m)}, ${hora(m)}`;

/** "1.722,00" → 1722; "5200" → 5200; vacío o cero → `null`. */
export function leerCosto(texto: string): number | null {
  let limpio = texto.replace(/[^\d.,]/g, "");
  if (limpio.includes(",")) limpio = limpio.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(limpio)) limpio = limpio.replace(/\./g, "");
  const valor = Number(limpio);
  return limpio !== "" && Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : null;
}
