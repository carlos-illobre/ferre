import { useEffect, useRef } from "react";
import { ofrecer, type Acciones } from "./registro";

// Ofrece acciones mientras el componente está a la vista (y `activo`). Las funciones pueden
// cambiar en cada dibujo: se pide siempre la última.
export function useComandos(acciones: Acciones, opciones: { activo?: boolean; encima?: boolean } = {}): void {
  const { activo = true, encima = false } = opciones;
  const actuales = useRef(acciones);
  actuales.current = acciones;
  useEffect(() => (activo ? ofrecer(() => actuales.current, encima) : undefined), [activo, encima]);
}
