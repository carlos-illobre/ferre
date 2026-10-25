import { useEffect, useRef } from "react";

// Una ventana nativa (<dialog>) abierta como modal mientras el componente está: Escape la cierra
// con `alCerrar` y, al irse, el foco vuelve a donde estaba.
export function useDialogo(alCerrar: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const anterior = document.activeElement as HTMLElement | null;
    if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
    const alCancelar = (e: Event) => { e.preventDefault(); cerrar.current(); };
    d.addEventListener("cancel", alCancelar);
    return () => { d.removeEventListener("cancel", alCancelar); if (typeof d.close === "function" && d.open) d.close(); anterior?.focus?.(); };
  }, []);
  return ref;
}
