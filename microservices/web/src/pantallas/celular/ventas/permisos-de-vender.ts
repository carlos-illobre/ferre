import { PIDE_VENDER, PIDE_VENTAS_DEL_DIA, type Permiso } from "../../../negocio/permisos";

// Qué permiso pide cada pestaña de Vender en el celular: armar la venta y las ventas del día.
export const PIDE = { vender: [...PIDE_VENDER], hoy: [...PIDE_VENTAS_DEL_DIA] } satisfies Record<string, Permiso[]>;
