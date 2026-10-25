import type { ReactNode } from "react";
import { plano } from "../../../negocio/ventas";

// Lo buscado, resaltado dentro de un texto.
export function Resaltar({ texto, buscado }: { texto: string; buscado: string }): ReactNode {
  const b = plano(buscado);
  const i = b ? plano(texto).indexOf(b) : -1;
  if (i < 0) return texto;
  return <>{texto.slice(0, i)}<mark>{texto.slice(i, i + b.length)}</mark>{texto.slice(i + b.length)}</>;
}
