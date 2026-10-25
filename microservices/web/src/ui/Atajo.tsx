import { useEtiqueta } from "../plataforma/comandos";

// La tecla que pide una acción («F2», «Alt+1»), si el teclado le puso una. La pieza no sabe cuál es.
export function Atajo({ accion, className = "tecla" }: { accion: string; className?: string }) {
  const etiqueta = useEtiqueta(accion);
  return etiqueta ? <span className={className} aria-hidden="true">{etiqueta}</span> : null;
}
