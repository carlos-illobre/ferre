import { useCallback, useEffect, useRef } from "react";
import { useTeclasGlobales } from "../../../plataforma/teclado";
import type { DuplicadosDeLaCompu } from "./useDuplicadosDeLaCompu";

// E es el mismo, D son distintos, J y K pasan a la siguiente y a la anterior, ← → eligen cuál se
// conserva, Alt B busca en todo el catálogo, Alt U une a mano y Alt S abre los unidos. Las teclas
// usan siempre lo último (qué se conserva, cuál está elegida).
type Accion = (x: DuplicadosDeLaCompu) => void;
const CON_ALT: Record<string, Accion> = {
  KeyB: (x) => { if (!x.quieto) void x.buscar(); },
  KeyU: (x) => x.setPanel("unir"),
  KeyS: (x) => x.setPanel("unidos"),
};
const SOLAS: Record<string, Accion> = {
  KeyE: (x) => { if (!x.quieto) void x.resolver(x.elegida.actual!, "unir"); },
  KeyD: (x) => { if (!x.quieto) void x.resolver(x.elegida.actual!, "rechazar"); },
  KeyJ: (x) => x.elegida.mover(1),
  KeyK: (x) => x.elegida.mover(-1),
  ArrowLeft: (x) => x.elegida.elegirLado(x.elegida.actual!, "a"),
  ArrowRight: (x) => x.elegida.elegirLado(x.elegida.actual!, "b"),
};

function accionDe(e: globalThis.KeyboardEvent, hayActual: boolean): Accion | undefined {
  if (e.altKey) return CON_ALT[e.code];
  if (!hayActual) return undefined;
  return SOLAS[e.key.startsWith("Arrow") ? e.key : e.code];
}

export function useTeclasDeDuplicados(x: DuplicadosDeLaCompu) {
  const actual = useRef(x);
  useEffect(() => { actual.current = x; });
  useTeclasGlobales(useCallback((e: globalThis.KeyboardEvent) => {
    if (document.querySelector("dialog[open]") || e.ctrlKey || e.metaKey) return;
    const accion = accionDe(e, actual.current.elegida.actual !== null);
    if (!accion) return;
    e.preventDefault();
    accion(actual.current);
  }, []));
}
