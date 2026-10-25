import { useEffect, useRef, type KeyboardEvent as TeclaDeReact, type RefObject } from "react";
import { irA } from "../base/rutas";
import type { UsuariosDeLaCompu } from "./useUsuariosDeLaCompu";

const sinModificador = (e: KeyboardEvent) => !e.altKey && !e.ctrlKey && !e.metaKey;
const escribiendo = (e: KeyboardEvent) => e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable='true']") !== null;
const es = (e: KeyboardEvent, letra: string) => e.key.toLowerCase() === letra;

// Alt R: Roles y permisos; Alt N: autorizar a alguien; /: buscar; R: cambiar los roles de la elegida.
function conAlt(e: KeyboardEvent, x: UsuariosDeLaCompu, enLinea: boolean, puedeRoles: boolean): (() => void) | null {
  if (!e.altKey || e.ctrlKey) return null;
  if (es(e, "r") && puedeRoles) return () => irA("roles");
  return es(e, "n") && enLinea ? () => x.setAlta(true) : null;
}
function queHace(e: KeyboardEvent, x: UsuariosDeLaCompu, enLinea: boolean, puedeRoles: boolean, buscador: RefObject<HTMLInputElement>): (() => void) | null {
  const conLaAlt = conAlt(e, x, enLinea, puedeRoles);
  if (conLaAlt || escribiendo(e) || !sinModificador(e)) return conLaAlt;
  if (e.key === "/") return () => buscador.current?.focus();
  if (es(e, "r") && x.elegida && !document.querySelector("dialog[open]")) return x.pedirCambioDeRoles;
  return null;
}

export function useTeclasDeUsuarios(x: UsuariosDeLaCompu, enLinea: boolean, puedeRoles: boolean) {
  const buscador = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const teclas = useRef<(e: KeyboardEvent) => void>(() => undefined);
  teclas.current = (e: KeyboardEvent) => {
    const accion = queHace(e, x, enLinea, puedeRoles, buscador);
    if (accion) { e.preventDefault(); accion(); }
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => teclas.current(e);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  // ↑ ↓ recorren la lista y la ficha sigue a la elegida.
  function moverse(e: TeclaDeReact) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const i = x.visibles.findIndex((u) => u.id === x.elegida?.id);
    const otra = x.visibles[Math.min(x.visibles.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (!otra) return;
    e.preventDefault();
    x.elegir(otra.id);
    lista.current?.querySelector<HTMLButtonElement>(`[data-id="${otra.id}"]`)?.focus();
  }
  return { buscador, lista, moverse };
}
