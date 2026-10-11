import { useSesion, type Usuario } from "../sesion";

// Qué puede hacer quien está usando la aplicación (RF-72, ADR-017). Los permisos son los del
// servidor, que es quien decide de verdad: acá sirven para mostrar solo lo que se puede usar.
// Es el mismo criterio en el celular y en la computadora (decisión 47).
export const PERMISOS = {
  "ventas.registrar": "Vender",
  "ventas.ver": "Ver las ventas del día",
  "ventas.anular": "Anular ventas",
  "catalogo.margenes": "Fijar márgenes",
  "catalogo.listas": "Cargar listas de precios",
  "catalogo.duplicados": "Unir duplicados",
  "deposito.ingresos": "Registrar ingresos",
  "deposito.compras": "Ver las compras",
  "deposito.stock": "Contar y corregir stock",
  "negocio.numeros": "Ver los números del negocio",
  "negocio.anomalias": "Ver las anomalías",
  "negocio.actividad": "Ver quién hizo qué",
  "admin.usuarios": "Administrar usuarios",
  "admin.roles": "Administrar roles",
  "admin.sesiones": "Administrar sesiones",
} as const;
export type Permiso = keyof typeof PERMISOS;

// Tiene alguno de los permisos pedidos. Sin pedir ninguno, alcanza con tener sesión.
export const puede = (usuario: Usuario | null | undefined, ...claves: Permiso[]) => Boolean(usuario) && (claves.length === 0 || claves.some((p) => usuario!.permisos?.includes(p)));

export function usePuede() {
  const { sesion } = useSesion();
  const usuario = sesion.estado === "con-sesion" ? sesion.usuario : null;
  return (...claves: Permiso[]) => puede(usuario, ...claves);
}
