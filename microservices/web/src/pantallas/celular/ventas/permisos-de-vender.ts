import type { Permiso } from "../../permisos";

// Qué permiso pide cada pestaña de Vender en el celular: armar la venta y las ventas del día.
export const PIDE = { vender: ["ventas.registrar"], hoy: ["ventas.ver", "ventas.anular", "ventas.anular_cualquiera"] } satisfies Record<string, Permiso[]>;
