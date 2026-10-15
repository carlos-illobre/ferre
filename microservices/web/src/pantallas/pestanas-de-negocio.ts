import type { NombreDeIcono } from "./compu/base/ui";
import type { Permiso } from "./permisos";
import { NOMBRES, TEXTOS } from "./textos";

// Más → Cómo va el negocio (decisión 89): tres secciones, cada una con su permiso de lectura,
// en este orden y en las dos interfaces. Compras se ve con cualquiera de sus dos permisos y
// muestra lo que cada uno deja. La opción de Más abre la primera sección que se ve.
export type SeccionDeNegocio = "ventas" | "compras" | "inventario";
export const SECCIONES_DE_NEGOCIO: { valor: SeccionDeNegocio; nombre: string; icono: NombreDeIcono; pide: Permiso[]; bajada: { largo: string; corto: string } }[] = [
  { valor: "ventas", nombre: NOMBRES.ventas, icono: "plata", pide: ["negocio.ventas"], bajada: TEXTOS.negocio.seccionVentas },
  { valor: "compras", nombre: NOMBRES.compras, icono: "compras", pide: ["negocio.gastos", "deposito.compras"], bajada: TEXTOS.negocio.seccionCompras },
  { valor: "inventario", nombre: NOMBRES.inventario, icono: "stock", pide: ["negocio.invertido"], bajada: TEXTOS.negocio.seccionInventario },
];
// Todos los permisos de la pantalla: con alguno, la opción está en Más.
export const PIDE_EL_NEGOCIO: Permiso[] = [...new Set(SECCIONES_DE_NEGOCIO.flatMap((s) => s.pide))];
