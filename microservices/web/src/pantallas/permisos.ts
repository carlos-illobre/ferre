import { useSesion, type Usuario } from "../datos/sesion";

// La lista de permisos está en el negocio (sin dependencias, para que la usen también las pruebas).
import { PERMISOS, type Permiso } from "../negocio/permisos";
export { PERMISOS, type Permiso };

// Tiene alguno de los permisos pedidos. Sin pedir ninguno, alcanza con tener sesión.
export const puede = (usuario: Usuario | null | undefined, ...claves: Permiso[]) => Boolean(usuario) && (claves.length === 0 || claves.some((p) => usuario!.permisos?.includes(p)));

export function usePuede() {
  const { sesion } = useSesion();
  const usuario = sesion.estado === "con-sesion" ? sesion.usuario : null;
  return (...claves: Permiso[]) => puede(usuario, ...claves);
}
