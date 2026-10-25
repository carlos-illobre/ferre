import { useSesion, type Usuario } from "../../datos/sesion";

export type UsuarioDeLaSesion = Usuario;

// Quién está usando la aplicación: «Vos» en la lista y lo que no puede hacerse a sí mismo.
export function useUsuarioActual() {
  return useSesionPropia().usuario;
}

// Quién está usando la aplicación y «Salir».
export function useSesionPropia() {
  const { sesion, salir } = useSesion();
  return { usuario: sesion.estado === "con-sesion" ? sesion.usuario : null, salir };
}
