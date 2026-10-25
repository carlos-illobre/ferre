import type { Permiso } from "./lista";
// Quién ve cada parte de Vender, igual en las dos interfaces: vender, con «Registrar ventas»; las
// ventas del día, con verlas o con poder anularlas.
export const PIDE_VENDER = ["ventas.registrar"] as const satisfies readonly Permiso[];
export const PIDE_VENTAS_DEL_DIA = ["ventas.ver", "ventas.anular", "ventas.anular_cualquiera"] as const satisfies readonly Permiso[];
