import { useEffect, useState } from "react";

// Devuelve el valor recién cuando dejó de cambiar durante `ms`: la búsqueda no se recalcula
// en cada tecla mientras se escribe rápido.
export function useDebounce<T>(valor: T, ms = 150): T {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return retrasado;
}
