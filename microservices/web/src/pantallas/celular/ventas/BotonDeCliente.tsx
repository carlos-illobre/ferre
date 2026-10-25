import type { ReactNode } from "react";
import css from "./BotonDeCliente.module.css";

// El cliente de la venta: la persona, o sus iniciales si se eligió; en ámbar si falta (cuenta
// corriente sin cliente). `redondo`: en Vender, al final de la fila de los medios (decisión 142).
type Props = { elegido: boolean; falta: boolean; alTocar: () => void; etiqueta: string; titulo?: string; testId: string; redondo?: boolean; children: ReactNode };

export function BotonDeCliente({ elegido, falta, alTocar, etiqueta, titulo, testId, redondo, children }: Props) {
  return (
    <button type="button" className={`${css.cliente} ${redondo ? css.redondo : ""} ${elegido ? css.elegido : falta ? css.falta : ""}`} onClick={alTocar} aria-label={etiqueta} title={titulo} data-testid={testId}>
      {children}
    </button>
  );
}
