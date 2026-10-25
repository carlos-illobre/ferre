import type { Permiso } from "../permisos";
import { useUsuarioActual, type UsuarioDeLaSesion as Usuario } from "./sesion-propia";

// Tiene alguno de los permisos pedidos. Sin pedir ninguno, alcanza con tener sesión. El servidor
// controla cada pedido igual: esto decide qué se muestra.
export const puede = (usuario: Usuario | null | undefined, ...claves: Permiso[]) => Boolean(usuario) && (claves.length === 0 || claves.some((p) => usuario!.permisos?.includes(p)));

export function usePuede() {
  const usuario = useUsuarioActual();
  return (...claves: Permiso[]) => puede(usuario, ...claves);
}

// Quién anula (y corrige) una venta (decisión 135): las de hoy, con «Anular ventas del día» o «de
// cualquier día»; las de otro día, solo con «de cualquier día».
export function usePuedeAnular() {
  const tiene = usePuede();
  const hoy = tiene("ventas.anular", "ventas.anular_cualquiera");
  const cualquierDia = tiene("ventas.anular_cualquiera");
  return { hoy, cualquierDia, delDia: (esHoy: boolean) => (esHoy ? hoy : cualquierDia) };
}

