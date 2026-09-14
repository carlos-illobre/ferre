import { useEffect } from "react";

// Atajos de teclado que funcionan aunque la caja de búsqueda no tenga el foco: flechas
// para moverse por los resultados, Shift+1..5 para el margen. Se ignoran cuando el foco
// está en otro campo de texto o selector (ahí las flechas tienen su propio sentido).
export function useTeclasGlobales(manejar: (e: KeyboardEvent) => void, excepto?: HTMLElement | null) {
  useEffect(() => {
    const oyente = (e: KeyboardEvent) => {
      const objetivo = e.target as HTMLElement | null;
      const enCampo = objetivo && (objetivo.tagName === "INPUT" || objetivo.tagName === "SELECT" || objetivo.tagName === "TEXTAREA" || objetivo.isContentEditable);
      if (enCampo && objetivo !== excepto) return;
      manejar(e);
    };
    window.addEventListener("keydown", oyente);
    return () => window.removeEventListener("keydown", oyente);
  }, [manejar, excepto]);
}
