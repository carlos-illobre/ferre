import type { ReactNode } from "react";
import { Icono, type NombreDeIcono } from "./iconos";

// Lo que se ve cuando una lista no tiene nada: un ícono, qué pasa y, si hay, qué hacer.
export function Vacio({ icono, titulo, children, accion }: { icono: NombreDeIcono; titulo: string; children?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="vacio">
      <div className="icono"><Icono nombre={icono} tam={30} grosor={1.8} /></div>
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
      {accion}
    </div>
  );
}
