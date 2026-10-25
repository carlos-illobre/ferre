import type { ReactNode } from "react";
import { Icono, type NombreDeIcono } from "./iconos";

// Un número grande con su rótulo, su ícono y, si hay, un detalle debajo.
export function Indicador({ rotulo, valor, detalle, icono, color, testId }: { rotulo: string; valor: ReactNode; detalle?: ReactNode; icono: NombreDeIcono; color?: "ambar" | "verde" | "rojo"; testId?: string }) {
  return (
    <div className={`indicador ${color ?? ""}`} data-testid={testId}>
      <span className="rotulo">{rotulo}</span>
      <span className="icono"><Icono nombre={icono} /></span>
      <span className="importe">{valor}</span>
      {detalle && <span className="detalle">{detalle}</span>}
    </div>
  );
}
