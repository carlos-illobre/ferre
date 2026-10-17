import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// La acción de una pantalla («Sector nuevo», «Pedido nuevo», el día de Anular) va, en la
// computadora, a la derecha de las pestañas, en la misma fila: nunca hay más de cuatro, así que
// ese lugar está libre (pedido de Carlos del 2026-10-15). La computadora deja ese lugar con
// `LUGAR_AL_LADO_DE_LAS_PESTANAS`; donde no lo hay (el celular, o una pantalla sin pestañas),
// la acción queda donde está.
export const LUGAR_AL_LADO_DE_LAS_PESTANAS = "al-lado-de-las-pestanas";

export function AlLadoDeLasPestanas({ children }: { children: ReactNode }) {
  const [lugar, setLugar] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setLugar(document.getElementById(LUGAR_AL_LADO_DE_LAS_PESTANAS)); }, []);
  return lugar ? createPortal(children, lugar) : <>{children}</>;
}
