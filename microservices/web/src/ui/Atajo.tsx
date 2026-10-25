import { useEtiqueta } from "../plataforma/comandos";

// La tecla que pide una acción («F2», «Alt+1»), si el teclado le puso una. La pieza no sabe cuál es.
// `kbd`: como una tecla de las ayudas («Enter agrega»), no como la marca de un botón.
export function Atajo({ accion, className = "tecla", kbd }: { accion: string; className?: string; kbd?: boolean }) {
  const etiqueta = useEtiqueta(accion);
  if (!etiqueta) return null;
  return kbd ? <kbd className={className}>{etiqueta}</kbd> : <span className={className} aria-hidden="true">{etiqueta}</span>;
}
