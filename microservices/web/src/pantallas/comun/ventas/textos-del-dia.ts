import { nombreDelDia, type ResumenDelDia } from "../../../negocio/ventas";
import { pesosCortos } from "../../../formato";
import { TEXTOS } from "../../textos";

// Los textos de «Ventas del día» que dicen lo mismo en las dos interfaces, con el largo de cada una.
type Largo = "largo" | "corto";
const t = TEXTOS.hoy;
export const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
export const signo = (n: number) => `${n > 0 ? "+" : "−"}${pesosCortos(Math.abs(n))}`;

// Un día de «Otro día»: «Hoy, …», «Ayer, …» o el nombre del día.
export function nombreParaElegir(dia: string, cual: "hoy" | "ayer" | null, largo: Largo): string {
  return cual ? `${t[cual][largo]}, ${nombreDelDia(dia)}` : mayuscula(nombreDelDia(dia));
}

// Debajo: lo vendido y cuántas ventas (hoy, hasta qué hora); sin ventas, que no hubo.
export function detalleParaElegir(resumen: ResumenDelDia | null, hoy: boolean, largo: Largo): string {
  if (!resumen) return "…";
  if (resumen.ventas === 0) return t.sinVentas[largo];
  const cuantas = `${resumen.ventas} ${resumen.ventas === 1 ? t.venta[largo] : t.ventas[largo]}`;
  return `${pesosCortos(resumen.total)} · ${cuantas}${hoy ? ` ${t.hasta[largo].toLowerCase()} ${hora(new Date().toISOString())}` : ""}`;
}

// Por qué no se ve el día: sin conexión (hoy u otro día) o el error del servidor.
export function errorDelDia(error: unknown, esHoy: boolean, sinConexion: boolean, largo: Largo): string {
  if (sinConexion) return esHoy ? t.sinConexionHoy[largo] : t.sinConexionOtroDia[largo];
  return (error as Error).message;
}
