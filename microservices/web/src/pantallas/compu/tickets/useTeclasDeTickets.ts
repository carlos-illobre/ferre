import { useCallback, useRef, type RefObject } from "react";
import { useTeclasGlobales } from "../../../plataforma/teclado";

// Ctrl Enter envía y Alt F elige archivos, salvo con un ticket abierto o pidiéndole la foto al celular.
export function useTeclasDeTickets(caja: RefObject<HTMLTextAreaElement>, ocupado: boolean, enviar: () => void, elegirArchivos: () => void) {
  const acciones = useRef({ enviar, elegirArchivos });
  acciones.current = { enviar, elegirArchivos };
  const teclas = useCallback((e: KeyboardEvent) => {
    if (ocupado) return;
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); acciones.current.enviar(); }
    else if (e.altKey && !e.ctrlKey && e.key.toLowerCase() === "f") { e.preventDefault(); acciones.current.elegirArchivos(); }
  }, [ocupado]);
  useTeclasGlobales(teclas, caja.current);
}
