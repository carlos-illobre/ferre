import { useRef } from "react";
import { useAccionesDelLugar, useComandos } from "../../../plataforma/comandos";
import { hayUnaVentanaAbierta } from "../base/ui";
import { irA } from "../base/rutas";
import type { UsuariosDeLaCompu } from "./useUsuariosDeLaCompu";

// Lo que ofrece Usuarios: ir a Roles y permisos, autorizar a alguien, ir al buscador y cambiar los
// roles de la elegida. En la lista, elegir la de al lado (la ficha la sigue). Devuelve dónde están
// el buscador y la lista.
export function useAccionesDeUsuarios(x: UsuariosDeLaCompu, enLinea: boolean, puedeRoles: boolean) {
  const buscador = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  useComandos({
    "usuarios.roles": puedeRoles ? () => irA("roles") : null,
    "usuarios.autorizar": enLinea ? () => x.setAlta(true) : null,
    "usuarios.buscar": () => buscador.current?.focus(),
    "usuarios.cambiar-roles": () => (x.elegida && !hayUnaVentanaAbierta() ? x.pedirCambioDeRoles() : false),
  });
  useAccionesDelLugar(buscador, x.filtro.enLaCaja);
  const elegirOtra = (paso: 1 | -1) => () => {
    const i = x.visibles.findIndex((u) => u.id === x.elegida?.id);
    const otra = x.visibles[Math.min(x.visibles.length - 1, Math.max(0, i + paso))];
    if (!otra) return false;
    x.elegir(otra.id);
    lista.current?.querySelector<HTMLButtonElement>(`[data-id="${otra.id}"]`)?.focus();
  };
  useAccionesDelLugar(lista, { "lista.siguiente": elegirOtra(1), "lista.anterior": elegirOtra(-1) });
  return { buscador, lista };
}
