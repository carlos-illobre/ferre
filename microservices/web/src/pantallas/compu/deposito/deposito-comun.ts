import { abreviarUnidad, type Producto } from "../../../negocio/catalogo";
import { numero } from "../../../negocio/formato";

// Lo que comparten Stock, Compras y Contar: las pocas cuentas y palabras que las tres escriben
// igual.
export type { Producto };

export const detalleDe = (p: Pick<Producto, "marca" | "proveedor">) => [p.marca, p.proveedor].filter(Boolean).join(" · ");
export const nombreUnidad = abreviarUnidad;
// Diferencia con su signo; «=» cuando coincide.
export const conSigno = (n: number) => (n === 0 ? "=" : `${n > 0 ? "+" : "−"}${numero(Math.abs(n))}`);
// Un error del servidor ya viene en castellano; cualquier otro es que no hubo conexión.
export { mensajeDelServidor as mensajeDe } from "../../../negocio/deposito";
export const plural = (n: number, uno: string, varios: string) => `${numero(n)} ${n === 1 ? uno : varios}`;

export { useEnLinea } from "../../../plataforma/sin-conexion";

