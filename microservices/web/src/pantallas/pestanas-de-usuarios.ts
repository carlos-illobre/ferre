import type { NombreDeIcono } from "./compu/base/ui";
import type { Permiso } from "./permisos";
import { NOMBRES } from "./textos";

// Más → Usuarios (decisión 88): una sola opción con cuatro pestañas, igual en el celular y en la
// computadora. Cada pestaña dice qué permiso pide (RF-72); Sesiones no pide ninguno porque ahí
// está la huella de cada uno, así que la opción está siempre en Más. `corto` es el nombre en el
// celular, donde «Quién hizo qué» no entra.
export type PestanaDeUsuarios = "usuarios" | "sesiones" | "roles" | "actividad";
export const PESTANAS_DE_USUARIOS: { valor: PestanaDeUsuarios; nombre: string; corto: string; icono: NombreDeIcono; pide?: Permiso[] }[] = [
  { valor: "usuarios", nombre: NOMBRES.usuarios, corto: NOMBRES.usuarios, icono: "usuarios", pide: ["admin.usuarios"] },
  { valor: "sesiones", nombre: NOMBRES.sesiones, corto: NOMBRES.sesiones, icono: "sesiones" },
  { valor: "roles", nombre: NOMBRES.roles, corto: NOMBRES.roles, icono: "roles", pide: ["admin.roles"] },
  { valor: "actividad", nombre: NOMBRES.quienHizoQue, corto: NOMBRES.actividad, icono: "actividad", pide: ["negocio.actividad"] },
];
