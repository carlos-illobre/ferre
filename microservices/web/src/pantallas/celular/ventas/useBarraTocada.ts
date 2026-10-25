import { useEffect, useRef, useState } from "react";
import { conMovimiento } from "../../../plataforma/animacion";

// La barra que se toca: apoyar el dedo (o arrastrarlo) la elige y, al pasar de una hora a otra,
// vibra apenas; al soltar, el globo se va solo.
export function useBarraTocada() {
  const [elegida, setElegida] = useState<number | null>(null);
  const tocando = useRef(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (espera.current) clearTimeout(espera.current); }, []);
  const senalar = (x: number, y: number) => {
    const hora = Number((document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-hora]")?.dataset.hora);
    if (!Number.isFinite(hora)) return;
    setElegida((antes) => { if (antes !== hora && conMovimiento()) navigator.vibrate?.(10); return hora; });
  };
  const soltar = () => { tocando.current = false; if (espera.current) clearTimeout(espera.current); espera.current = setTimeout(() => setElegida(null), 1500); };
  return {
    elegida, setElegida,
    alTocar: {
      onPointerDown: (e: React.PointerEvent) => { tocando.current = true; if (espera.current) clearTimeout(espera.current); senalar(e.clientX, e.clientY); },
      onPointerMove: (e: React.PointerEvent) => { if (tocando.current) senalar(e.clientX, e.clientY); },
      onPointerUp: soltar, onPointerCancel: soltar,
    },
  };
}
