// Quién está usando la app, para el menú del usuario y el avatar del encabezado. Lo pone
// `App` a partir de la sesión; una pantalla dibujada sola (en una prueba) no lo tiene y el
// encabezado sale sin avatar.
import { createContext, useContext } from "react";

export type UsuarioEnPantalla = {
  nombre: string;
  correo: string;
  /** En esta versión todos son «Administrador», venga lo que venga de la API. */
  rol: "Administrador";
  salir: () => void;
};

export const ContextoDeUsuario = createContext<UsuarioEnPantalla | null>(null);

export function useUsuario(): UsuarioEnPantalla | null {
  return useContext(ContextoDeUsuario);
}
