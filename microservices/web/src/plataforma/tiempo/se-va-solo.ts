import { useEffect } from "react";

// Un aviso que se va solo: mientras `valor` tenga algo, a los `ms` se llama a `limpiar`.
export function useSeVaSolo(valor: unknown, limpiar: () => void, ms: number): void {
  useEffect(() => {
    if (!valor) return;
    const t = setTimeout(limpiar, ms);
    return () => clearTimeout(t);
    // Solo cuando cambia el aviso: `limpiar` suele ser una función nueva en cada dibujo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, ms]);
}
