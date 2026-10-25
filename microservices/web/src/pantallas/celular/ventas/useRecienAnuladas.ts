import { useEffect, useRef, useState } from "react";
import type { VentaDelDia } from "../../../negocio/ventas";
import { conMovimiento } from "../../../plataforma/animacion";

// Las ventas que se acaban de anular, un momento, para que se tachen con una raya que se dibuja.
export function useRecienAnuladas(ventas: VentaDelDia[]): Set<string> {
  const antes = useRef(new Map(ventas.map((v) => [v.id, v.estado])));
  const [recien, setRecien] = useState<Set<string>>(new Set());
  useEffect(() => {
    const nuevas = ventas.filter((v) => v.estado === "anulada" && antes.current.get(v.id) === "confirmada").map((v) => v.id);
    antes.current = new Map(ventas.map((v) => [v.id, v.estado]));
    if (!nuevas.length || !conMovimiento()) return;
    setRecien(new Set(nuevas));
    const t = setTimeout(() => setRecien(new Set()), 900);
    return () => clearTimeout(t);
  }, [ventas]);
  return recien;
}
