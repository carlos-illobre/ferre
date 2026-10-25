import type { NombreDeIcono } from "./compu/base/ui";
import type { Permiso } from "../negocio/permisos";
import { NOMBRES } from "./textos";

// Más → Usuarios (decisiones 88 y 100): una sola opción con tres pestañas, igual en el celular y en
// la computadora. Cada pestaña dice qué permiso pide (RF-72), y quien no ve ninguna no tiene la
// opción en Más. Las sesiones y los celulares de cada persona van en su tarjeta, y los propios en
// Configuración. `corto` es el nombre en el celular, donde «Quién hizo qué» no entra.
export type PestanaDeUsuarios = "usuarios" | "roles" | "actividad";
export const PESTANAS_DE_USUARIOS: { valor: PestanaDeUsuarios; nombre: string; corto: string; icono: NombreDeIcono; pide?: Permiso[] }[] = [
  { valor: "usuarios", nombre: NOMBRES.usuarios, corto: NOMBRES.usuarios, icono: "usuarios", pide: ["admin.usuarios"] },
  { valor: "roles", nombre: NOMBRES.roles, corto: NOMBRES.roles, icono: "roles", pide: ["admin.roles"] },
  { valor: "actividad", nombre: NOMBRES.quienHizoQue, corto: NOMBRES.actividad, icono: "actividad", pide: ["negocio.actividad"] },
];
// Lo que pide la opción «Usuarios» de Más: cualquiera de los permisos de sus pestañas.
export const PIDE_USUARIOS: Permiso[] = PESTANAS_DE_USUARIOS.flatMap((p) => p.pide ?? []);
