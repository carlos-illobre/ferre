import { useEffect, useState } from "react";

// El menú se achica a solo íconos con su botón o Ctrl+B, y recuerda cómo se dejó (decisión 122).
export function usePlegado(conSesion: boolean) {
  const [plegado, setPlegado] = useState(() => { try { return localStorage.getItem("ferre.menu") === "plegado"; } catch { return false; } });
  const plegar = () => setPlegado((p) => { try { localStorage.setItem("ferre.menu", p ? "abierto" : "plegado"); } catch { /* sin almacenamiento: dura lo que la pestaña */ } return !p; });
  useEffect(() => {
    if (!conSesion) return;
    const tecla = (e: KeyboardEvent) => { if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "b" || e.key === "B")) { e.preventDefault(); plegar(); } };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [conSesion]);
  return { plegado, plegar };
}
