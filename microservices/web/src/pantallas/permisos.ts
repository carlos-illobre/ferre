import { useUsuarioActual, type UsuarioDeLaSesion as Usuario } from "../negocio/usuarios";

// La lista de permisos está en el negocio (sin dependencias, para que la usen también las pruebas).
import { PERMISOS, type Permiso } from "../negocio/permisos";
export { PERMISOS, type Permiso };

// Tiene alguno de los permisos pedidos. Sin pedir ninguno, alcanza con tener sesión.
export const puede = (usuario: Usuario | null | undefined, ...claves: Permiso[]) => Boolean(usuario) && (claves.length === 0 || claves.some((p) => usuario!.permisos?.includes(p)));

export function usePuede() {
  const usuario = useUsuarioActual();
  return (...claves: Permiso[]) => puede(usuario, ...claves);
}
