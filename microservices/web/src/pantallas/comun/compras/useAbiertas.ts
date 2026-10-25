import { useState } from "react";

// Qué compras están abiertas (mostrando sus renglones): tocar una la abre o la pliega.
export function useAbiertas() {
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const alternar = (id: string) => setAbiertas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return { abiertas, alternar };
}
