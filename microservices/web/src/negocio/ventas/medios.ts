import type { MedioDePago } from "@servidor/ventas";

// Los medios de pago y sus nombres.
export type Medio = MedioDePago;
export const NOMBRE_DE_MEDIO: Record<Medio, string> = { efectivo: "Efectivo", mercado_pago: "Mercado Pago", tarjeta: "Tarjeta", cuenta_corriente: "Cuenta corriente" };
export const MEDIOS = Object.keys(NOMBRE_DE_MEDIO) as Medio[];
// Para un medio que llega como texto suelto (el registro de acciones): su nombre, o el texto tal cual.
export const nombreDeMedio = (medio: string): string => (NOMBRE_DE_MEDIO as Record<string, string>)[medio] ?? medio;
