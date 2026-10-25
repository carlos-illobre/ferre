import { useState } from "react";

// El menú se achica a solo íconos, y recuerda cómo se dejó (decisión 122).
export function usePlegado() {
  const [plegado, setPlegado] = useState(() => { try { return localStorage.getItem("ferre.menu") === "plegado"; } catch { return false; } });
  const plegar = () => setPlegado((p) => { try { localStorage.setItem("ferre.menu", p ? "abierto" : "plegado"); } catch { /* sin almacenamiento: dura lo que la pestaña */ } return !p; });
  return { plegado, plegar };
}
