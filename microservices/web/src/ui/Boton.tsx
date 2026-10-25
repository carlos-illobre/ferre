import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icono, type NombreDeIcono } from "./iconos";

// El botón de «Mostrador»: con su variante (principal, marino, peligro, sobre el marino), su
// tamaño, un ícono y, en la computadora, la tecla que lo aprieta.
type VarianteBoton = "principal" | "marino" | "peligro" | "sobre-marino";
export function Boton({ children, variante, tam, icono, ancho, tecla, className, ...resto }: {
  children?: ReactNode; variante?: VarianteBoton; tam?: "chico" | "grande"; icono?: NombreDeIcono; ancho?: boolean; tecla?: string; className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const soloIcono = icono && (children === undefined || children === null);
  const clases = ["boton", variante, tam, ancho && "ancho", soloIcono && "solo-icono", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={clases} aria-keyshortcuts={tecla} {...resto}>
      {icono && <Icono nombre={icono} tam={tam === "chico" ? 16 : 20} />}
      {children}
      {tecla && <span className="tecla solo-compu" aria-hidden="true">{tecla}</span>}
    </button>
  );
}
